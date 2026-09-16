import { DAYS, EMPTY_PROFILE, getSessionType, newSession } from './constants.js'

export const PLANNING_SCHEMA = 4
export const PLANNING_STORAGE_KEY = 'tpc-hybrid-stress-map-v4'
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `map-${Date.now()}-${Math.random().toString(36).slice(2)}`
export const EFFORTS = [
  ['easy', 'Easy'],
  ['easy-moderate', 'Easy to Moderate'],
  ['moderate', 'Moderate'],
  ['moderate-hard', 'Moderate to Hard'],
  ['hard', 'Hard'],
  ['unknown', 'Not sure'],
]
export const FRESHNESS = [
  ['yes', 'Yes'],
  ['no', 'No'],
  [
    'tolerant',
    'It can be done while tired without negatively impacting performance',
  ],
  ['fatigue', 'I am deliberately practising while tired'],
  ['unknown', 'Not sure'],
]
export function newPlanningAudit() {
  return {
    id: uid(),
    schemaVersion: PLANNING_SCHEMA,
    currentStep: 0,
    weekMode: 'typical',
    weekStart: '',
    timeZone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
    profile: structuredClone(EMPTY_PROFILE),
    sessions: [],
    availableWindows: [],
    blockedWindows: [],
    locations: [],
    pairResponses: {},
    acceptedPlan: null,
    updatedAt: null,
  }
}
export function newPlanningSession(patch = {}) {
  return {
    ...newSession({
      id: uid(),
      name: '',
      type: 'custom',
      fingerprintConfirmed: false,
    }),
    priority: false,
    mobility: 'movable',
    effort: 'unknown',
    freshness: 'unknown',
    exercises: '',
    plannedRpe: '',
    progression: '',
    location: '',
    equipment: [],
    components: [],
    startDelay: 0,
    ...patch,
  }
}
export function newPart(patch = {}) {
  return {
    id: uid(),
    name: '',
    type: 'custom',
    duration: 15,
    breakAfter: 0,
    effort: 'unknown',
    exercises: '',
    fingerprintConfirmed: false,
    stress: { ...getSessionType('custom').stress },
    ...patch,
  }
}
export function bookingDuration(session) {
  return session.components?.length
    ? Number(session.startDelay || 0) +
        session.components.reduce(
          (sum, part) =>
            sum + Number(part.duration || 0) + Number(part.breakAfter || 0),
          0,
        )
    : Number(session.duration || 0)
}
export function parseClock(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return NaN
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}
export function clock(minutes) {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}
export function sessionSignature(session) {
  return JSON.stringify({
    type: session.type,
    exercises: session.exercises,
    effort: session.effort,
    freshness: session.freshness,
    stress: session.stress,
    fingerprintConfirmed: session.fingerprintConfirmed,
    duration: bookingDuration(session),
    day: session.day,
    startTime: session.startTime,
    components: session.components?.map(({ id, name, ...part }) => part) || [],
  })
}
export function pairKey(sourceId, targetId) {
  return `${sourceId}->${targetId}`
}
export function dayOptions(audit) {
  if (
    audit.weekMode !== 'specific' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(audit.weekStart || '')
  )
    return DAYS
  const start = new Date(`${audit.weekStart}T12:00:00Z`)
  if (!Number.isFinite(start.getTime())) return DAYS
  return DAYS.map(({ value }) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + value)
    return {
      value,
      label: date.toLocaleDateString('en-GB', {
        weekday: 'long',
        timeZone: 'UTC',
      }),
      short: date.toLocaleDateString('en-GB', {
        weekday: 'short',
        timeZone: 'UTC',
      }),
      date: date.toISOString().slice(0, 10),
    }
  })
}
export function dayLabel(audit, day) {
  return dayOptions(audit)[((day % 7) + 7) % 7]?.label || ''
}
export function formatGap(minutes) {
  const hours = Math.floor(Math.abs(minutes) / 60)
  const remainder = Math.round(Math.abs(minutes) % 60)
  return (
    `${hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''}${hours && remainder ? ' ' : ''}${remainder ? `${remainder} ${remainder === 1 ? 'minute' : 'minutes'}` : ''}` ||
    '0 minutes'
  )
}
