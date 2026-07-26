import assert from 'node:assert/strict'
import test from 'node:test'

import { HYROX_EXAMPLE, newSession } from './constants.js'
import { analyseWeek, getForwardGapHours, validateAudit } from './engine.js'

const profile = {
  priority1: 'Running performance',
  priority2: 'Maximal strength',
  maintenanceGoals: [],
  performanceMarkers: ['Five-kilometre time', 'Five-repetition back squat'],
  enjoymentSessions: '',
  fixedSessions: '',
  removeFirst: '',
  recoveryFlags: [],
  bodyConcerns: [],
}

function session(id, overrides = {}) {
  return newSession({
    id,
    name: id,
    type: 'lower-strength',
    duration: 60,
    plannedRpe: 7,
    role: 'priority1-support',
    progression: 'yes',
    ...overrides,
  })
}

function audit(sessions, profileOverrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'plan',
    currentStep: 2,
    profile: { ...profile, ...profileOverrides },
    sessions,
  }
}

test('calculates the circular Sunday-to-Monday gap', () => {
  const sunday = { day: 6, startTime: '20:00' }
  const monday = { day: 0, startTime: '18:00' }
  assert.equal(getForwardGapHours(sunday, monday), 22)
})

test('protects a Monday priority session from a Sunday collision', () => {
  const result = analyseWeek(audit([
    session('monday-priority', {
      day: 0,
      startTime: '18:00',
      role: 'priority1-direct',
    }),
    session('sunday-load', {
      day: 6,
      startTime: '20:00',
      role: 'maintenance',
      progression: 'no',
    }),
  ]))

  const collision = result.collisions.find((item) => item.ruleId === 'primary-protection')
  assert.equal(collision?.severity, 'red')
  assert.equal(collision?.actorSessionId, 'sunday-load')
  assert.equal(result.actions['monday-priority'].action, 'protect')
})

test('keeps a 3 plus 2 same-domain overlap amber in constrained context', () => {
  const result = analyseWeek(audit([
    session('long-run', {
      day: 0,
      type: 'long-run',
      role: 'priority1-support',
    }),
    session('easy-run', {
      day: 1,
      startTime: '12:00',
      type: 'easy-run',
      role: 'priority1-support',
    }),
  ], {
    recoveryFlags: ['low-sleep', 'high-stress'],
  }))

  const impact = result.collisions.find(
    (item) => item.ruleId === 'same-domain' && item.domain === 'impact',
  )
  assert.equal(impact?.severity, 'amber')
  assert.equal(impact?.recoveryAmplified, true)
})

test('applies the running novelty warning only above 10 percent', () => {
  const exact = analyseWeek(audit([
    session('exact-run', {
      type: 'long-run',
      role: 'priority1-direct',
      runDistance: 11,
      longestRun30: 10,
    }),
    session('support', { day: 3 }),
  ]))
  assert.equal(exact.collisions.some((item) => item.ruleId === 'running-novelty'), false)

  const above = analyseWeek(audit([
    session('above-run', {
      type: 'long-run',
      role: 'priority1-direct',
      runDistance: 11.01,
      longestRun30: 10,
    }),
    session('support', { day: 3 }),
  ]))
  const warning = above.collisions.find((item) => item.ruleId === 'running-novelty')
  assert.ok(warning)
  assert.ok(warning.ratio > 1.1)
})

test('reports missing running history without manufacturing a risk result', () => {
  const result = analyseWeek(audit([
    session('run', {
      type: 'long-run',
      role: 'priority1-direct',
      runDistance: 12,
      longestRun30: '',
    }),
    session('support', { day: 3 }),
  ]))
  const notice = result.collisions.find((item) => item.ruleId === 'running-baseline')
  assert.equal(notice?.severity, 'information')
  assert.equal(result.collisions.some((item) => item.ruleId === 'running-novelty'), false)
})

test('gives Protect precedence when a progressive Priority 1 session collides', () => {
  const result = analyseWeek(audit([
    session('priority-a', {
      day: 0,
      role: 'priority1-direct',
      progression: 'yes',
    }),
    session('priority-b', {
      day: 1,
      startTime: '12:00',
      role: 'priority1-direct',
      progression: 'yes',
    }),
  ]))
  assert.equal(result.actions['priority-a'].action, 'protect')
  assert.equal(result.actions['priority-b'].action, 'protect')
})

test('identifies a week with no usable low-stress day', () => {
  const sessions = Array.from({ length: 7 }, (_, day) => session(`day-${day}`, {
    day,
    startTime: '18:00',
    type: 'crossfit',
    role: day === 0 ? 'priority1-direct' : 'priority1-support',
  }))
  const result = analyseWeek(audit(sessions))
  assert.equal(result.days.every((day) => day.lowStress === false), true)
  assert.ok(result.collisions.some((item) => item.ruleId === 'no-low-stress-day'))
})

