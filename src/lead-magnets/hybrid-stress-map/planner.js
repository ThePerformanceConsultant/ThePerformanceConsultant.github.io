import { getSessionType } from './constants.js'
import {
  bookingDuration,
  clock,
  dayLabel,
  formatGap,
  pairKey,
  parseClock,
  sessionSignature,
} from './planning-model.js'

const DAY = 1440
const WEEK = DAY * 7
const BEAM_WIDTH = 128
const MAX_EXTENSIONS = 250000
const DOMAINS = ['lowerForce', 'impact', 'upperGrip', 'metabolic']
const DOMAIN_TEXT = {
  lowerForce: 'demanding leg training',
  impact: 'impact or lowering under load',
  upperGrip: 'upper-body or grip demand',
  metabolic: 'repeated hard efforts',
}
const reported = (answer) => ['yes', 'sometimes'].includes(answer)
const name = (session) =>
  session.name?.trim() ||
  getSessionType(session.type)?.label ||
  'Unnamed session'
const fixed = (session) =>
  session.mobility !== 'movable' ||
  session.fixed === true ||
  session.protected === true
const copy = (value) => structuredClone(value)
const positionKey = (position) => `${position.day}:${position.startTime}`
const scheduleKey = (audit) =>
  `${audit.weekMode}:${audit.weekStart || ''}:${audit.timeZone}`
const compare = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}
const normal = (value) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase('en-GB')
const dayCache = new WeakMap()
const dayText = (audit, day) => {
  const key = `${audit.weekMode}:${audit.weekStart}`
  if (dayCache.get(audit)?.key !== key)
    dayCache.set(audit, {
      key,
      labels: Array.from({ length: 7 }, (_, index) => dayLabel(audit, index)),
    })
  return dayCache.get(audit).labels[((day % 7) + 7) % 7]
}

// Dated plans measure elapsed time. Typical weeks have no particular clock-change date.
function timeSystem(audit) {
  if (audit.weekMode !== 'specific')
    return { resolve: (minute) => minute, wall: (minute) => minute }
  const base = Date.parse(`${audit.weekStart}T00:00:00Z`) / 60000
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: audit.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const wallStamp = (minute) => {
    const p = Object.fromEntries(
      formatter
        .formatToParts(new Date(minute * 60000))
        .filter((item) => item.type !== 'literal')
        .map((item) => [item.type, Number(item.value)]),
    )
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) / 60000
  }
  const cache = new Map()
  const resolve = (minute) => {
    if (cache.has(minute)) return cache.get(minute)
    const wanted = base + minute
    const offsets = new Set(
      [-2160, -720, 0, 720, 2160].map(
        (offset) => wallStamp(wanted + offset) - wanted - offset,
      ),
    )
    const matches = [...offsets]
      .map((offset) => wanted - offset)
      .filter((candidate) => wallStamp(candidate) === wanted)
    const result = matches.length === 1 ? matches[0] : null
    cache.set(minute, result)
    return result
  }
  return { resolve, wall: (minute) => wallStamp(minute) - base }
}

