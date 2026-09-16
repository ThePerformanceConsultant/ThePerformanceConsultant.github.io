import { getSessionType } from './constants.js'
import {
  PLANNING_SCHEMA,
  PLANNING_STORAGE_KEY,
  newPlanningAudit,
  newPlanningSession,
  newPart,
  pairKey,
  parseClock,
  clock,
} from './planning-model.js'
import { pairContext } from './planner.js'

const LEGACY_KEYS = ['tpc-hybrid-stress-map-v1', 'tpc-hybrid-stress-map-v2']
export const PLANNING_ARCHIVE_PREFIX = `${PLANNING_STORAGE_KEY}:archive:`
const record = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const clone = (value) => structuredClone(value)
const string = (value) => typeof value === 'string'
const numeric = (value) =>
  typeof value === 'number' ||
  (string(value) && (value === '' || Number.isFinite(Number(value))))
const fail = (message) => {
  throw new Error(message)
}
const hash = (value) => {
  let result = 2166136261
  for (const character of JSON.stringify(value))
    result = Math.imul(result ^ character.charCodeAt(0), 16777619)
  return (result >>> 0).toString(36)
}

function validateSessions(sessions, legacy = false) {
  if (!Array.isArray(sessions))
    fail('The saved sessions could not be read. The saved copy has been kept.')
  const ids = new Set()
  for (const session of sessions) {
    if (
      !record(session) ||
      !string(session.id) ||
      !session.id ||
      ids.has(session.id)
    )
      fail(
        'A saved session has an invalid reference. The saved copy has been kept.',
      )
    ids.add(session.id)
    if (
      !string(session.name ?? session.label) ||
      !string(session.startTime) ||
      !Number.isInteger(session.day) ||
      session.day < 0 ||
      session.day > 6 ||
      !numeric(session.duration)
    )
      fail('A saved session could not be read. The saved copy has been kept.')
    if (session.components !== undefined && !Array.isArray(session.components))
      fail(
        'The saved session parts could not be read. The saved copy has been kept.',
      )
    for (const part of session.components || []) {
      if (
        !record(part) ||
        !string(part.id) ||
        !part.id ||
        ids.has(part.id) ||
        !string(part.name ?? part.label) ||
        !numeric(part.duration) ||
        !numeric(part.breakAfter ?? 0)
      )
        fail(
          'A saved session part could not be read. The saved copy has been kept.',
        )
      ids.add(part.id)
    }
    if (
      !legacy &&
      (!Array.isArray(session.equipment) || !record(session.stress))
    )
      fail(
        'The saved session details could not be read. The saved copy has been kept.',
      )
  }
}
function validateWindows(windows) {
  if (
    !Array.isArray(windows) ||
    windows.some(
      (window) =>
        !record(window) ||
        !string(window.id) ||
        !Number.isInteger(window.day) ||
        window.day < 0 ||
        window.day > 6 ||
        !string(window.startTime) ||
        !string(window.endTime) ||
        (window.sessionIds !== undefined &&
          (!Array.isArray(window.sessionIds) ||
            window.sessionIds.some((id) => !string(id)))),
    )
  )
    fail(
      'The saved time slots could not be read. The saved copy has been kept.',
    )
}
function validateCurrent(audit) {
  if (
    !record(audit) ||
    audit.schemaVersion !== PLANNING_SCHEMA ||
    !string(audit.id) ||
    !audit.id ||
    !record(audit.profile) ||
    !['typical', 'specific'].includes(audit.weekMode) ||
    !string(audit.weekStart) ||
    !string(audit.timeZone)
  )
    fail(
      'This saved week uses an unsupported format. The saved copy has been kept.',
    )
  validateSessions(audit.sessions)
  validateWindows(audit.availableWindows)
  validateWindows(audit.blockedWindows)
  if (
    !Array.isArray(audit.locations) ||
    audit.locations.some((location) => !string(location)) ||
    !record(audit.pairResponses)
  )
    fail('The saved choices could not be read. The saved copy has been kept.')
  for (const response of Object.values(audit.pairResponses))
    if (
      !record(response) ||
      !['yes', 'sometimes', 'no', 'unknown'].includes(response.answer) ||
      !record(response.context) ||
      !string(response.context.sourceSignature) ||
      !string(response.context.targetSignature) ||
      !Number.isFinite(response.context.gapMinutes)
    )
      fail(
        'A saved session answer could not be read. The saved copy has been kept.',
      )
  if (audit.acceptedPlan !== null && audit.acceptedPlan !== undefined) {
    if (!record(audit.acceptedPlan))
      fail(
        'The saved timetable could not be read. The saved copy has been kept.',
      )
    validateSessions(audit.acceptedPlan.sessions)
  }
  return audit
}
function migrateOriginal(raw, key) {
  if (!record(raw.profile))
    fail('The saved goals could not be read. The saved copy has been kept.')
  validateSessions(raw.sessions, true)
  const audit = {
    ...newPlanningAudit(),
    id: `legacy-v1-${hash(raw)}`,
    profile: { ...newPlanningAudit().profile, ...clone(raw.profile) },
    sessions: raw.sessions.map((session) =>
      newPlanningSession({
        ...clone(session),
        priority: session.role === 'priority1-direct',
        fingerprintConfirmed:
          session.fingerprintConfirmed ?? !getSessionType(session.type).custom,
        freshness: session.stress?.freshness >= 2 ? 'yes' : 'unknown',
        effort:
          Number(session.plannedRpe) >= 7
            ? 'hard'
            : Number(session.plannedRpe) === 6
              ? 'moderate-hard'
              : Number(session.plannedRpe) === 5
                ? 'moderate'
                : Number(session.plannedRpe) > 0
                  ? 'easy'
                  : 'unknown',
        exercises: session.notes || '',
        components: [],
        equipment: [],
      }),
    ),
    updatedAt: raw.updatedAt || null,
    legacy: { storageKey: key, snapshot: clone(raw) },
  }
  for (const session of audit.sessions)
    for (const day of session.availableDays || []) {
      if (
        !Number.isInteger(day) ||
        day < 0 ||
        day > 6 ||
        !Number.isFinite(parseClock(session.startTime)) ||
        !(Number(session.duration) > 0)
      )
        continue
      audit.availableWindows.push({
        id: `legacy-${session.id}-${day}`,
        day,
        startTime: session.startTime,
        endTime: clock(
          parseClock(session.startTime) + Number(session.duration),
        ),
        sessionIds: [session.id],
        location: '',
        equipment: [],
      })
    }
  return audit
}
const goalNames = {
  strength: 'Maximal strength',
  muscle: 'Muscle growth',
  endurance: 'Running performance',
  crossfit: 'CrossFit performance',
  hyrox: 'HYROX performance',
  athx: 'ATHX performance',
  skill: 'Sport performance',
  fitness: 'General fitness',
  'fat-loss': 'Fat loss while maintaining performance',
  other: 'Other',
}
const typeNames = {
  strength: 'full-strength',
  'hard-run': 'running-intervals',
  cycle: 'zone2-bike-row',
  class: 'crossfit',
  hyrox: 'hyrox-mixed',
  recovery: 'mobility',
  'athx-strength': 'lower-strength',
  'athx-endurance': 'custom',
  'athx-metcon': 'custom',
  'athx-staged': 'custom',
  skill: 'custom',
}
const roleNames = {
  main: 'priority1-direct',
  support: 'priority1-support',
  other: 'priority2',
  maintenance: 'maintenance',
  enjoyment: 'enjoyment',
  unknown: 'unclear',
}
function migrateV3Item(item, part = false) {
  const type = typeNames[item.type] || item.type || 'custom'
  const defaults = getSessionType(type)
  const demands = item.demands || {}
  const known =
    item.confirmed === true &&
    ['legs', 'impact', 'hardEfforts', 'freshSkill'].every(
      (field) => demands[field] && demands[field] !== 'unknown',
    )
  const stress = {
    ...defaults.stress,
    lowerForce: { none: 0, light: 1, substantial: 3 }[demands.legs] ?? 0,
    impact: { none: 0, some: 2, substantial: 3 }[demands.impact] ?? 0,
    metabolic:
      demands.hardEfforts === 'yes' ? 3 : demands.hardEfforts === 'no' ? 0 : 0,
    freshness: demands.freshSkill === 'yes' || item.intent === 'fresh' ? 3 : 0,
  }
  const properties = {
    id: item.id,
    name: item.label,
    type,
    duration: item.duration,
    effort: item.effort || 'unknown',
    freshness:
      { fresh: 'yes', fatigue: 'fatigue', tolerant: 'tolerant' }[item.intent] ||
      'unknown',
    exercises: item.description || '',
    fingerprintConfirmed: known,
    stress,
    legacyDemands: clone(demands),
  }
  if (part) return newPart({ ...properties, breakAfter: item.breakAfter || 0 })
  const components = (item.components || []).map((component) =>
    migrateV3Item(component, true),
  )
  // The previous tool allowed unused booking time after the last part. Preserve it.
  const occupied =
    Number(item.startDelay || 0) +
    components.reduce(
      (sum, component) =>
        sum + Number(component.duration) + Number(component.breakAfter),
      0,
    )
  if (components.length && Number(item.duration) > occupied)
    components[components.length - 1].breakAfter =
      Number(components.at(-1).breakAfter) + Number(item.duration) - occupied
  return newPlanningSession({
    ...properties,
    day: item.day,
    startTime: item.startTime,
    startDelay: item.startDelay || 0,
    mobility: item.fixed || item.protected ? 'fixed' : 'movable',
    role: roleNames[item.role] || 'unclear',
    location: item.location || '',
    equipment: clone(item.equipment || []),
    components,
    progression: '',
    notes: '',
    legacy: clone(item),
  })
}
function migrateRevised(raw, key) {
  validateSessions(raw.sessions, true)
  if (
    !string(raw.timeZone) ||
    !string(raw.startDate) ||
    !['one-off', 'repeating'].includes(raw.weekType) ||
    !record(raw.responses || {})
  )
    fail(
      'The saved dates or answers could not be read. The saved copy has been kept.',
    )
  for (const windows of [
    raw.availableWindows || [],
    raw.blockedWindows || [],
    raw.sleepWindows || [],
  ])
    validateWindows(windows)
  const priorities =
    raw.schemaVersion === 2
      ? raw.prioritySessionId
        ? [raw.prioritySessionId]
        : []
      : raw.prioritySessionIds || []
  if (!Array.isArray(priorities) || priorities.some((id) => !string(id)))
    fail(
      'The saved priority sessions could not be read. The saved copy has been kept.',
    )
  const audit = {
    ...newPlanningAudit(),
    id: `legacy-v${raw.schemaVersion}-${hash(raw)}`,
    weekMode: raw.weekType === 'repeating' ? 'typical' : 'specific',
    weekStart: raw.startDate,
    timeZone: raw.timeZone,
    updatedAt: raw.updatedAt || null,
    sessions: raw.sessions.map((session) => ({
      ...migrateV3Item(session),
      priority: priorities.includes(session.id),
    })),
    availableWindows: clone(raw.availableWindows || []),
    blockedWindows: [
      ...clone(raw.blockedWindows || []),
      ...(raw.sleepWindows || []).map((window) => ({
        ...clone(window),
        label: 'Sleep',
        kind: 'sleep',
      })),
    ],
    legacy: { storageKey: key, snapshot: clone(raw) },
  }
  if (
    audit.weekMode === 'typical' &&
    /^\d{4}-\d{2}-\d{2}$/.test(audit.weekStart)
  ) {
    const date = new Date(`${audit.weekStart}T00:00:00Z`)
    if (Number.isFinite(date.getTime())) {
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
      audit.weekStart = date.toISOString().slice(0, 10)
    }
  }
  audit.profile.priority1 = goalNames[raw.goal] || raw.goal || ''
  audit.profile.priority2 =
    goalNames[raw.otherGoals?.[0]?.goal] || raw.otherGoals?.[0]?.goal || ''
  audit.profile.performanceMarkers = [raw.marker || '', '']
  audit.locations = [
    ...new Set(
      [...audit.sessions, ...audit.availableWindows]
        .map((entry) => entry.location)
        .filter(Boolean),
    ),
  ]
  for (const source of audit.sessions)
    for (const target of audit.sessions) {
      if (source.id === target.id) continue
      const value = raw.responses?.[`effect:${source.id}:${target.id}`]
      if (!['yes', 'sometimes', 'often', 'no', 'unknown'].includes(value))
        continue
      const context = pairContext(audit, source.id, target.id)
      if (!context || !Number.isFinite(context.gapMinutes)) continue
      audit.pairResponses[pairKey(source.id, target.id)] = {
        answer: value === 'often' ? 'yes' : value,
        context,
        answeredAt: raw.updatedAt || null,
        legacy: { questionId: `effect:${source.id}:${target.id}`, value },
      }
    }
  // Conditional recovery and crowded-week answers remain in legacy.snapshot only.
  return audit
}
export function restorePlanningAudit(raw, key = PLANNING_STORAGE_KEY) {
  if (!record(raw))
    fail('The saved week could not be read. The saved copy has been kept.')
  if (
    (key === PLANNING_STORAGE_KEY || key.startsWith(PLANNING_ARCHIVE_PREFIX)) &&
    raw.schemaVersion === PLANNING_SCHEMA
  )
    return validateCurrent(clone(raw))
  if (key === LEGACY_KEYS[0] && raw.schemaVersion === 1)
    return validateCurrent(migrateOriginal(raw, key))
  if (key === LEGACY_KEYS[1] && [2, 3].includes(raw.schemaVersion))
    return validateCurrent(migrateRevised(raw, key))
  fail(
    'This saved week uses an unsupported version. The saved copy has been kept.',
  )
}
export function loadSavedAudits(storage) {
  const choices = [],
    errors = []
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage
    } catch {
      return {
        choices,
        errors: [
          {
            key: PLANNING_STORAGE_KEY,
            message: 'Saving is unavailable in this browser.',
          },
        ],
      }
    }
  }
  if (!storage)
    return {
      choices,
      errors: [
        {
          key: PLANNING_STORAGE_KEY,
          message: 'Saving is unavailable in this browser.',
        },
      ],
    }
  const archives = []
  if (typeof storage.key === 'function') {
    try {
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (typeof key === 'string' && key.startsWith(PLANNING_ARCHIVE_PREFIX))
          archives.push(key)
      }
    } catch {
      errors.push({
        key: PLANNING_STORAGE_KEY,
        message:
          'Some earlier saved weeks could not be listed. Their saved copies have been kept.',
      })
    }
  }
  for (const key of [PLANNING_STORAGE_KEY, ...archives, ...LEGACY_KEYS]) {
    try {
      const saved = storage.getItem(key)
      if (saved === null) continue
      let raw
      try {
        raw = JSON.parse(saved)
      } catch {
        fail('A saved week could not be read. Its saved copy has been kept.')
      }
      const audit = restorePlanningAudit(raw, key)
      choices.push({
        key,
        label:
          key === PLANNING_STORAGE_KEY
            ? 'Current saved week'
            : key.startsWith(PLANNING_ARCHIVE_PREFIX)
              ? 'Earlier saved week'
              : key === LEGACY_KEYS[0]
                ? 'Saved week from the original tool'
                : 'Saved week from the revised tool',
        audit,
        updatedAt: audit.updatedAt,
        sessionCount: audit.sessions.length,
      })
    } catch (error) {
      errors.push({
        key,
        message: error.message || 'The saved week could not be opened.',
      })
    }
  }
  const ids = new Set()
  return {
    choices: choices.filter((choice) => {
      if (ids.has(choice.audit.id)) return false
      ids.add(choice.audit.id)
      return true
    }),
    errors,
  }
}
export function savePlanningAudit(audit, storage) {
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage
    } catch {
      fail('Saving is unavailable in this browser. Download your week instead.')
    }
  }
  if (!storage)
    fail('Saving is unavailable in this browser. Download your week instead.')
  validateCurrent(audit)
  const saved = { ...clone(audit), updatedAt: new Date().toISOString() }
  const existing = storage.getItem(PLANNING_STORAGE_KEY)
  if (existing !== null) {
    let raw
    try {
      raw = JSON.parse(existing)
    } catch {
      fail(
        'An unreadable saved copy is already stored. It has been kept. Download this week instead.',
      )
    }
    const previous = restorePlanningAudit(raw, PLANNING_STORAGE_KEY)
    if (previous.id !== saved.id) {
      const archiveKey = `${PLANNING_ARCHIVE_PREFIX}${encodeURIComponent(previous.id)}`
      const existingArchive = storage.getItem(archiveKey)
      if (existingArchive !== null) {
        let archive
        try {
          archive = JSON.parse(existingArchive)
        } catch {
          fail(
            'An earlier saved copy could not be read. It has been kept. Download this week instead.',
          )
        }
        const restored = restorePlanningAudit(archive, archiveKey)
        if (restored.id !== previous.id)
          fail(
            'An earlier saved copy has a different reference. It has been kept. Download this week instead.',
          )
      }
      try {
        storage.setItem(archiveKey, existing)
      } catch {
        fail(
          'This browser could not keep the previous saved week. Download this week instead.',
        )
      }
    }
  }
  try {
    storage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(saved))
  } catch {
    fail('This browser could not save the week. Download your week instead.')
  }
  return saved
}