test('reports missing progression for Priority 1', () => {
  const result = analyseWeek(audit([
    session('priority', {
      role: 'priority1-direct',
      progression: 'no',
    }),
    session('secondary', {
      day: 3,
      role: 'priority2',
      progression: 'yes',
    }),
  ]))
  assert.equal(result.progression.status, 'red')
  assert.equal(result.status, 'progression')
})

test('requires two valid sessions and a distinct goal hierarchy', () => {
  const result = validateAudit(audit([
    session('only-session'),
  ], {
    priority2: 'Running performance',
  }))
  assert.equal(result.valid, false)
  assert.equal(result.errors.priority2, 'The secondary outcome must be different from Priority 1.')
  assert.equal(result.errors.sessions, 'Add at least two sessions to map the week.')
})

test('detects when actual load exceeds the plan across the week', () => {
  const result = analyseWeek(audit([
    session('one', {
      actualRpe: 9,
      actualDuration: 60,
      role: 'priority1-direct',
    }),
    session('two', {
      day: 3,
      actualRpe: 9,
      actualDuration: 60,
    }),
  ]))
  assert.equal(result.review.completeEnough, true)
  assert.equal(result.review.weeklyAbovePlan, true)
  assert.equal(result.actualTotal, 1080)
})

test('the supplied HYROX example returns specific collisions and a run warning', () => {
  const result = analyseWeek(structuredClone(HYROX_EXAMPLE))
  assert.equal(result.valid, true)
  assert.ok(result.collisions.some((item) => item.ruleId === 'primary-protection'))
  assert.ok(result.collisions.some((item) => item.ruleId === 'running-novelty'))
  assert.equal(result.sessionToProtect?.role, 'priority1-direct')
})

test('an unrelated Priority 1 session does not turn another metabolic pair red', () => {
  const result = analyseWeek(audit([
    session('tuesday-hard', {
      day: 1,
      type: 'crossfit',
      role: 'maintenance',
      progression: 'no',
    }),
    session('wednesday-hard', {
      day: 2,
      type: 'crossfit',
      role: 'maintenance',
      progression: 'no',
    }),
    session('saturday-priority', {
      day: 5,
      type: 'crossfit',
      role: 'priority1-direct',
      progression: 'yes',
    }),
  ], {
    recoveryFlags: ['low-sleep', 'high-stress'],
  }))

  assert.equal(result.collisions.some(
    (item) => item.ruleId === 'metabolic-density' && item.severity === 'red',
  ), false)
})

test('separated hard sessions do not activate aggregate metabolic density', () => {
  const result = analyseWeek(audit([
    session('monday-hard', { day: 0, type: 'crossfit', role: 'priority1-direct' }),
    session('wednesday-hard', { day: 2, type: 'crossfit', role: 'priority1-support' }),
    session('friday-hard', { day: 4, type: 'crossfit', role: 'priority1-support' }),
  ]))

  assert.equal(result.collisions.some((item) => item.ruleId === 'metabolic-density'), false)
})

test('multiple explanations for one session pair count as one physical collision', () => {
  const result = analyseWeek(audit([
    session('monday-priority', {
      day: 0,
      startTime: '18:00',
      role: 'priority1-direct',
      bodyAreas: ['Knee or quadriceps'],
    }),
    session('sunday-optional', {
      day: 6,
      startTime: '20:00',
      role: 'maintenance',
      progression: 'no',
      bodyAreas: ['Knee or quadriceps'],
    }),
  ]))

  const detailed = result.collisions.filter((item) => item.physicalGroupId === 'pair:monday-priority:sunday-optional')
  assert.ok(detailed.length >= 2)
  assert.equal(result.metrics.redCollisions, 1)
})

test('explicit same-time order is stable when names and input order change', () => {
  const make = (sessions) => analyseWeek(audit(sessions))
  const earlier = session('earlier', {
    day: 2,
    startTime: '18:00',
    sequenceAtSameTime: 0,
    name: 'Zulu conditioning',
    type: 'crossfit-volume',
    role: 'maintenance',
    progression: 'no',
  })
  const later = session('later', {
    day: 2,
    startTime: '18:00',
    sequenceAtSameTime: 1,
    name: 'Alpha weightlifting',
    type: 'weightlifting',
    role: 'priority1-direct',
    progression: 'yes',
  })
  const first = make([earlier, later])
  const second = make([later, earlier])

  assert.equal(first.collisions.find((item) => item.ruleId === 'primary-protection')?.actorSessionId, 'earlier')
  assert.equal(second.collisions.find((item) => item.ruleId === 'primary-protection')?.actorSessionId, 'earlier')
})

