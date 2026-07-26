import {
  ACTION_COPY,
  DAYS,
  DOMAIN_DEFINITIONS,
  PROGRESSION_OPTIONS,
  ROLE_OPTIONS,
  SESSION_LIBRARY,
  STATUS_COPY,
  STRUCTURE_OPTIONS,
  getRole,
  getSessionType,
} from './constants.js'

const WEEK_MINUTES = 7 * 24 * 60
const PAIR_DOMAINS = ['lowerForce', 'impact', 'upperGrip', 'metabolic']
const PROTECTION_DOMAINS = ['lowerForce', 'impact', 'upperGrip', 'aerobic']
const SEVERITY_RANK = { information: 0, amber: 1, red: 2 }

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))
const numeric = (value) => {
  if (value === '' || value == null) return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

export function parseTime(value = '00:00') {
  const [hours, minutes] = String(value).split(':').map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return 0
  return clamp(hours, 0, 23) * 60 + clamp(minutes, 0, 59)
}

export function getForwardGapHours(previous, current) {
  const previousMinute = previous.day * 1440 + parseTime(previous.startTime)
  const currentMinute = current.day * 1440 + parseTime(current.startTime)
  return ((currentMinute - previousMinute + WEEK_MINUTES) % WEEK_MINUTES) / 60
}

function roleRank(role) {
  const roleOrder = {
    'priority1-direct': 5,
    'priority1-support': 4,
    priority2: 3,
    maintenance: 2,
    enjoyment: 1,
    unclear: 0,
  }
  return roleOrder[role] ?? 0
}

function progressionRank(value) {
  return { no: 0, partly: 1, yes: 2 }[value] ?? 0
}

function compareChronology(a, b) {
  return a.absoluteMinute - b.absoluteMinute
    || a.sequenceAtSameTime - b.sequenceAtSameTime
    || a.inputOrder - b.inputOrder
    || a.id.localeCompare(b.id)
}

function quantile(values, proportion) {
  const ordered = values.filter((value) => value > 0).sort((a, b) => a - b)
  if (!ordered.length) return 0
  if (ordered.length < 4) return ordered.at(-1)
  const index = (ordered.length - 1) * proportion
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return ordered[lower]
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower)
}

function normaliseSession(session, inputOrder = 0) {
  const library = getSessionType(session.type)
  const stress = Object.fromEntries(
    DOMAIN_DEFINITIONS.map(({ key }) => [
      key,
      clamp(Math.round(numeric(session.stress?.[key] ?? library.stress[key]) ?? 0), 0, 3),
    ]),
  )
  const duration = clamp(numeric(session.duration) ?? 0, 0, 360)
  const plannedRpe = clamp(numeric(session.plannedRpe) ?? 0, 0, 10)
  const actualDurationValue = numeric(session.actualDuration)
  const actualRpeValue = numeric(session.actualRpe)
  const actualDuration = actualDurationValue > 0 ? clamp(actualDurationValue, 1, 360) : null
  const actualRpe = actualRpeValue >= 1 && actualRpeValue <= 10 ? actualRpeValue : null
  const role = getRole(session.role)
  const day = clamp(Math.round(numeric(session.day) ?? 0), 0, 6)
  const startMinute = parseTime(session.startTime)
  const sequenceAtSameTime = Math.max(0, Math.round(numeric(session.sequenceAtSameTime) ?? inputOrder))

  return {
    ...session,
    inputOrder,
    day,
    startMinute,
    sequenceAtSameTime,
    absoluteMinute: day * 1440 + startMinute,
    duration,
    plannedRpe,
    actualDuration,
    actualRpe,
    alignment: role.score,
    stress,
    plannedLoad: duration * plannedRpe,
    actualLoad: actualRpe == null || actualDuration == null
      ? null
      : actualDuration * actualRpe,
    bodyAreas: Array.isArray(session.bodyAreas) ? session.bodyAreas : [],
    availableDays: Array.isArray(session.availableDays)
      ? session.availableDays.map(Number).filter((value) => value >= 0 && value <= 6)
      : [],
    label: session.name?.trim() || library.label,
  }
}