function validation(audit) {
  const errors = []
  if (!audit || !Array.isArray(audit.sessions))
    return [
      { type: 'invalid', reason: 'The training sessions could not be read.' },
    ]
  if (!['typical', 'specific'].includes(audit.weekMode))
    errors.push({
      type: 'invalid',
      reason: 'Choose a typical week or a specific training week.',
    })
  if (audit.weekMode === 'specific') {
    const date = new Date(`${audit.weekStart}T00:00:00Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(audit.weekStart || '') ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== audit.weekStart
    )
      errors.push({
        type: 'invalid',
        reason: 'Choose a valid start date for this week.',
      })
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: audit.timeZone }).format(
        new Date(),
      )
    } catch {
      errors.push({ type: 'invalid', reason: 'Choose a valid time zone.' })
    }
  }
  const ids = new Set()
  for (const session of audit.sessions) {
    const id = session?.id
    if (!id || ids.has(id))
      errors.push({
        type: 'invalid',
        sessionId: id,
        reason: 'Each session needs its own reference.',
      })
    ids.add(id)
    if (
      !session ||
      !Number.isInteger(session.day) ||
      session.day < 0 ||
      session.day > 6 ||
      !Number.isFinite(parseClock(session.startTime))
    )
      errors.push({
        type: 'invalid',
        sessionId: id,
        reason: 'Give each session a day and start time.',
      })
    if (!session) continue
    if (
      session.components !== undefined &&
      !Array.isArray(session.components)
    ) {
      errors.push({
        type: 'invalid',
        sessionId: id,
        reason: `The parts of “${name(session)}” could not be read.`,
      })
      continue
    }
    if (session.components?.some((part) => !part)) {
      errors.push({
        type: 'invalid',
        sessionId: id,
        reason: `A part of “${name(session)}” could not be read.`,
      })
      continue
    }
    const duration = bookingDuration(session)
    if (!Number.isInteger(duration) || duration <= 0 || duration > DAY)
      errors.push({
        type: 'invalid',
        sessionId: id,
        reason: `Check the duration of “${name(session)}”. Use whole minutes.`,
      })
    for (const part of session.components || [])
      if (
        !(Number(part.duration) > 0) ||
        !Number.isInteger(Number(part.duration)) ||
        !(Number(part.breakAfter || 0) >= 0) ||
        !Number.isInteger(Number(part.breakAfter || 0))
      )
        errors.push({
          type: 'invalid',
          sessionId: id,
          reason: `Check each part and break in “${name(session)}”. Use whole minutes.`,
        })
    if (
      !(Number(session.startDelay || 0) >= 0) ||
      !Number.isInteger(Number(session.startDelay || 0))
    )
      errors.push({
        type: 'invalid',
        sessionId: id,
        reason: `Check the time before the first part in “${name(session)}”. Use whole minutes.`,
      })
  }
  for (const kind of ['availableWindows', 'blockedWindows']) {
    if (audit[kind] !== undefined && !Array.isArray(audit[kind])) {
      errors.push({
        type: 'invalid',
        reason: 'The time slots could not be read.',
      })
      continue
    }
    for (const window of audit[kind] || [])
      if (
        !window ||
        !Number.isInteger(window.day) ||
        window.day < 0 ||
        window.day > 6 ||
        !Number.isFinite(parseClock(window.startTime)) ||
        !Number.isFinite(parseClock(window.endTime))
      )
        errors.push({
          type: 'invalid',
          windowId: window?.id,
          reason: 'Give each time slot a day, start time and end time.',
        })
  }
  return errors
}

function makePosition(session, day, startTime, time, windowId = null) {
  const wallStart = day * DAY + parseClock(startTime)
  const start = time.resolve(wallStart)
  if (start === null) return null
  const duration = bookingDuration(session)
  return {
    session,
    sessionId: session.id,
    day,
    startTime,
    duration,
    start,
    end: start + duration,
    wallStart,
    wallEnd: time.wall(start + duration),
    windowId,
  }
}
function makeWindow(window, time) {
  const wallStart = window.day * DAY + parseClock(window.startTime)
  const wallEnd =
    window.day * DAY +
    parseClock(window.endTime) +
    (parseClock(window.endTime) <= parseClock(window.startTime) ? DAY : 0)
  const start = time.resolve(wallStart)
  const end = time.resolve(wallEnd)
  return { ...window, wallStart, wallEnd, start, end }
}
const overlaps = (a, b, typical) =>
  (typical ? [-WEEK, 0, WEEK] : [0]).some(
    (shift) => a.start < b.end + shift && b.start + shift < a.end,
  )
function issuesFor(audit, positions, blocked) {
  const issues = []
  const typical = audit.weekMode === 'typical'
  for (let i = 0; i < positions.length; i++) {
    const position = positions[i]
    for (let j = i + 1; j < positions.length; j++)
      if (overlaps(position, positions[j], typical))
        issues.push({
          type: 'overlap',
          sessionIds: [position.sessionId, positions[j].sessionId],
          windowIds: [],
          reason: `“${name(position.session)}” on ${dayText(audit, position.day)} overlaps “${name(positions[j].session)}” on ${dayText(audit, positions[j].day)}.`,
        })
    for (const window of blocked)
      if (overlaps(position, window, typical))
        issues.push({
          type: 'commitment',
          sessionId: position.sessionId,
          sessionIds: [position.sessionId],
          windowId: window.id,
          windowIds: [window.id],
          reason: `“${name(position.session)}” on ${dayText(audit, position.day)} overlaps ${window.label ? `“${window.label}”` : 'a time you marked as busy'}.`,
        })
  }
  return issues
}
function blocks(position) {
  const session = position.session
  if (!session.components?.length)
    return [{ ...position, data: session, label: name(session), partId: null }]
  let offset = Number(session.startDelay || 0)
  return session.components.map((part) => {
    const start = position.start + offset
    const result = {
      ...position,
      start,
      end: start + Number(part.duration),
      data: part,
      label: part.name?.trim() || 'Unnamed part',
      partId: part.id,
    }
    offset += Number(part.duration) + Number(part.breakAfter || 0)
    return result
  })
}
function sharedDemand(source, target) {
  if (!source.data.fingerprintConfirmed || !target.data.fingerprintConfirmed)
    return []
  const a = source.data.stress || getSessionType(source.data.type)?.stress || {}
  const b = target.data.stress || getSessionType(target.data.type)?.stress || {}
  return DOMAINS.filter(
    (domain) =>
      Number(a[domain]) >= 2 &&
      Number(b[domain]) >= 2 &&
      Math.max(Number(a[domain]), Number(b[domain])) >= 3,
  )
}
function affirmedExercise(text, expression) {
  return String(text || '')
    .split(/[.;\n]/)
    .some((clause) => {
      const found = expression.exec(clause)
      if (!found) return false
      const preceding = clause.slice(0, found.index).toLowerCase()
      return !/\b(no|without|omit|omitting|skip|skipping|avoid|avoiding|exclude|excluding|not doing)\b[^,]*$/.test(
        preceding,
      )
    })
}
function exerciseMechanism(source, target) {
  if (
    source.data.fingerprintConfirmed !== true ||
    target.data.fingerprintConfirmed !== true
  )
    return { detail: '', sources: [] }
  const text = source.data.exercises || ''
  const targetRunning =
    getSessionType(target.data.type)?.running === true ||
    affirmedExercise(
      target.data.exercises,
      /\b(run(?:ning)?|sprints?|jog(?:ging)?)\b/i,
    )
  const deadlifts = affirmedExercise(text, /\bdead[ -]?lifts?\b/i)
  const squats = affirmedExercise(text, /\b(?:split )?squats?\b/i)
  const lunges = affirmedExercise(text, /\blunges?\b/i)
  const controlledLowering = affirmedExercise(
    text,
    /\b(?:controlled|slow|slower) lowering(?: phase)?\b|\blower(?:ing)? (?:the )?(?:weight|bar)(?:bell)? slowly\b/i,
  )
  const lowering =
    controlledLowering || affirmedExercise(text, /\beccentric(?:ally)?\b/i)
  if (!targetRunning || (!deadlifts && !squats && !lunges && !lowering))
    return { detail: '', sources: [] }
  const sentences = []
  const sources = []
  if (deadlifts) {
    sentences.push(
      'The deadlifts load your hamstrings and glutes, which also contribute to running.',
    )
    sources.push({
      label: 'Muscle activation during deadlifts',
      url: 'https://pubmed.ncbi.nlm.nih.gov/11932579/',
    })
  } else if (squats || lunges)
    sentences.push(
      `The ${squats && lunges ? 'squats and lunges' : squats ? 'squats' : 'lunges'} you entered load your quadriceps and glutes, which also contribute to running.`,
    )
  if (lowering)
    sentences.push(
      `${controlledLowering ? 'You specified a controlled lowering phase. This is eccentric loading' : 'You specified eccentric loading'}: the muscles produce force as they lengthen.`,
    )
  sentences.push(
    'Fatigue or soreness from this session may make it harder to hold your planned running pace.',
  )
  sources.push({
    label: 'Eccentric exercise and running mechanics',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25774624/',
  })
  sources.push({
    label: 'Strength training order and subsequent running performance',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23724883/',
  })
  return { detail: sentences.join(' '), sources }
}
function pairing(audit, source, target) {
  const candidates = []
  for (const a of blocks(source))
    for (const b of blocks(target)) {
      let shift = 0
      if (a.start >= b.start) {
        if (audit.weekMode !== 'typical') continue
        shift = WEEK
      }
      const mechanism = exerciseMechanism(a, b)
      candidates.push({
        gapMinutes: b.start - (a.end - shift),
        sourcePartId: a.partId,
        targetPartId: b.partId,
        sourcePart: a.label,
        targetPart: b.label,
        domains: sharedDemand(a, b),
        sourceEnd: a.end - shift,
        targetStart: b.start,
        mechanismDetail: mechanism.detail,
        mechanismSources: mechanism.sources,
      })
    }
  const relevant = candidates.filter((candidate) => candidate.domains.length)
  return (
    (relevant.length ? relevant : candidates).sort(
      (a, b) =>
        a.gapMinutes - b.gapMinutes ||
        String(a.sourcePartId).localeCompare(String(b.sourcePartId)),
    )[0] || {
      gapMinutes: null,
      domains: [],
      sourcePartId: null,
      targetPartId: null,
    }
  )
}
function responseState(audit, source, target) {
  const response = audit.pairResponses?.[pairKey(source.id, target.id)]
  const context = response?.context
  const needsUpdate = Boolean(
    response &&
    (!context ||
      context.scheduleKey !== scheduleKey(audit) ||
      context.sourceSignature !== sessionSignature(source) ||
      context.targetSignature !== sessionSignature(target)),
  )
  return { answer: response?.answer || 'unknown', needsUpdate }
}
function concernsFor(audit, positions, referenceAudit = audit) {
  const result = []
  const originals = new Map(
    referenceAudit.sessions.map((session) => [session.id, session]),
  )
  for (const source of positions)
    for (const target of positions) {
      if (source.sessionId === target.sessionId) continue
      const response = responseState(
        referenceAudit,
        originals.get(source.sessionId),
        originals.get(target.sessionId),
      )
      const pair = pairing(audit, source, target)
      const isReported = reported(response.answer) && !response.needsUpdate
      const nearby =
        pair.gapMinutes !== null &&
        pair.gapMinutes >= 0 &&
        Math.floor(target.wallStart / DAY) -
          Math.floor((source.wallEnd - 0.001) / DAY) >=
          0 &&
        Math.floor(target.wallStart / DAY) -
          Math.floor((source.wallEnd - 0.001) / DAY) <=
          1
      const wrappedNearby =
        audit.weekMode === 'typical' &&
        pair.gapMinutes !== null &&
        pair.gapMinutes >= 0 &&
        (Math.floor(target.wallStart / DAY) -
          Math.floor((source.wallEnd - 0.001) / DAY) +
          7) %
          7 <=
          1
      const inferred =
        target.session.freshness === 'yes' &&
        pair.domains.length > 0 &&
        (nearby || wrappedNearby) &&
        !(response.answer === 'no' && !response.needsUpdate)
      if (
        pair.gapMinutes === null ||
        (!isReported && !inferred && !response.needsUpdate)
      )
        continue
      const basis = isReported ? 'reported' : 'inferred'
      const mechanism = pair.domains
        .map((domain) => DOMAIN_TEXT[domain])
        .join(' and ')
      const namedSource = isReported
        ? originals.get(source.sessionId)
        : source.session
      const namedTarget = isReported
        ? originals.get(target.sessionId)
        : target.session
      const sourceText = `“${name(namedSource)}” on ${dayText(audit, isReported ? namedSource.day : source.day)}`
      const targetText = `“${name(namedTarget)}” on ${dayText(audit, isReported ? namedTarget.day : target.day)}`
      const inferredReason = pair.mechanismDetail
        ? `${sourceText} comes before ${targetText}. ${pair.mechanismDetail}`
        : `${sourceText} and ${targetText} share ${mechanism}. You want to start the later session fresh.`
      result.push({
        key: pairKey(source.sessionId, target.sessionId),
        sourceId: source.sessionId,
        targetId: target.sessionId,
        ...pair,
        basis,
        ...response,
        priority: Boolean(target.session.priority),
        reason: response.needsUpdate
          ? `The details of ${sourceText} or ${targetText} have changed since your answer.`
          : isReported
            ? `You reported that the time between ${sourceText} and ${targetText} ${response.answer === 'sometimes' ? 'sometimes affects' : 'affects'} “${name(namedTarget)}” or your sleep.`
            : inferredReason,
        mechanism,
      })
    }
  return result.sort(
    (a, b) =>
      (a.basis === 'reported' ? 0 : 1) - (b.basis === 'reported' ? 0 : 1) ||
      Number(b.priority) - Number(a.priority) ||
      a.key.localeCompare(b.key),
  )
}

export function analyseSchedule(audit) {
  const errors = validation(audit)
  if (errors.length)
    return {
      valid: false,
      errors,
      issues: [],
      concerns: [],
      sessions: audit?.sessions || [],
      timeline: [],
    }
  const time = timeSystem(audit)
  const timeline = audit.sessions.map((session) =>
    makePosition(session, session.day, session.startTime, time),
  )
  const blocked = (audit.blockedWindows || []).map((window) =>
    makeWindow(window, time),
  )
  const available = (audit.availableWindows || []).map((window) =>
    makeWindow(window, time),
  )
  for (let i = 0; i < timeline.length; i++)
    if (!timeline[i])
      errors.push({
        type: 'clock',
        sessionId: audit.sessions[i].id,
        reason: `The start time for “${name(audit.sessions[i])}” is skipped or repeated when the clocks change. Choose a different time.`,
      })
  for (const window of [...blocked, ...available])
    if (window.start === null || window.end === null)
      errors.push({
        type: 'clock',
        windowId: window.id,
        reason:
          'A time slot starts or ends during a clock change. Choose a different time.',
      })
  if (errors.length)
    return {
      valid: false,
      errors,
      issues: [],
      concerns: [],
      sessions: audit.sessions,
      timeline: [],
    }
  return {
    valid: true,
    errors: [],
    sessions: audit.sessions,
    timeline,
    issues: issuesFor(audit, timeline, blocked),
    concerns: concernsFor(audit, timeline),
  }
}
export function pairContext(audit, sourceId, targetId) {
  const source = audit.sessions.find(
    (session) =>
      session.id === (typeof sourceId === 'object' ? sourceId.id : sourceId),
  )
  const target = audit.sessions.find(
    (session) =>
      session.id === (typeof targetId === 'object' ? targetId.id : targetId),
  )
  if (!source || !target) return null
  const time = timeSystem(audit)
  const a = makePosition(source, source.day, source.startTime, time)
  const b = makePosition(target, target.day, target.startTime, time)
  if (!a || !b) return null
  return {
    sourceSignature: sessionSignature(source),
    targetSignature: sessionSignature(target),
    scheduleKey: scheduleKey(audit),
    gapMinutes: pairing(audit, a, b).gapMinutes,
  }
}

function compatible(session, window) {
  if (window.sessionIds?.length && !window.sessionIds.includes(session.id))
    return false
  if (session.location && normal(session.location) !== normal(window.location))
    return false
  const equipment = new Set((window.equipment || []).map(normal))
  return (session.equipment || []).every((item) => equipment.has(normal(item)))
}
function placementDomains(audit, original, time, blocked) {
  const explicit = (audit.availableWindows || []).map((window) =>
    makeWindow(window, time),
  )
  const vacated = original.map((position) => ({
    id: `original:${position.sessionId}`,
    originalSessionId: position.sessionId,
    start: position.start,
    end: position.end,
    wallStart: position.wallStart,
    wallEnd: position.wallEnd,
    location: position.session.location || '',
    equipment: position.session.equipment || [],
  }))
  const typical = audit.weekMode === 'typical'
  const locked = original.filter((position) => fixed(position.session))
  return new Map(
    original.map((position) => {
      if (fixed(position.session)) return [position.sessionId, [position]]
      const candidates = new Map()
      const add = (candidate) => {
        if (
          !candidate ||
          candidate.day < 0 ||
          candidate.day > 6 ||
          blocked.some((window) => overlaps(candidate, window, typical)) ||
          locked.some(
            (other) =>
              other.sessionId !== candidate.sessionId &&
              overlaps(candidate, other, typical),
          )
        )
          return
        const existing = candidates.get(positionKey(candidate))
        if (
          existing?.windowId &&
          !existing.windowId.startsWith('original:') &&
          candidate.windowId?.startsWith('original:')
        )
          return
        candidates.set(positionKey(candidate), candidate)
      }
      add(position)
      for (const window of [...explicit, ...vacated]) {
        if (!compatible(position.session, window)) continue
        const starts = new Set([
          window.wallStart,
          time.wall(window.end - position.duration),
        ])
        for (
          let minute = Math.ceil(window.wallStart / 15) * 15;
          minute < window.wallEnd;
          minute += 15
        )
          starts.add(minute)
        for (const other of original)
          for (const boundary of [other.wallStart, other.wallEnd]) {
            starts.add(boundary)
            const resolved = time.resolve(boundary)
            if (resolved !== null)
              starts.add(time.wall(resolved - position.duration))
          }
        for (const minute of [...starts].sort((a, b) => a - b)) {
          if (minute < window.wallStart || minute >= window.wallEnd) continue
          const candidate = makePosition(
            position.session,
            Math.floor(minute / DAY),
            clock(minute),
            time,
            window.id,
          )
          if (
            candidate &&
            candidate.start >= window.start &&
            candidate.end <= window.end
          )
            add(candidate)
        }
      }
      return [
        position.sessionId,
        [...candidates.values()].sort(
          (a, b) =>
            Number(positionKey(a) !== positionKey(position)) -
              Number(positionKey(b) !== positionKey(position)) ||
            a.wallStart - b.wallStart,
        ),
      ]
    }),
  )
}
const gain = (before, after) => (after === null ? WEEK : after - before)
function evaluate(audit, positions, original, baseline) {
  const byId = new Map(
    positions.map((position) => [position.sessionId, position]),
  )
  const gains = []
  const counts = [0, 0, 0, 0]
  for (const concern of baseline) {
    if (concern.needsUpdate) continue
    const source = byId.get(concern.sourceId)
    const target = byId.get(concern.targetId)
    if (!source || !target) continue
    const after = pairing(audit, source, target).gapMinutes
    const delta = gain(concern.gapMinutes, after)
    if (concern.basis === 'reported' && delta < 0) return null
    if (delta > 0) {
      counts[
        (concern.basis === 'reported' ? 0 : 2) + (concern.priority ? 0 : 1)
      ]++
      gains.push({ ...concern, afterGap: after, delta })
    }
  }
  const previousKeys = new Set(baseline.map((concern) => concern.key))
  const concerns = concernsFor(audit, positions, audit)
  const introduced = concerns.filter(
    (concern) =>
      !previousKeys.has(concern.key) &&
      !concern.needsUpdate &&
      concern.basis === 'inferred',
  )
  const moved = positions.filter(
    (position) =>
      positionKey(position) !==
      positionKey(
        original.find((item) => item.sessionId === position.sessionId),
      ),
  )
  const dayChanges = moved.filter(
    (position) =>
      position.day !==
      original.find((item) => item.sessionId === position.sessionId).day,
  ).length
  const displacement = moved.reduce(
    (sum, position) =>
      sum +
      Math.abs(
        position.wallStart -
          original.find((item) => item.sessionId === position.sessionId)
            .wallStart,
      ),
    0,
  )
  const score = [
    -counts[0],
    -counts[1],
    introduced.filter((item) => item.priority).length,
    introduced.filter((item) => !item.priority).length,
    -counts[2],
    -counts[3],
    moved.length,
    dayChanges,
    -(gains.length ? Math.min(...gains.map((item) => item.delta)) : 0),
    -gains.reduce((sum, item) => sum + item.delta, 0),
    displacement,
  ]
  return { score, gains, concerns, introduced, moved }
}
function constraints(audit, original, domains, concerns) {
  const relevant = new Set(
    concerns.flatMap((item) => [item.sourceId, item.targetId]),
  )
  return original
    .filter(
      (position) =>
        relevant.has(position.sessionId) ||
        !domains.get(position.sessionId)?.length,
    )
    .flatMap((position) => {
      if (fixed(position.session))
        return [
          {
            type: 'fixed',
            sessionId: position.sessionId,
            sessionIds: [position.sessionId],
            windowIds: [],
            reason: `“${name(position.session)}” is fixed on ${dayText(audit, position.day)} at ${position.startTime}.`,
            detail:
              'Change its fixed-time setting if another time is possible.',
          },
        ]
      if (
        (domains.get(position.sessionId) || []).every(
          (candidate) => positionKey(candidate) === positionKey(position),
        )
      )
        return [
          {
            type: 'availability',
            sessionId: position.sessionId,
            sessionIds: [position.sessionId],
            windowIds: (audit.availableWindows || []).map((item) => item.id),
            reason: `No alternative slot fits the ${position.duration} minutes needed for “${name(position.session)}”${position.session.location ? ` at ${position.session.location}` : ''}.`,
            detail:
              'Add an available time with the required location and equipment.',
          },
        ]
      return []
    })
}
function calendarMoment(audit, wallMinute) {
  const day = Math.floor(wallMinute / DAY)
  const weekday = dayText(audit, day)
  if (audit.weekMode !== 'specific')
    return `${day >= 7 ? 'the following ' : ''}${weekday} ${clock(wallMinute)}`
  const date = new Date(`${audit.weekStart}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + day)
  return `${weekday} ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} ${clock(wallMinute)}`
}
function calendarRange(audit, start, end) {
  return `${calendarMoment(audit, start)} to ${Math.floor(start / DAY) === Math.floor(end / DAY) ? clock(end) : calendarMoment(audit, end)}`
}
function availabilityReason(audit, after, original) {
  const time = timeSystem(audit)
  const requiredEquipment = (after.session.equipment || []).length
    ? ` Required equipment: ${after.session.equipment.join(', ')}.`
    : ''
  const window = (audit.availableWindows || []).find(
    (item) => item.id === after.windowId,
  )
  if (window) {
    const bounds = makeWindow(window, time)
    return `The full ${after.duration}-minute session fits ${window.label ? `your “${window.label}” slot` : 'your available time'}, ${calendarRange(audit, bounds.wallStart, bounds.wallEnd)}.${window.location ? ` Location: ${window.location}.` : ''}${requiredEquipment}`
  }
  const vacated = original.find(
    (item) => `original:${item.sessionId}` === after.windowId,
  )
  if (vacated)
    return `The full ${after.duration}-minute session uses the slot vacated by “${name(vacated.session)}”: ${calendarRange(audit, vacated.wallStart, vacated.wallEnd)}.${vacated.session.location ? ` Location: ${vacated.session.location}.` : ''}${requiredEquipment}`
  return `The full ${after.duration}-minute session occupies ${calendarRange(audit, after.wallStart, after.wallEnd)}.${after.session.location ? ` Location: ${after.session.location}.` : ''}`
}
function bookingGap(audit, source, target) {
  if (source.start < target.start) return target.start - source.end
  return audit.weekMode === 'typical' ? target.start + WEEK - source.end : null
}
function nearestRelations(audit, position, positions) {
  const result = []
  for (const direction of ['before', 'after']) {
    const possibilities = positions
      .filter((item) => item.sessionId !== position.sessionId)
      .map((other) => {
        const source = direction === 'before' ? other : position
        const target = direction === 'before' ? position : other
        return {
          source,
          target,
          gap: bookingGap(audit, source, target),
          comparable: pairing(audit, source, target).domains.length > 0,
        }
      })
      .filter((item) => item.gap !== null && item.gap >= 0)
      .sort(
        (a, b) =>
          a.gap - b.gap || a.source.sessionId.localeCompare(b.source.sessionId),
      )
    if (possibilities[0]) result.push(possibilities[0])
    const comparable = possibilities.find((item) => item.comparable)
    if (comparable && comparable !== possibilities[0]) result.push(comparable)
  }
  return result
}
function consequencesFor(audit, after, original, best, explainedKey) {
  const before = original.find((item) => item.sessionId === after.sessionId)
  const relationships = new Map()
  for (const relationship of [
    ...nearestRelations(audit, before, original),
    ...nearestRelations(audit, after, best.positions),
  ])
    relationships.set(
      pairKey(relationship.source.sessionId, relationship.target.sessionId),
      {
        sourceId: relationship.source.sessionId,
        targetId: relationship.target.sessionId,
      },
    )
  for (const concern of best.introduced.filter((item) =>
    [item.sourceId, item.targetId].includes(after.sessionId),
  ))
    relationships.set(concern.key, concern)
  const result = []
  for (const [key, relationship] of relationships) {
    if (key === explainedKey) continue
    const sourceBefore = original.find(
      (item) => item.sessionId === relationship.sourceId,
    )
    const targetBefore = original.find(
      (item) => item.sessionId === relationship.targetId,
    )
    const sourceAfter = best.positions.find(
      (item) => item.sessionId === relationship.sourceId,
    )
    const targetAfter = best.positions.find(
      (item) => item.sessionId === relationship.targetId,
    )
    const beforeGap = bookingGap(audit, sourceBefore, targetBefore)
    const afterGap = bookingGap(audit, sourceAfter, targetAfter)
    const newConcern = best.introduced.find((item) => item.key === key)
    if (beforeGap === afterGap && !newConcern) continue
    const beforeText =
      beforeGap === null
        ? 'The sessions were in the reverse order.'
        : beforeGap < 0
          ? 'The original times overlapped.'
          : `Previously, the end-to-start gap was ${formatGap(beforeGap)}.`
    const afterText =
      afterGap === null
        ? `“${name(sourceAfter.session)}” now takes place after “${name(targetAfter.session)}” in this week.`
        : `“${name(sourceAfter.session)}” ends ${calendarMoment(audit, sourceAfter.wallEnd)}; “${name(targetAfter.session)}” starts ${calendarMoment(audit, targetAfter.wallStart + (audit.weekMode === 'typical' && targetAfter.start <= sourceAfter.start ? WEEK : 0))}. The end-to-start gap is ${formatGap(afterGap)}.`
    result.push({
      key,
      sourceId: relationship.sourceId,
      targetId: relationship.targetId,
      beforeGap,
      afterGap,
      gapMinutes: afterGap,
      basis: newConcern ? 'inferred' : 'schedule',
      newConcern: Boolean(newConcern),
      reason: `${afterText} ${beforeText}${newConcern ? ` ${newConcern.reason}` : ''}`,
    })
  }
  return result
}
function changeDetails(audit, best, original, baseIssues) {
  return best.moved.map((after) => {
    const before = original.find(
      (position) => position.sessionId === after.sessionId,
    )
    const relevant = best.gains
      .filter((item) =>
        [item.sourceId, item.targetId].includes(after.sessionId),
      )
      .sort(
        (a, b) =>
          (a.basis === 'reported' ? 0 : 1) - (b.basis === 'reported' ? 0 : 1) ||
          Number(b.priority) - Number(a.priority) ||
          b.delta - a.delta,
      )[0]
    const from = {
      day: before.day,
      startTime: before.startTime,
      duration: before.duration,
    }
    const to = {
      day: after.day,
      startTime: after.startTime,
      duration: after.duration,
    }
    const move = `Move “${name(after.session)}” from ${dayText(audit, from.day)} ${from.startTime} to ${dayText(audit, to.day)} ${to.startTime}.`
    const consequences = consequencesFor(
      audit,
      after,
      original,
      best,
      relevant?.key,
    )
    const availability = availabilityReason(audit, after, original)
    if (relevant) {
      const source = original.find(
        (item) => item.sessionId === relevant.sourceId,
      )
      const target = original.find(
        (item) => item.sessionId === relevant.targetId,
      )
      const sourceLabel = relevant.sourcePartId
        ? `the “${relevant.sourcePart}” part of “${name(source.session)}”`
        : `“${name(source.session)}”`
      const targetLabel = relevant.targetPartId
        ? `the “${relevant.targetPart}” part of “${name(target.session)}”`
        : `“${name(target.session)}”`
      const spacing =
        relevant.afterGap === null
          ? `${sourceLabel} now takes place after ${targetLabel} in this week.`
          : relevant.gapMinutes < 0
            ? `${sourceLabel} and ${targetLabel} previously overlapped. The revised end-to-start gap is ${formatGap(relevant.afterGap)}.`
            : `The gap from the end of ${sourceLabel} to the start of ${targetLabel} increases from ${formatGap(relevant.gapMinutes)} to ${formatGap(relevant.afterGap)}.`
      const explanation =
        relevant.basis === 'reported'
          ? relevant.reason.replace(
              'the time between',
              'the original time between',
            )
          : relevant.mechanismDetail ||
            `Both include ${relevant.mechanism}.${relevant.afterGap === null ? '' : ' This puts more time between them before the session you want to start fresh.'}`
      const sourceAfter = best.positions.find(
        (item) => item.sessionId === source.sessionId,
      )
      const sourceDay =
        positionKey(source) === positionKey(sourceAfter)
          ? dayText(audit, source.day)
          : ''
      const summarySource = relevant.sourcePartId
        ? `${sourceLabel}${sourceDay ? ` on ${sourceDay}` : ''}`
        : `${sourceDay ? `${sourceDay}’s ` : ''}${sourceLabel}`
      const summary =
        relevant.afterGap === null
          ? `Places ${sourceLabel} after ${targetLabel} in this week.`
          : relevant.gapMinutes < 0
            ? `Removes the overlap between ${sourceLabel} and ${targetLabel}.`
            : `Time after ${summarySource} increases from ${formatGap(relevant.gapMinutes)} to ${formatGap(relevant.afterGap)}.`
      return {
        sessionId: after.sessionId,
        from,
        to,
        basis: relevant.basis,
        summary,
        reason: move,
        detail: `${spacing} ${explanation}`,
        availability,
        mechanismSources: relevant.mechanismSources || [],
        beforeGap: relevant.gapMinutes,
        afterGap: relevant.afterGap,
        sourceId: relevant.sourceId,
        targetId: relevant.targetId,
        consequences,
      }
    }
    const clash = baseIssues.find((issue) =>
      issue.sessionIds.includes(after.sessionId),
    )
    const accommodated = best.moved.find(
      (other) =>
        other.sessionId !== after.sessionId &&
        overlaps(before, other, audit.weekMode === 'typical'),
    )
    const summary = clash
      ? `Removes the original timetable clash for “${name(after.session)}”.`
      : accommodated
        ? `Makes room for “${name(accommodated.session)}” on ${dayText(audit, accommodated.day)} at ${accommodated.startTime}.`
        : `Fits “${name(after.session)}” into an available slot.`
    return {
      sessionId: after.sessionId,
      from,
      to,
      basis: 'schedule',
      summary,
      reason: move,
      detail: clash
        ? `This removes the original clash: ${clash.reason}`
        : accommodated
          ? `This makes room for “${name(accommodated.session)}” on ${dayText(audit, accommodated.day)} at ${accommodated.startTime}.`
          : 'The whole session fits this available slot in the revised week.',
      availability,
      beforeGap: null,
      afterGap: null,
      sourceId: after.sessionId,
      targetId: accommodated?.sessionId || null,
      consequences,
    }
  })
}

export function planWeek(audit) {
  const analysis = analyseSchedule(audit)
  const empty = {
    sessions: copy(audit?.sessions || []),
    changes: [],
    concerns: analysis.concerns,
    remaining: analysis.concerns,
    blockers: [],
    stats: { evaluated: 0, beamWidth: BEAM_WIDTH, truncated: false },
  }
  if (!analysis.valid)
    return {
      ...empty,
      status: 'invalid',
      blockers: analysis.errors,
      summary:
        'Check the highlighted session details before rearranging this week.',
    }
  if (!audit.sessions.length)
    return {
      ...empty,
      status: 'unchanged',
      summary: 'Add your sessions to see how they fit together.',
    }
  if (!analysis.issues.length && !analysis.concerns.length)
    return {
      ...empty,
      status: 'unchanged',
      summary:
        'Your sessions fit the entered commitments. No timetable change is suggested from the details provided.',
    }
  const time = timeSystem(audit)
  const original = analysis.timeline
  const blocked = (audit.blockedWindows || []).map((window) =>
    makeWindow(window, time),
  )
  const domains = placementDomains(audit, original, time, blocked)
  const locked = original.filter((position) => fixed(position.session))
  const lockedIssues = issuesFor(audit, locked, blocked)
  const noSlot = original.filter(
    (position) => !domains.get(position.sessionId).length,
  )
  if (lockedIssues.length || noSlot.length)
    return {
      ...empty,
      status: 'blocked',
      blockers: [
        ...lockedIssues,
        ...constraints(audit, original, domains, analysis.concerns),
      ],
      summary:
        'The entered times cannot fit together with the current fixed sessions and available slots.',
    }
  const order = original
    .filter((position) => !fixed(position.session))
    .sort(
      (a, b) =>
        domains.get(a.sessionId).length - domains.get(b.sessionId).length ||
        Number(b.session.priority) - Number(a.session.priority) ||
        a.wallStart - b.wallStart ||
        a.sessionId.localeCompare(b.sessionId),
    )
  const baseline = evaluate(audit, original, original, analysis.concerns)
  let best = analysis.issues.length
    ? null
    : { positions: original, ...baseline }
  let beam = [{ positions: locked, score: [], key: '' }]
  let evaluated = 0
  let truncated = false
  // Seed complete alternatives before the bounded search, so a broad search cannot
  // discard an already available improvement when its extension budget is reached.
  const consider = (positions) => {
    if (
      evaluated++ >= MAX_EXTENSIONS ||
      issuesFor(audit, positions, blocked).length
    )
      return
    const value = evaluate(audit, positions, original, analysis.concerns)
    if (value && (!best || compare(value.score, best.score) < 0))
      best = { positions, ...value }
  }
  for (const source of order) {
    for (const destination of domains.get(source.sessionId))
      if (positionKey(source) !== positionKey(destination))
        consider(
          original.map((position) =>
            position.sessionId === source.sessionId ? destination : position,
          ),
        )
    for (const target of order) {
      if (source.sessionId >= target.sessionId) continue
      const a = domains
        .get(source.sessionId)
        .find((candidate) => positionKey(candidate) === positionKey(target))
      const b = domains
        .get(target.sessionId)
        .find((candidate) => positionKey(candidate) === positionKey(source))
      if (a && b)
        consider(
          original.map((position) =>
            position.sessionId === source.sessionId
              ? a
              : position.sessionId === target.sessionId
                ? b
                : position,
          ),
        )
    }
  }
  for (let depth = 0; depth < order.length; depth++) {
    const next = []
    for (const state of beam)
      for (const position of domains.get(order[depth].sessionId)) {
        if (evaluated++ >= MAX_EXTENSIONS) {
          truncated = true
          break
        }
        if (
          state.positions.some((other) =>
            overlaps(position, other, audit.weekMode === 'typical'),
          )
        )
          continue
        const positions = [...state.positions, position]
        const evaluatedPlan = evaluate(
          audit,
          positions,
          original,
          analysis.concerns,
        )
        if (!evaluatedPlan) continue
        if (
          order
            .slice(depth + 1)
            .some(
              (unplaced) =>
                !domains
                  .get(unplaced.sessionId)
                  .some(
                    (candidate) =>
                      !positions.some((placed) =>
                        overlaps(
                          candidate,
                          placed,
                          audit.weekMode === 'typical',
                        ),
                      ),
                  ),
            )
        )
          continue
        const key = positions
          .map((item) => `${item.sessionId}:${positionKey(item)}`)
          .join('|')
        if (depth === order.length - 1) {
          if (
            !best ||
            compare(evaluatedPlan.score, best.score) < 0 ||
            (compare(evaluatedPlan.score, best.score) === 0 &&
              key < (best.key || ''))
          )
            best = { positions, ...evaluatedPlan, key }
        } else next.push({ positions, score: evaluatedPlan.score, key })
      }
    if (truncated) break
    next.sort((a, b) => compare(a.score, b.score) || a.key.localeCompare(b.key))
    beam = next.slice(0, BEAM_WIDTH)
    if (!beam.length && depth < order.length - 1) break
  }
  const stats = {
    evaluated: Math.min(evaluated, MAX_EXTENSIONS),
    beamWidth: BEAM_WIDTH,
    truncated,
  }
  const blockers = constraints(audit, original, domains, analysis.concerns)
  if (!best)
    return {
      ...empty,
      stats,
      status: 'blocked',
      blockers: [...analysis.issues, ...blockers],
      summary:
        'No complete rearrangement was found that fits every session and your commitments. Add an available slot or edit a fixed time.',
    }
  const improved =
    best.moved.length &&
    (analysis.issues.length || compare(best.score, baseline.score) < 0)
  if (!improved)
    return {
      ...empty,
      stats,
      status: 'unchanged',
      blockers,
      summary: analysis.concerns.some((concern) => concern.needsUpdate)
        ? analysis.concerns.filter((concern) => concern.needsUpdate).length ===
          1
          ? 'Your previous answer is still selected. Check it against the changed session details below to update the timetable comparison.'
          : 'Your previous answers are still selected. Check them against the changed session details below to update the timetable comparison.'
        : analysis.concerns.length
          ? 'No rearrangement was found that improves the spacing without worsening a reported difficulty or creating another clash. Your current week is shown below.'
          : 'Your sessions fit the entered commitments. No timetable change is suggested from the details provided.',
    }
  const sessions = audit.sessions.map((session) => {
    const position = best.positions.find(
      (item) => item.sessionId === session.id,
    )
    return {
      ...copy(session),
      day: position.day,
      startTime: position.startTime,
    }
  })
  const improvedKeys = new Set(best.gains.map((item) => item.key))
  const originalKeys = new Set(analysis.concerns.map((item) => item.key))
  const remaining = best.concerns.filter(
    (item) => originalKeys.has(item.key) && !improvedKeys.has(item.key),
  )
  return {
    status: 'proposed',
    sessions,
    changes: changeDetails(audit, best, original, analysis.issues),
    concerns: analysis.concerns,
    remaining,
    blockers: [],
    summary: `${best.moved.length} ${best.moved.length === 1 ? 'session moves' : 'sessions move'}. Every session and its duration are retained.`,
    stats,
  }
}