test('a revised-week suggestion rejects overlapping sessions', () => {
  const result = analyseWeek(audit([
    session('priority', {
      day: 0,
      startTime: '18:00',
      role: 'priority1-direct',
    }),
    session('actor', {
      day: 6,
      startTime: '20:00',
      duration: 90,
      role: 'priority1-support',
      progression: 'yes',
      availableDays: [2],
    }),
    session('occupied', {
      day: 2,
      startTime: '20:30',
      duration: 60,
      type: 'upper-strength',
      role: 'priority1-support',
    }),
  ]))

  assert.equal(result.revisedWeek.actorId, 'actor')
  assert.equal(result.revisedWeek.status, 'manual')
  assert.match(result.revisedWeek.message, /do not improve|availability|available days/i)
})

test('a progression result proposes defining progression before moving sessions', () => {
  const result = analyseWeek(audit([
    session('priority', {
      day: 0,
      role: 'priority1-direct',
      progression: 'no',
    }),
    session('support', {
      day: 3,
      role: 'priority1-support',
      progression: 'yes',
    }),
  ]))

  assert.equal(result.status, 'progression')
  assert.equal(result.mainFinding.actorSessionId, 'priority')
  assert.equal(result.actions.priority.action, 'review')
  assert.match(result.revisedWeek.message, /progression variable/)
})

test('validation rejects malformed time and unsupported classifications', () => {
  const malformed = session('malformed', {
    startTime: '8:00',
    role: 'made-up',
    progression: 'sometimes',
    mobility: 'perhaps',
    structure: 'unknown',
  })
  const result = validateAudit(audit([malformed, session('valid', { day: 3 })]))

  assert.equal(result.valid, false)
  assert.ok(result.errors['session-0-time'])
  assert.ok(result.errors['session-0-role'])
  assert.ok(result.errors['session-0-progression'])
  assert.ok(result.errors['session-0-mobility'])
  assert.ok(result.errors['session-0-structure'])
})

test('one physical collision does not inflate the no-low-stress-day severity', () => {
  const aerobicOnly = {
    lowerForce: 0,
    impact: 0,
    upperGrip: 0,
    metabolic: 0,
    aerobic: 3,
    freshness: 0,
  }
  const sessions = [
    session('monday-priority', {
      day: 0,
      startTime: '18:00',
      type: 'weightlifting',
      role: 'priority1-direct',
    }),
    ...[1, 2, 3, 4, 5].map((day) => session(`aerobic-${day}`, {
      day,
      type: 'custom',
      stress: aerobicOnly,
      fingerprintConfirmed: true,
    })),
    session('sunday-optional', {
      day: 6,
      startTime: '20:00',
      type: 'crossfit-volume',
      role: 'maintenance',
      progression: 'no',
    }),
  ]
  const result = analyseWeek(audit(sessions))
  const noLowDay = result.collisions.find((item) => item.ruleId === 'no-low-stress-day')

  assert.equal(result.days.every((day) => day.lowStress === false), true)
  assert.equal(noLowDay?.severity, 'amber')
})

test('several explanations for one collision do not manufacture a recovery mismatch', () => {
  const result = analyseWeek(audit([
    session('monday-priority', {
      day: 0,
      startTime: '18:00',
      type: 'weightlifting',
      role: 'priority1-direct',
      review: { performance: 'worse' },
    }),
    session('sunday-optional', {
      day: 6,
      startTime: '20:00',
      type: 'crossfit-volume',
      role: 'maintenance',
      progression: 'no',
    }),
  ], {
    recoveryFlags: ['recent-illness', 'return-after-break'],
  }))

  assert.notEqual(result.status, 'recovery')
  assert.equal(result.metrics.redCollisions, 1)
})

test('illness and return from time away do not imply Nutrition Focus', () => {
  const result = analyseWeek(audit([
    session('priority', {
      day: 0,
      type: 'upper-strength',
      role: 'priority1-direct',
    }),
    session('support', {
      day: 3,
      type: 'easy-cycle',
      role: 'priority1-support',
    }),
  ], {
    recoveryFlags: ['recent-illness', 'return-after-break'],
  }))

  assert.equal(result.coaching.name, 'Review')
  assert.equal(result.coaching.label, 'Recovery context requires review')
})