export function validateAudit(audit) {
  const errors = {}
  const profile = audit?.profile || {}
  const sessions = audit?.sessions || []

  if (!profile.priority1) errors.priority1 = 'Choose one primary outcome.'
  if (!profile.priority2) errors.priority2 = 'Choose one secondary outcome.'
  if (profile.priority1 && profile.priority1 === profile.priority2) {
    errors.priority2 = 'The secondary outcome must be different from Priority 1.'
  }
  const markers = profile.performanceMarkers || []
  if (!markers[0]?.trim() || !markers[1]?.trim()) {
    errors.performanceMarkers = 'Enter two performance markers that would demonstrate progress.'
  }
  if (sessions.length < 2) errors.sessions = 'Add at least two sessions to map the week.'

  const ids = new Set()
  const validTypes = new Set(SESSION_LIBRARY.map((item) => item.value))
  const validRoles = new Set(ROLE_OPTIONS.map((item) => item.value))
  const validProgression = new Set(PROGRESSION_OPTIONS.map((item) => item.value))
  const validStructures = new Set(STRUCTURE_OPTIONS.map((item) => item.value))
  sessions.forEach((session, index) => {
    const prefix = `session-${index}`
    if (!session.id || ids.has(session.id)) errors[`${prefix}-id`] = 'Every session requires a unique identifier.'
    ids.add(session.id)
    if (!session.name?.trim()) errors[`${prefix}-name`] = 'Name this session.'
    if (!DAYS.some((day) => day.value === Number(session.day))) {
      errors[`${prefix}-day`] = 'Choose a valid day.'
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(session.startTime || ''))) {
      errors[`${prefix}-time`] = 'Enter a valid 24-hour start time.'
    }
    if (numeric(session.duration) == null || numeric(session.duration) <= 0 || numeric(session.duration) > 360) {
      errors[`${prefix}-duration`] = 'Duration must be between 1 and 360 minutes.'
    }
    if (numeric(session.plannedRpe) == null || numeric(session.plannedRpe) < 1 || numeric(session.plannedRpe) > 10) {
      errors[`${prefix}-rpe`] = 'Planned RPE must be between 1 and 10.'
    }
    if (!validTypes.has(session.type)) errors[`${prefix}-type`] = 'Choose a supported session type.'
    if (!validRoles.has(session.role)) errors[`${prefix}-role`] = 'Choose the role of this session.'
    if (!validProgression.has(session.progression)) {
      errors[`${prefix}-progression`] = 'Choose a progression classification.'
    }
    if (!['fixed', 'movable'].includes(session.mobility)) {
      errors[`${prefix}-mobility`] = 'Choose whether the session is fixed or movable.'
    }
    if (!validStructures.has(session.structure)) {
      errors[`${prefix}-structure`] = 'Choose a valid within-session sequence.'
    }
    if (session.type === 'custom' && !session.fingerprintConfirmed) {
      errors[`${prefix}-fingerprint`] = 'Review and confirm the custom stress fingerprint.'
    }
    const actualDuration = numeric(session.actualDuration)
    const actualRpe = numeric(session.actualRpe)
    const hasActualDuration = session.actualDuration !== '' && session.actualDuration != null
    const hasActualRpe = session.actualRpe !== '' && session.actualRpe != null
    if (hasActualDuration && (actualDuration == null || actualDuration < 1 || actualDuration > 360)) {
      errors[`${prefix}-actual-duration`] = 'Actual duration must be between 1 and 360 minutes.'
    }
    if (hasActualRpe && (actualRpe == null || actualRpe < 1 || actualRpe > 10)) {
      errors[`${prefix}-actual-rpe`] = 'Actual RPE must be between 1 and 10.'
    }
    if (hasActualDuration !== hasActualRpe) {
      errors[`${prefix}-actual-load`] = 'Enter both actual duration and actual RPE.'
    }
    const reviewScores = ['soreness', 'fatigue']
    reviewScores.forEach((field) => {
      const value = session.review?.[field]
      const hasValue = value !== '' && value != null
      const score = numeric(value)
      if (hasValue && (score == null || score < 0 || score > 10)) {
        errors[`${prefix}-${field}`] = `${field === 'soreness' ? 'Soreness' : 'Fatigue'} must be between 0 and 10.`
      }
    })
    DOMAIN_DEFINITIONS.forEach(({ key }) => {
      const score = numeric(session.stress?.[key] ?? getSessionType(session.type).stress[key])
      if (score == null || score < 0 || score > 3) {
        errors[`${prefix}-${key}`] = 'Stress scores must be between 0 and 3.'
      }
    })
  })

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

function recoveryAnalysis(flags = []) {
  const normalised = flags.includes('none') ? [] : [...new Set(flags.filter((flag) => flag !== 'none'))]
  const count = normalised.length
  const status = count >= 3 ? 'limited' : count === 2 ? 'constrained' : 'normal'
  return {
    count,
    flags: normalised,
    status,
    label: status === 'limited'
      ? 'Limited context'
      : status === 'constrained'
        ? 'Constrained context'
        : 'Normal context',
    painNotice: normalised.includes('pain-changing-training'),
  }
}

function daySummaries(sessions) {
  return DAYS.map((day) => {
    const daySessions = sessions.filter((session) => session.day === day.value)
    const domains = Object.fromEntries(DOMAIN_DEFINITIONS.map(({ key }) => [
      key,
      daySessions.length ? Math.max(...daySessions.map((session) => session.stress[key])) : 0,
    ]))
    const lowStress = domains.lowerForce <= 1
      && domains.impact <= 1
      && domains.upperGrip <= 1
      && domains.metabolic <= 1
      && domains.aerobic <= 2

    return {
      ...day,
      sessions: daySessions.sort(compareChronology),
      domains,
      lowStress,
      plannedLoad: daySessions.reduce((sum, session) => sum + session.plannedLoad, 0),
      actualLoad: daySessions.every((session) => session.actualLoad != null)
        ? daySessions.reduce((sum, session) => sum + session.actualLoad, 0)
        : null,
    }
  })
}

function sharedBodyAreas(a, b) {
  const right = new Set(b.bodyAreas)
  return a.bodyAreas.filter((area) => right.has(area))
}

function sharedHighDomain(a, b) {
  return PROTECTION_DOMAINS.find((domain) => a.stress[domain] === 3 && b.stress[domain] >= 2)
}

function choosePairActor(a, b) {
  if (a.alignment !== b.alignment) return a.alignment < b.alignment ? a : b
  if (a.mobility !== b.mobility) return a.mobility === 'movable' ? a : b
  const progressionDifference = progressionRank(a.progression) - progressionRank(b.progression)
  if (progressionDifference !== 0) return progressionDifference < 0 ? a : b
  return b
}

function suggestionForDomain(domain) {
  const suggestions = {
    lowerForce: [
      'Move the lower-priority lower-body exposure.',
      'Use upper-body work or lower-volume assistance where relocation is impossible.',
    ],
    impact: [
      'Move or reduce running and jumping exposure.',
      'Use cycling or rowing for additional aerobic work where appropriate.',
    ],
    upperGrip: [
      'Reduce gripping, hanging or heavy carrying before the protected session.',
      'Use lower-body or aerobic work that does not depend on grip.',
    ],
    metabolic: [
      'Change the lower-priority exposure to easy aerobic or technical work.',
      'Preserve the hard session with the clearest progression.',
    ],
    aerobic: [
      'Review the duration and placement of the preceding endurance session.',
      'Preserve the endurance dose only if it supports the current priority.',
    ],
    freshness: [
      'Place technical or power work before conditioning.',
      'Separate substantial sessions by several hours where possible.',
    ],
  }
  return suggestions[domain] || ['Review the lower-priority session first.']
}

function collisionKey(collision) {
  return [
    collision.ruleId,
    [...(collision.sessionIds || [])].sort().join(':'),
    collision.domain || '',
  ].join('|')
}

function inferPhysicalGroup(collision) {
  if (collision.physicalGroupId) return collision.physicalGroupId
  const sessionIds = [...(collision.sessionIds || [])].sort()
  if (sessionIds.length === 2 && [
    'primary-protection',
    'same-domain',
    'optional-priority',
    'technical-sequencing',
  ].includes(collision.ruleId)) {
    return `pair:${sessionIds.join(':')}`
  }
  if (sessionIds.length === 1) return `${collision.ruleId}:${sessionIds[0]}`
  return `${collision.ruleId}:${sessionIds.join(':')}:${collision.domain || ''}`
}