test('partial review coverage never reports an understated weekly actual load', () => {
  const sessions = Array.from({ length: 5 }, (_, day) => session(`review-${day}`, {
    day,
    type: 'easy-cycle',
    role: day === 0 ? 'priority1-direct' : 'priority1-support',
    actualRpe: day < 4 ? 6 : '',
    actualDuration: day < 4 ? 60 : '',
  }))
  const result = analyseWeek(audit(sessions))

  assert.equal(result.review.coverage, 0.8)
  assert.equal(result.review.completeEnough, true)
  assert.equal(result.review.actualTotal, null)
})

test('unrelated lower-priority collisions do not weaken a progressive Priority 1 exposure', () => {
  const result = analyseWeek(audit([
    session('priority', {
      day: 0,
      type: 'easy-cycle',
      role: 'priority1-direct',
      progression: 'yes',
    }),
    session('upper-one', {
      day: 2,
      startTime: '06:00',
      type: 'upper-strength',
      role: 'priority2',
    }),
    session('upper-two', {
      day: 3,
      startTime: '05:00',
      type: 'upper-strength',
      role: 'priority2',
    }),
    session('run-one', {
      day: 4,
      startTime: '18:00',
      type: 'running-intervals',
      role: 'maintenance',
    }),
    session('run-two', {
      day: 5,
      startTime: '17:00',
      type: 'running-intervals',
      role: 'maintenance',
    }),
  ]))

  assert.equal(result.progression.progressivePriority.length, 1)
  assert.equal(result.progression.status, 'clear')
})

test('a normal-context 2 plus 2 overlap does not activate Priority 1 protection', () => {
  const moderateStress = {
    lowerForce: 2,
    impact: 0,
    upperGrip: 0,
    metabolic: 0,
    aerobic: 0,
    freshness: 0,
  }
  const result = analyseWeek(audit([
    session('support', {
      day: 0,
      startTime: '10:00',
      type: 'custom',
      fingerprintConfirmed: true,
      stress: moderateStress,
      role: 'priority1-support',
    }),
    session('priority', {
      day: 1,
      startTime: '09:00',
      type: 'custom',
      fingerprintConfirmed: true,
      stress: { ...moderateStress, freshness: 2 },
      role: 'priority1-direct',
    }),
  ]))

  assert.equal(result.collisions.some((item) => item.ruleId === 'primary-protection'), false)
})

test('technical separation is measured from the preceding session end', () => {
  const result = analyseWeek(audit([
    session('long-force-session', {
      day: 0,
      startTime: '10:00',
      duration: 180,
      type: 'custom',
      fingerprintConfirmed: true,
      stress: {
        lowerForce: 3,
        impact: 0,
        upperGrip: 0,
        metabolic: 1,
        aerobic: 0,
        freshness: 0,
      },
      role: 'priority1-support',
    }),
    session('power-session', {
      day: 0,
      startTime: '14:00',
      type: 'custom',
      fingerprintConfirmed: true,
      stress: {
        lowerForce: 2,
        impact: 0,
        upperGrip: 0,
        metabolic: 0,
        aerobic: 0,
        freshness: 3,
      },
      role: 'priority2',
    }),
  ]))

  const collision = result.collisions.find((item) => item.ruleId === 'technical-sequencing')
  assert.equal(collision?.severity, 'red')
  assert.equal(collision?.gapHours, 1)
})

test('a running status always uses the running novelty warning as its main finding', () => {
  const result = analyseWeek(audit([
    session('priority-run', {
      day: 0,
      type: 'easy-run',
      role: 'priority1-direct',
      runDistance: 12,
      longestRun30: 10,
    }),
    session('easy-cycle', {
      day: 3,
      type: 'easy-cycle',
      role: 'priority1-support',
      stress: undefined,
    }),
  ]))

  assert.equal(result.status, 'running')
  assert.equal(result.mainFinding?.ruleId, 'running-novelty')
  assert.equal(result.mainFinding?.actorSessionId, 'priority-run')
})

test('review values require a complete and valid actual-load pair', () => {
  const result = validateAudit(audit([
    session('invalid-review', {
      actualDuration: 500,
      actualRpe: '',
      review: {
        completion: 'partly',
        performance: 'worse',
        soreness: 11,
        fatigue: -1,
        painChangesMovement: false,
        deviationReason: 'fatigue',
      },
    }),
    session('valid-session', { day: 3 }),
  ]))

  assert.equal(result.valid, false)
  assert.equal(result.errors['session-0-actual-duration'], 'Actual duration must be between 1 and 360 minutes.')
  assert.equal(result.errors['session-0-actual-load'], 'Enter both actual duration and actual RPE.')
  assert.equal(result.errors['session-0-soreness'], 'Soreness must be between 0 and 10.')
  assert.equal(result.errors['session-0-fatigue'], 'Fatigue must be between 0 and 10.')
})