function addCollision(collection, collision) {
  const groupedCollision = {
    ...collision,
    physicalGroupId: inferPhysicalGroup(collision),
  }
  const key = collisionKey(collision)
  const existing = collection.get(key)
  if (!existing || SEVERITY_RANK[groupedCollision.severity] > SEVERITY_RANK[existing.severity]) {
    collection.set(key, groupedCollision)
  }
}

function collisionGroups(collisions) {
  const groups = new Map()
  collisions.forEach((collision) => {
    const key = collision.physicalGroupId || inferPhysicalGroup(collision)
    const existing = groups.get(key)
    if (!existing || SEVERITY_RANK[collision.severity] > SEVERITY_RANK[existing.severity]) {
      groups.set(key, collision)
    }
  })
  return groups
}

function buildPairCollisions(sessions, recovery, largeThreshold) {
  const collisions = new Map()

  sessions.forEach((current) => {
    sessions.forEach((previous) => {
      if (previous.id === current.id) return
      const gapHours = getForwardGapHours(previous, current)
      if (gapHours > 48) return
      if (gapHours === 0 && compareChronology(previous, current) >= 0) return

      if (current.role === 'priority1-direct' && current.stress.freshness >= 2) {
        const domain = sharedHighDomain(previous, current)
        const sharedAreas = sharedBodyAreas(previous, current)
        const highBodyLoad = previous.plannedLoad >= largeThreshold && sharedAreas.length > 0
        const metabolic = previous.stress.metabolic === 3
        const threePlusTwoOverlap = PROTECTION_DOMAINS.find(
          (key) => Math.max(previous.stress[key], current.stress[key]) === 3
            && Math.min(previous.stress[key], current.stress[key]) === 2,
        )
        const red = gapHours <= 24 && Boolean(domain || highBodyLoad || metabolic)
        const amber = !red && (
          (gapHours > 24 && gapHours <= 48 && Boolean(domain || highBodyLoad || metabolic))
          || (gapHours <= 24 && Boolean(threePlusTwoOverlap))
        )

        if (red || amber) {
          const trigger = domain || (metabolic ? 'metabolic' : threePlusTwoOverlap || 'body-area')
          const severity = red ? 'red' : 'amber'
          const headline = `${previous.label} may compromise ${current.label}.`
          addCollision(collisions, {
            id: `primary-${previous.id}-${current.id}-${trigger}`,
            ruleId: 'primary-protection',
            severity,
            sessionIds: [previous.id, current.id],
            actorSessionId: previous.id,
            protectedSessionId: current.id,
            domain: trigger === 'body-area' ? undefined : trigger,
            gapHours,
            recoveryAmplified: severity === 'amber' && recovery.status !== 'normal',
            headline,
            explanation: trigger === 'body-area'
              ? `One of the largest sessions in this week shares ${sharedAreas.join(', ')} exposure with a direct Priority 1 session ${formatGap(gapHours)} later.`
              : `${previous.label} and ${current.label} overlap in ${domainLabel(trigger)} demand, with the Priority 1 session starting ${formatGap(gapHours)} later.`,
            suggestions: suggestionForDomain(trigger),
          })
        }
      }

      if (gapHours <= 24) {
        PAIR_DOMAINS.forEach((domain) => {
          const high = Math.max(previous.stress[domain], current.stress[domain])
          const low = Math.min(previous.stress[domain], current.stress[domain])
          const severity = high === 3 && low === 3
            ? 'red'
            : high === 3 && low === 2
              ? 'amber'
              : null
          if (!severity) return
          const actor = choosePairActor(previous, current)
          addCollision(collisions, {
            id: `same-${domain}-${previous.id}-${current.id}`,
            ruleId: 'same-domain',
            severity,
            sessionIds: [previous.id, current.id],
            actorSessionId: actor.id,
            domain,
            gapHours,
            recoveryAmplified: severity === 'amber' && recovery.status !== 'normal',
            headline: `${domainLabel(domain)} repeats within ${formatGap(gapHours)}.`,
            explanation: `${previous.label} scores ${previous.stress[domain]} and ${current.label} scores ${current.stress[domain]} for ${domainLabel(domain).toLowerCase()}.`,
            suggestions: suggestionForDomain(domain),
          })
        })
      }

      const separationHours = Math.max(0, gapHours - previous.duration / 60)
      if (current.stress.freshness === 3 && separationHours < 3) {
        const demandingDomain = PAIR_DOMAINS.find(
          (domain) => previous.stress[domain] === 3 && current.stress[domain] >= 2,
        )
        if (demandingDomain) {
          addCollision(collisions, {
            id: `technical-gap-${previous.id}-${current.id}`,
            ruleId: 'technical-sequencing',
            severity: 'red',
            sessionIds: [previous.id, current.id],
            actorSessionId: previous.id,
            protectedSessionId: current.id,
            domain: demandingDomain,
            gapHours: separationHours,
            recoveryAmplified: false,
            headline: `${current.label} begins without a meaningful separation from demanding work.`,
            explanation: `${previous.label} ends approximately ${formatGap(separationHours)} before a freshness-dependent session and overlaps in ${domainLabel(demandingDomain).toLowerCase()}.`,
            suggestions: suggestionForDomain('freshness'),
          })
        }
      }
    })
  })

  sessions.forEach((session) => {
    if (session.stress.freshness !== 3) return
    if (session.structure === 'conditioning-then-technical') {
      addCollision(collisions, {
        id: `technical-before-${session.id}`,
        ruleId: 'technical-sequencing',
        severity: 'red',
        sessionIds: [session.id],
        actorSessionId: session.id,
        protectedSessionId: session.id,
        domain: 'freshness',
        gapHours: 0,
        recoveryAmplified: false,
        headline: `${session.label} places hard conditioning before technical or power work.`,
        explanation: 'The freshness-dependent work is being asked to absorb fatigue created earlier in the same session.',
        suggestions: suggestionForDomain('freshness'),
      })
    } else if (session.structure === 'technical-then-conditioning' && session.stress.metabolic >= 2) {
      addCollision(collisions, {
        id: `technical-after-${session.id}`,
        ruleId: 'technical-sequencing',
        severity: 'amber',
        sessionIds: [session.id],
        actorSessionId: session.id,
        protectedSessionId: session.id,
        domain: 'freshness',
        gapHours: 0,
        recoveryAmplified: recovery.status !== 'normal',
        headline: `${session.label} combines technical work with substantial conditioning.`,
        explanation: 'Technical work occurs first, but the combined session may still affect explosive-strength development when repeated frequently.',
        suggestions: suggestionForDomain('freshness'),
      })
    }
  })

  return collisions
}

function formatGap(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`
  const rounded = Math.round(hours * 10) / 10
  return `${rounded} hour${rounded === 1 ? '' : 's'}`
}

function domainLabel(domain) {
  return DOMAIN_DEFINITIONS.find((item) => item.key === domain)?.label || domain
}

function consecutiveDayWindows(days, predicate) {
  const windows = []
  for (let start = 0; start < 7; start += 1) {
    const values = [0, 1, 2].map((offset) => days[(start + offset) % 7])
    if (values.every(predicate)) windows.push(values)
  }
  return windows
}

function buildDensityCollisions(sessions, days, recovery, existing) {
  const collisions = new Map(existing)

  PAIR_DOMAINS.forEach((domain) => {
    const windows = consecutiveDayWindows(days, (day) => day.domains[domain] >= 2)
    if (!windows.length) return
    const window = windows[0]
    const sessionIds = window.flatMap((day) => day.sessions.filter((session) => session.stress[domain] >= 2).map((session) => session.id))
    const actor = sessionIds.map((id) => sessions.find((session) => session.id === id)).filter(Boolean).sort((a, b) => {
      return a.alignment - b.alignment
        || (a.mobility === 'movable' ? -1 : 1) - (b.mobility === 'movable' ? -1 : 1)
        || progressionRank(a.progression) - progressionRank(b.progression)
        || b.plannedLoad - a.plannedLoad
    })[0]
    addCollision(collisions, {
      id: `density-${domain}-${window.map((day) => day.value).join('-')}`,
      ruleId: `${domain}-density`,
      severity: 'amber',
      sessionIds,
      actorSessionId: actor?.id,
      domain,
      recoveryAmplified: recovery.status !== 'normal',
      headline: `${domainLabel(domain)} is substantial on three consecutive days.`,
      explanation: `${window.map((day) => day.short).join(', ')} each reach at least 2 for ${domainLabel(domain).toLowerCase()}.`,
      suggestions: suggestionForDomain(domain),
    })
  })

  const metabolicSessions = sessions.filter((session) => session.stress.metabolic === 3)
  const consecutivePairs = DAYS.map(({ value }) => {
    const currentDay = days[value]
    const nextDay = days[(value + 1) % 7]
    if (currentDay.domains.metabolic !== 3 || nextDay.domains.metabolic !== 3) return null
    const pairSessions = [...currentDay.sessions, ...nextDay.sessions]
      .filter((session) => session.stress.metabolic === 3)
    return {
      days: [currentDay, nextDay],
      sessions: pairSessions,
      includesPriority: pairSessions.some((session) => session.role === 'priority1-direct'),
    }
  }).filter(Boolean)
  const priorityPair = consecutivePairs.find((pair) => pair.includesPriority)

  const lowerMetabolicSessions = metabolicSessions.filter((session) => session.stress.lowerForce >= 2)
  const orderedHard = lowerMetabolicSessions.map((session) => ({
    session,
    minute: session.absoluteMinute,
  }))
  const wrappedHard = [
    ...orderedHard,
    ...orderedHard.map((item) => ({ ...item, minute: item.minute + WEEK_MINUTES })),
  ]
  const hasLowDayBetween = (fromMinute, toMinute) => {
    const fromDay = Math.floor(fromMinute / 1440)
    const toDay = Math.floor(toMinute / 1440)
    for (let day = fromDay + 1; day < toDay; day += 1) {
      if (days[day % 7].lowStress) return true
    }
    return false
  }
  const denseTriplet = orderedHard.length >= 3
    ? wrappedHard.slice(0, orderedHard.length).map((first, index) => {
      const second = wrappedHard[index + 1]
      const third = wrappedHard[index + 2]
      if (!second || !third || third.minute - first.minute >= WEEK_MINUTES) return null
      return !hasLowDayBetween(first.minute, second.minute)
        && !hasLowDayBetween(second.minute, third.minute)
        ? [first.session, second.session, third.session]
        : null
    }).find(Boolean)
    : null

  if (priorityPair && recovery.status !== 'normal') {
    const actor = priorityPair.sessions
      .filter((session) => session.role !== 'priority1-direct')
      .sort((a, b) => a.alignment - b.alignment
        || (a.mobility === 'movable' ? -1 : 1) - (b.mobility === 'movable' ? -1 : 1)
        || b.plannedLoad - a.plannedLoad)[0]
    addCollision(collisions, {
      id: 'metabolic-density-priority',
      ruleId: 'metabolic-density',
      severity: 'red',
      sessionIds: priorityPair.sessions.map((session) => session.id),
      actorSessionId: actor?.id,
      domain: 'metabolic',
      recoveryAmplified: true,
      headline: 'High-intensity metabolic work occurs on consecutive days in a constrained week.',
      explanation: 'At least one exposure directly develops Priority 1, so lower-priority hard work should be reviewed first.',
      suggestions: suggestionForDomain('metabolic'),
    })
  } else if (denseTriplet) {
    const actor = denseTriplet
      .sort((a, b) => a.alignment - b.alignment
        || (a.mobility === 'movable' ? -1 : 1) - (b.mobility === 'movable' ? -1 : 1)
        || progressionRank(a.progression) - progressionRank(b.progression)
        || b.plannedLoad - a.plannedLoad)[0]
    addCollision(collisions, {
      id: 'metabolic-density-week',
      ruleId: 'metabolic-density',
      severity: 'amber',
      sessionIds: denseTriplet.map((session) => session.id),
      actorSessionId: actor?.id,
      domain: 'metabolic',
      recoveryAmplified: recovery.status !== 'normal',
      headline: 'Three or more high-intensity sessions are also lower-body dominant.',
      explanation: 'Review whether each exposure has a distinct role and whether the priority sessions are progressing.',
      suggestions: suggestionForDomain('metabolic'),
    })
  }

  return collisions
}

function addRunWarnings(sessions, recovery, existing) {
  const collisions = new Map(existing)
  sessions.forEach((session) => {
    const distance = numeric(session.runDistance)
    const baseline = numeric(session.longestRun30)
    if (distance == null || distance <= 0) return
    if (baseline == null || baseline <= 0) {
      addCollision(collisions, {
        id: `run-baseline-${session.id}`,
        ruleId: 'running-baseline',
        severity: 'information',
        sessionIds: [session.id],
        actorSessionId: session.id,
        recoveryAmplified: false,
        headline: `${session.label} has no usable 30-day distance reference.`,
        explanation: 'A running-distance novelty comparison cannot be calculated without a positive recent longest-run value.',
        suggestions: ['Enter the longest run completed during the previous 30 days.'],
      })
      return
    }
    const ratio = distance / baseline
    if (ratio <= 1.1) return
    addCollision(collisions, {
      id: `run-novelty-${session.id}`,
      ruleId: 'running-novelty',
      severity: 'amber',
      sessionIds: [session.id],
      actorSessionId: session.id,
      protectedSessionId: session.role === 'priority1-direct' ? session.id : undefined,
      domain: 'impact',
      recoveryAmplified: recovery.status !== 'normal',
      headline: `${session.label} is ${Math.round((ratio - 1) * 100)}% longer than the recent longest run.`,
      explanation: 'This identifies a reason to review the size of the individual session. It does not predict that injury will occur.',
      suggestions: [
        'Review whether the increase is necessary this week.',
        'Reduce, split or delay the additional distance where appropriate.',
      ],
      ratio,
    })
  })
  return collisions
}

function addOptionalPriorityWarnings(sessions, totalLoad, existing) {
  const collisions = new Map(existing)
  const primary = [...collisions.values()].filter(
    (collision) => collision.ruleId === 'primary-protection' && collision.severity === 'red',
  )
  primary.forEach((collision) => {
    const actor = sessions.find((session) => session.id === collision.actorSessionId)
    if (!actor || actor.alignment > 1 || actor.mobility !== 'movable') return
    const substantialShare = totalLoad > 0 && actor.plannedLoad / totalLoad >= 0.1
    if (!substantialShare && !actor.largeWithinWeek) return
    addCollision(collisions, {
      id: `optional-priority-${actor.id}-${collision.protectedSessionId}`,
      ruleId: 'optional-priority',
      severity: 'red',
      sessionIds: [actor.id, collision.protectedSessionId],
      actorSessionId: actor.id,
      protectedSessionId: collision.protectedSessionId,
      domain: collision.domain,
      gapHours: collision.gapHours,
      recoveryAmplified: false,
      headline: `${actor.label} is lower priority but consumes substantial load before Priority 1.`,
      explanation: 'The session may have value. Its current position asks the primary session to absorb its fatigue cost.',
      suggestions: ['Move it first.', 'If relocation is impossible, reduce it, change the modality or rotate it.'],
    })
  })
  return collisions
}

function addLowStressWarning(sessions, days, recovery, existing, review) {
  const collisions = new Map(existing)
  if (days.some((day) => day.lowStress)) return collisions
  const uniqueGroups = collisionGroups(
    [...collisions.values()].filter((collision) => collision.severity !== 'information'),
  )
  const priorityFalling = review.priorityWorse >= 1
  const red = recovery.status === 'limited' || uniqueGroups.size >= 3 || priorityFalling
  const actor = [...sessions].sort((a, b) => {
    return a.alignment - b.alignment
      || (a.mobility === 'movable' ? -1 : 1) - (b.mobility === 'movable' ? -1 : 1)
      || progressionRank(a.progression) - progressionRank(b.progression)
      || b.plannedLoad - a.plannedLoad
  })[0]
  addCollision(collisions, {
    id: 'no-low-stress-day',
    ruleId: 'no-low-stress-day',
    severity: red ? 'red' : 'amber',
    sessionIds: sessions.map((session) => session.id),
    actorSessionId: actor?.id,
    recoveryAmplified: recovery.status !== 'normal',
    headline: 'The week contains no usable low-stress day.',
    explanation: 'An easy aerobic session can remain on a low-stress day, but every day currently includes substantial mechanical, impact, grip or metabolic demand.',
    suggestions: ['Create one day where lower-force, impact, grip and metabolic demand stay at 0 or 1.'],
  })
  return collisions
}

function progressionAnalysis(sessions, totalLoad, collisions) {
  const progressivePriority = sessions.filter(
    (session) => session.role === 'priority1-direct' && session.progression === 'yes',
  )
  const unstructuredLoad = sessions
    .filter((session) => session.progression === 'no')
    .reduce((sum, session) => sum + session.plannedLoad, 0)
  const unstructuredShare = totalLoad > 0 ? unstructuredLoad / totalLoad : null
  const progressivePriorityIds = new Set(progressivePriority.map((session) => session.id))
  const lowerPriorityCollisionActors = new Set(collisions
    .filter((collision) => collision.severity !== 'information'
      && progressivePriorityIds.has(collision.protectedSessionId))
    .map((collision) => collision.actorSessionId)
    .filter(Boolean))
  const surroundingLowerPriority = sessions.filter(
    (session) => session.alignment <= 2 && lowerPriorityCollisionActors.has(session.id),
  ).length
  const status = progressivePriority.length === 0
    ? 'red'
    : progressivePriority.length === 1 && surroundingLowerPriority >= 2
      ? 'amber'
      : 'clear'
  const shareLabel = unstructuredShare == null
    ? 'No weekly load entered'
    : unstructuredShare < 0.25
      ? 'Most weekly work has a defined progression'
      : unstructuredShare < 0.5
        ? 'A meaningful amount of weekly load is unstructured'
        : 'Unstructured sessions account for most weekly load'

  return {
    progressivePriority,
    unstructuredLoad,
    unstructuredShare,
    shareLabel,
    status,
  }
}

function reviewAnalysis(sessions) {
  const reviewed = sessions.filter(
    (session) => session.actualRpe != null && session.actualDuration != null,
  )
  const warnings = sessions.filter((session) => {
    if (session.actualRpe == null) return false
    const rpeAbovePlan = session.actualRpe >= session.plannedRpe + 2
    const loadAbovePlan = session.actualLoad != null
      && session.plannedLoad > 0
      && session.actualLoad >= session.plannedLoad * 1.25
    return rpeAbovePlan || loadAbovePlan
  })
  const priorityWorse = sessions.filter(
    (session) => session.role === 'priority1-direct' && session.review?.performance === 'worse',
  ).length
  const pain = sessions.filter((session) => session.review?.painChangesMovement)
  const coverage = sessions.length ? reviewed.length / sessions.length : 0
  const completeEnough = coverage >= 0.8
  return {
    reviewed,
    coverage,
    completeEnough,
    warnings,
    weeklyAbovePlan: warnings.length >= 2,
    priorityWorse,
    pain,
    plannedTotal: sessions.reduce((sum, session) => sum + session.plannedLoad, 0),
    actualTotal: coverage === 1
      ? sessions.reduce((sum, session) => sum + (session.actualLoad ?? 0), 0)
      : null,
  }
}

function dilutionAnalysis(sessions, progression, collisions) {
  const directPriorityLoad = sessions
    .filter((session) => session.role === 'priority1-direct')
    .reduce((sum, session) => sum + session.plannedLoad, 0)
  const lowAlignmentLoad = sessions
    .filter((session) => session.alignment <= 1)
    .reduce((sum, session) => sum + session.plannedLoad, 0)
  const priority2Progressive = sessions.filter(
    (session) => session.role === 'priority2' && session.progression === 'yes',
  ).length
  const highestLoad = [...sessions].sort((a, b) => b.plannedLoad - a.plannedLoad)[0]
  const optionalActors = collisions.filter(
    (collision) => collision.ruleId === 'primary-protection'
      && sessions.find((session) => session.id === collision.actorSessionId)?.alignment <= 1,
  ).length
  const conditions = [
    priority2Progressive > progression.progressivePriority.length,
    lowAlignmentLoad > directPriorityLoad,
    highestLoad && highestLoad.alignment <= 1,
    optionalActors >= 2,
  ]
  return {
    active: conditions.filter(Boolean).length >= 2,
    conditions,
    directPriorityLoad,
    lowAlignmentLoad,
  }
}

function actionResults(sessions, collisions) {
  const actorCollisions = new Map()
  collisions
    .filter((collision) => collision.actorSessionId && collision.severity !== 'information')
    .forEach((collision) => {
      const current = actorCollisions.get(collision.actorSessionId) || []
      current.push(collision)
      actorCollisions.set(collision.actorSessionId, current)
    })

  return Object.fromEntries(sessions.map((session) => {
    const sessionCollisions = actorCollisions.get(session.id) || []
    const redActor = sessionCollisions.some((collision) => collision.severity === 'red')
    let action = 'keep'
    if (session.role === 'priority1-direct' && session.progression === 'yes') {
      action = 'protect'
    } else if (redActor && session.alignment <= 1) {
      action = 'remove-or-rotate'
    } else if (sessionCollisions.length && session.mobility === 'movable') {
      action = 'move'
    } else if (sessionCollisions.length && session.mobility === 'fixed') {
      action = 'modify'
    } else if (
      session.alignment === 0
      || (session.role === 'priority1-direct' && session.progression !== 'yes')
      || (session.alignment <= 1 && session.progression === 'no')
    ) {
      action = 'review'
    }
    return [session.id, {
      action,
      ...ACTION_COPY[action],
      collisions: sessionCollisions,
      secondary: session.role === 'priority1-direct'
        && collisions.some((collision) => collision.actorSessionId === session.id && collision.ruleId === 'running-novelty')
          ? 'Protect the role of this session while reviewing its distance.'
          : '',
    }]
  }))
}

function overallStatus({ sessions, collisions, recovery, progression, review, dilution }) {
  const groupedCollisions = [...collisionGroups(collisions).values()]
  const red = groupedCollisions.filter((collision) => collision.severity === 'red')
  const amber = groupedCollisions.filter((collision) => collision.severity === 'amber')
  const meaningfulCollisionGroups = groupedCollisions.filter(
    (collision) => collision.severity !== 'information',
  )
  const recoveryMismatch = recovery.status !== 'normal'
    && meaningfulCollisionGroups.length >= 2
    && (review.weeklyAbovePlan || review.priorityWorse >= 2 || review.pain.length > 0)
  if (recoveryMismatch) return 'recovery'
  if (dilution.active) return 'dilution'
  if (progression.status === 'red') return 'progression'
  const lowerGroups = collisionGroups(collisions.filter(
    (collision) => collision.ruleId !== 'running-novelty'
      && collision.ruleId !== 'running-baseline'
      && collision.severity !== 'information'
      && (collision.domain === 'lowerForce' || collision.domain === 'impact'),
  ))
  if (lowerGroups.size >= 2) return 'lower-body'
  if (collisions.some((collision) => collision.ruleId === 'metabolic-density')) return 'metabolic'

  const structuralCollisions = collisions.filter(
    (collision) => collision.ruleId !== 'running-novelty'
      && collision.ruleId !== 'running-baseline'
      && collision.severity !== 'information',
  )
  const usefulShare = sessions.length
    ? sessions.filter((session) => session.alignment >= 2).length / sessions.length
    : 0
  if (usefulShare > 0.5 && structuralCollisions.length) return 'sequencing'
  if (collisions.some((collision) => collision.ruleId === 'running-novelty' && collision.protectedSessionId)) return 'running'

  const priorityCompromised = collisions.some(
    (collision) => collision.ruleId === 'primary-protection' && collision.severity === 'red',
  )
  if (!red.length && amber.length <= 2 && progression.progressivePriority.length && !priorityCompromised) {
    return 'coherent'
  }
  return 'review'
}

function findingOrder(collision) {
  const ruleRank = {
    'primary-protection': 10,
    'technical-sequencing': 9,
    'optional-priority': 8,
    'running-novelty': 7,
    'same-domain': 6,
    'metabolic-density': 5,
    'lowerForce-density': 4,
    'impact-density': 4,
    'upperGrip-density': 4,
    'no-low-stress-day': 3,
  }
  return (SEVERITY_RANK[collision.severity] || 0) * 100 + (ruleRank[collision.ruleId] || 0)
}

function chooseMainFinding(collisions, sessions) {
  return [...collisions].sort((a, b) => {
    const rule = findingOrder(b) - findingOrder(a)
    if (rule) return rule
    const aProtected = sessions.find((session) => session.id === a.protectedSessionId)
    const bProtected = sessions.find((session) => session.id === b.protectedSessionId)
    const alignment = (bProtected?.alignment || 0) - (aProtected?.alignment || 0)
    if (alignment) return alignment
    const aActor = sessions.find((session) => session.id === a.actorSessionId)
    const bActor = sessions.find((session) => session.id === b.actorSessionId)
    return (bActor?.plannedLoad || 0) - (aActor?.plannedLoad || 0)
  })[0] || null
}

function collisionTuple(analysis) {
  const groups = collisionGroups(analysis.collisions)
  const grouped = [...groups.values()]
  const priorityRedGroups = new Set(analysis.collisions
    .filter((collision) => collision.ruleId === 'primary-protection' && collision.severity === 'red')
    .map((collision) => collision.physicalGroupId))
  const priorityRed = priorityRedGroups.size
  const red = grouped.filter((collision) => collision.severity === 'red').length
  const amplifiedAmber = grouped.filter(
    (collision) => collision.severity === 'amber' && collision.recoveryAmplified,
  ).length
  const amber = grouped.filter((collision) => collision.severity === 'amber').length
  const noLow = analysis.collisions.some((collision) => collision.ruleId === 'no-low-stress-day') ? 1 : 0
  return [priorityRed, red, amplifiedAmber, amber, noLow]
}

function compareTuple(a, b) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

function intervalsOverlapAcrossWeek(a, b) {
  const aStart = a.day * 1440 + parseTime(a.startTime)
  const bStart = b.day * 1440 + parseTime(b.startTime)
  const aEnd = aStart + Math.max(1, Number(a.duration) || 1)
  const bDuration = Math.max(1, Number(b.duration) || 1)
  return [-WEEK_MINUTES, 0, WEEK_MINUTES].some((shift) => {
    const shiftedStart = bStart + shift
    const shiftedEnd = shiftedStart + bDuration
    return aStart < shiftedEnd && shiftedStart < aEnd
  })
}

function buildRevision(audit, analysis) {
  const actorId = analysis.mainFinding?.actorSessionId
  const actor = analysis.sessions.find((session) => session.id === actorId)
  if (!actor) {
    return {
      status: 'unchanged',
      actorId: null,
      message: 'No single session needs to be moved from this audit.',
      sessions: analysis.sessions,
    }
  }
  const action = analysis.actions[actor.id]?.action
  if (action === 'remove-or-rotate') {
    return {
      status: 'rotate',
      actorId: actor.id,
      message: `Test the week without automatically adding ${actor.label}.`,
      sessions: analysis.sessions.filter((session) => session.id !== actor.id),
    }
  }
  if (action === 'review') {
    return {
      status: 'manual',
      actorId: actor.id,
      message: analysis.status === 'progression'
        ? `Define one measurable progression variable for ${actor.label} before changing the weekly structure.`
        : `Clarify the purpose, progression and required frequency of ${actor.label} before moving or removing it.`,
      sessions: analysis.sessions,
    }
  }
  if (action !== 'move') {
    return {
      status: 'modify',
      actorId: actor.id,
      message: `${actor.label} should remain in place until its stress fingerprint or dose is deliberately modified.`,
      sessions: analysis.sessions,
    }
  }
  if (!actor.availableDays.length) {
    return {
      status: 'manual',
      actorId: actor.id,
      message: `Choose a feasible alternative day for ${actor.label}. No new day has been invented without your availability.`,
      sessions: analysis.sessions,
    }
  }

  const baseTuple = collisionTuple(analysis)
  const candidates = actor.availableDays
    .filter((day) => day !== actor.day)
    .filter((day) => !analysis.sessions.some((session) => (
      session.id !== actor.id
      && intervalsOverlapAcrossWeek({ ...actor, day }, session)
    )))
    .map((day) => {
      const candidateAudit = {
        ...audit,
        sessions: audit.sessions.map((session) => session.id === actor.id ? { ...session, day } : session),
      }
      const candidate = analyseWeek(candidateAudit, { skipRevision: true, skipValidation: true })
      return {
        day,
        analysis: candidate,
        tuple: collisionTuple(candidate),
        forwardDistance: (day - actor.day + 7) % 7,
      }
    })
    .filter((candidate) => compareTuple(candidate.tuple, baseTuple) < 0)
    .sort((a, b) => compareTuple(a.tuple, b.tuple)
      || a.forwardDistance - b.forwardDistance
      || a.day - b.day)

  if (!candidates.length) {
    return {
      status: 'manual',
      actorId: actor.id,
      message: `The available days entered for ${actor.label} do not improve the collision pattern. Review the session dose or add another feasible slot.`,
      sessions: analysis.sessions,
    }
  }

  const best = candidates[0]
  return {
    status: 'moved',
    actorId: actor.id,
    fromDay: actor.day,
    toDay: best.day,
    message: `Test moving ${actor.label} from ${DAYS[actor.day].label} to ${DAYS[best.day].label}.`,
    sessions: best.analysis.sessions,
  }
}

function coachingRoute({ status, recovery, collisions, progression }) {
  const structureIssue = ['sequencing', 'lower-body', 'metabolic', 'progression', 'dilution', 'review'].includes(status)
    || collisions.some((collision) => collision.severity === 'red')
    || progression.status !== 'clear'
  const nutritionContext = recovery.flags.some((flag) => [
    'calorie-deficit',
    'rapid-weight-loss',
    'hunger-recovery',
    'low-sleep',
    'high-stress',
  ].includes(flag))
  if (structureIssue && nutritionContext) {
    return {
      name: 'Rx+',
      price: '£250 per month',
      label: 'Integrated training and nutrition',
      reason: 'The map identifies programming decisions alongside nutrition or recovery constraints that need managing together.',
    }
  }
  if (structureIssue) {
    return {
      name: 'Rx',
      price: '£149 per month',
      label: 'Training Focus',
      reason: 'The main issue is session structure, progression, sequencing or coordination across disciplines.',
    }
  }
  if (nutritionContext) {
    return {
      name: 'Rx',
      price: '£149 per month',
      label: 'Nutrition Focus',
      reason: 'The week is broadly coherent, while fuelling, recovery or lifestyle context deserves closer interpretation.',
    }
  }
  if (recovery.status !== 'normal') {
    return {
      name: 'Review',
      price: 'No automatic prescription',
      label: 'Recovery context requires review',
      reason: 'Illness, pain, travel or return from time away should be interpreted directly rather than used to infer a nutrition requirement.',
    }
  }
  return {
    name: 'Review',
    price: 'No automatic prescription',
    label: 'Keep monitoring',
    reason: 'This audit does not identify a clear reason to change the programme or recommend a coaching tier automatically.',
  }
}

export function analyseWeek(audit, options = {}) {
  const validation = options.skipValidation ? { valid: true, errors: {} } : validateAudit(audit)
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      sessions: [],
      collisions: [],
    }
  }

  const recovery = recoveryAnalysis(audit.profile?.recoveryFlags)
  let sessions = (audit.sessions || []).map(normaliseSession).sort(compareChronology)
  const totalLoad = sessions.reduce((sum, session) => sum + session.plannedLoad, 0)
  const largeThreshold = quantile(sessions.map((session) => session.plannedLoad), 0.75)
  sessions = sessions.map((session) => ({
    ...session,
    loadShare: totalLoad > 0 ? session.plannedLoad / totalLoad : 0,
    largeWithinWeek: session.plannedLoad >= largeThreshold && session.plannedLoad > 0,
  }))
  const days = daySummaries(sessions)
  const review = reviewAnalysis(sessions)
  let collisionMap = buildPairCollisions(sessions, recovery, largeThreshold)
  collisionMap = buildDensityCollisions(sessions, days, recovery, collisionMap)
  collisionMap = addRunWarnings(sessions, recovery, collisionMap)
  collisionMap = addOptionalPriorityWarnings(sessions, totalLoad, collisionMap)
  collisionMap = addLowStressWarning(sessions, days, recovery, collisionMap, review)
  const collisions = [...collisionMap.values()].sort((a, b) => {
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || findingOrder(b) - findingOrder(a)
  })
  const progression = progressionAnalysis(sessions, totalLoad, collisions)
  const dilution = dilutionAnalysis(sessions, progression, collisions)
  const actions = actionResults(sessions, collisions)
  const status = overallStatus({ sessions, collisions, recovery, progression, review, dilution })
  let mainFinding = chooseMainFinding(collisions, sessions)
  if (status === 'progression') {
    const actor = sessions
      .filter((session) => session.role === 'priority1-direct')
      .sort((a, b) => progressionRank(a.progression) - progressionRank(b.progression) || b.plannedLoad - a.plannedLoad)[0]
    mainFinding = {
      id: 'progression-finding',
      ruleId: 'progression',
      severity: 'red',
      sessionIds: actor ? [actor.id] : [],
      actorSessionId: actor?.id,
      headline: 'Priority 1 has no session with a defined progression.',
      explanation: 'Choose one variable such as load, repetitions, pace, distance, interval structure or skill complexity and state how it should change.',
      suggestions: ['Add one measurable progression to the direct Priority 1 work before adding more weekly stress.'],
    }
  } else if (status === 'dilution') {
    const actor = [...sessions]
      .filter((session) => session.alignment <= 1)
      .sort((a, b) => b.plannedLoad - a.plannedLoad || progressionRank(a.progression) - progressionRank(b.progression))[0]
    mainFinding = {
      id: 'dilution-finding',
      ruleId: 'priority-dilution',
      severity: 'amber',
      sessionIds: actor ? [actor.id] : [],
      actorSessionId: actor?.id,
      headline: 'Lower-priority work is consuming more of the week than the goal hierarchy supports.',
      explanation: 'Reclassify the week before removing sessions. One outcome should improve, one may improve or maintain, and the remaining work should support, maintain or rotate.',
      suggestions: ['Review the purpose and frequency of the largest low-alignment session first.'],
    }
  } else if (status === 'running') {
    mainFinding = collisions
      .filter((collision) => collision.ruleId === 'running-novelty' && collision.protectedSessionId)
      .sort((a, b) => (b.ratio || 0) - (a.ratio || 0))[0] || mainFinding
  }
  const protectedSessions = sessions
    .filter((session) => actions[session.id]?.action === 'protect')
    .sort((a, b) => b.plannedLoad - a.plannedLoad)
  const keepSessions = sessions
    .filter((session) => actions[session.id]?.action === 'keep' && session.alignment >= 2)
    .sort((a, b) => b.alignment - a.alignment || b.plannedLoad - a.plannedLoad)
  const safeProtectedSessions = protectedSessions.filter(
    (session) => !collisions.some(
      (collision) => collision.actorSessionId === session.id && collision.severity !== 'information',
    ),
  )
  const grouped = [...collisionGroups(collisions).values()]
  const analysis = {
    valid: true,
    errors: {},
    status,
    statusCopy: STATUS_COPY[status],
    profile: audit.profile,
    sessions,
    days,
    collisions,
    recovery,
    progression,
    review,
    dilution,
    actions,
    totalLoad,
    actualTotal: review.actualTotal,
    mainFinding,
    sessionToProtect: protectedSessions[0] || null,
    leaveUnchanged: keepSessions[0] || safeProtectedSessions[0] || null,
    coaching: null,
    revisedWeek: null,
    metrics: {
      totalLoad,
      priorityLoad: sessions
        .filter((session) => session.role === 'priority1-direct')
        .reduce((sum, session) => sum + session.plannedLoad, 0),
      unstructuredShare: progression.unstructuredShare,
      redCollisions: grouped.filter((collision) => collision.severity === 'red').length,
      amberCollisions: grouped.filter((collision) => collision.severity === 'amber').length,
      lowStressDays: days.filter((day) => day.lowStress).length,
    },
  }
  analysis.coaching = coachingRoute(analysis)
  analysis.revisedWeek = options.skipRevision ? null : buildRevision(audit, analysis)
  return analysis
}

export function formatLoad(value) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString('en-GB') : 'Not available'
}

export function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'Not available'
}
