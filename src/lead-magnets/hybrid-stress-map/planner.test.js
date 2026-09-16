import test from 'node:test'
import assert from 'node:assert/strict'
import { analyseSchedule, pairContext, planWeek } from './planner.js'
import {
  bookingDuration,
  newPlanningAudit,
  newPlanningSession,
  newPart,
  pairKey,
} from './planning-model.js'
import { getSessionType } from './constants.js'
import { workedExample } from './examples.js'

const session = (id, patch = {}) =>
  newPlanningSession({
    id,
    name: id,
    day: 0,
    startTime: '18:00',
    duration: 60,
    type: 'lower-strength',
    stress: { ...getSessionType('lower-strength').stress },
    fingerprintConfirmed: true,
    effort: 'hard',
    freshness: 'unknown',
    ...patch,
  })
const window = (
  id,
  day,
  startTime = '18:00',
  endTime = '19:00',
  patch = {},
) => ({ id, day, startTime, endTime, location: '', equipment: [], ...patch })
const audit = (sessions, patch = {}) => ({
  ...newPlanningAudit(),
  timeZone: 'Europe/London',
  sessions,
  ...patch,
})
const response = (map, from, to, answer = 'yes') => {
  map.pairResponses[pairKey(from, to)] = {
    answer,
    context: pairContext(map, from, to),
    answeredAt: '2026-09-16T12:00:00Z',
  }
  return map
}
const pair = (patch = {}) =>
  audit(
    [
      session('Deadlifts', { day: 1 }),
      session('ATHX strength', {
        day: 2,
        startTime: '07:00',
        priority: true,
        freshness: 'yes',
        mobility: 'fixed',
      }),
    ],
    patch,
  )
const placement = (plan, id) => {
  const value = plan.sessions.find((item) => item.id === id)
  return [value.day, value.startTime]
}

test('reported difficulty offers an exact feasible move and leaves inputs untouched', () => {
  const map = response(
    pair({ availableWindows: [window('monday', 0)] }),
    'Deadlifts',
    'ATHX strength',
  )
  const before = structuredClone(map)
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.deepEqual(placement(result, 'Deadlifts'), [0, '18:00'])
  assert.equal(result.changes[0].beforeGap, 720)
  assert.equal(result.changes[0].afterGap, 2160)
  assert.match(result.changes[0].detail, /12 hours to 36 hours/)
  assert.match(result.changes[0].reason, /Tuesday 18:00 to Monday 18:00/)
  assert.deepEqual(map, before)
})

test('a suggested move cannot reduce a reported gap from twelve hours to eleven', () => {
  const result = planWeek(
    response(
      pair({ availableWindows: [window('later', 1, '19:00', '20:00')] }),
      'Deadlifts',
      'ATHX strength',
    ),
  )
  assert.equal(result.status, 'unchanged')
  assert.deepEqual(placement(result, 'Deadlifts'), [1, '18:00'])
})

test('confirmed shared demands can propose spacing before any follow-up is answered', () => {
  const result = planWeek(pair({ availableWindows: [window('monday', 0)] }))
  assert.equal(result.status, 'proposed')
  assert.equal(result.changes[0].basis, 'inferred')
  assert.match(result.changes[0].detail, /demanding leg training/)
  assert.doesNotMatch(
    result.changes[0].detail,
    /recovered|recovery is|resolved|guarantee/i,
  )
})

test('a type name alone never supplies confirmed exercise demands', () => {
  const map = pair({ availableWindows: [window('monday', 0)] })
  map.sessions[0].fingerprintConfirmed = false
  assert.equal(analyseSchedule(map).concerns.length, 0)
  assert.equal(planWeek(map).status, 'unchanged')
})

test('No, tolerant and deliberate fatigue exclude heuristic freshness concerns', () => {
  for (const freshness of ['no', 'tolerant', 'fatigue', 'unknown']) {
    const map = pair({ availableWindows: [window('monday', 0)] })
    map.sessions[1].freshness = freshness
    assert.equal(analyseSchedule(map).concerns.length, 0, freshness)
    assert.equal(planWeek(map).status, 'unchanged', freshness)
  }
})

test('explicit reported difficulties remain relevant even if freshness is No', () => {
  const map = pair({ availableWindows: [window('monday', 0)] })
  map.sessions[1].freshness = 'no'
  response(map, 'Deadlifts', 'ATHX strength')
  assert.equal(planWeek(map).status, 'proposed')
})

test('a No answer suppresses the possible concern without deleting the answer', () => {
  const map = response(
    pair({ availableWindows: [window('monday', 0)] }),
    'Deadlifts',
    'ATHX strength',
    'no',
  )
  assert.equal(analyseSchedule(map).concerns.length, 0)
  assert.equal(planWeek(map).status, 'unchanged')
  assert.equal(map.pairResponses['Deadlifts->ATHX strength'].answer, 'no')
})

test('Sometimes remains qualified in findings and change explanations', () => {
  const map = response(
    pair({ availableWindows: [window('monday', 0)] }),
    'Deadlifts',
    'ATHX strength',
    'sometimes',
  )
  const result = planWeek(map)
  assert.match(result.concerns[0].reason, /sometimes affects.*or your sleep/)
  assert.match(result.changes[0].detail, /sometimes affects.*or your sleep/)
  assert.doesNotMatch(result.concerns[0].reason, /harder|too little|not enough/)
})

test('priority is importance, so a flexible priority can move', () => {
  const map = pair({
    availableWindows: [window('thursday', 3, '07:00', '08:00')],
  })
  map.sessions[0].mobility = 'fixed'
  map.sessions[1].mobility = 'movable'
  response(map, 'Deadlifts', 'ATHX strength')
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.deepEqual(placement(result, 'ATHX strength'), [3, '07:00'])
  assert.equal(result.sessions[1].priority, true)
  assert.deepEqual(placement(result, 'Deadlifts'), [1, '18:00'])
})

test('an atomic swap uses original vacated slots without an intermediate collision', () => {
  const map = pair()
  map.sessions.push(
    session('Upper body', {
      day: 3,
      type: 'upper-strength',
      stress: { ...getSessionType('upper-strength').stress },
    }),
  )
  response(map, 'Deadlifts', 'ATHX strength')
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.equal(result.changes.length, 2)
  assert.deepEqual(placement(result, 'Deadlifts'), [3, '18:00'])
  assert.deepEqual(placement(result, 'Upper body'), [1, '18:00'])
  assert.equal(
    analyseSchedule({ ...map, sessions: result.sessions }).issues.length,
    0,
  )
  assert.match(
    result.changes.find((change) => change.sessionId === 'Upper body').detail,
    /makes room/,
  )
})

test('two independent priorities can receive coordinated changes', () => {
  const map = audit(
    [
      session('Legs', { day: 0 }),
      session('Priority legs', {
        day: 1,
        freshness: 'yes',
        priority: true,
        mobility: 'fixed',
      }),
      session('Pulls', {
        day: 3,
        type: 'upper-strength',
        stress: { ...getSessionType('upper-strength').stress },
      }),
      session('Priority upper', {
        day: 4,
        freshness: 'yes',
        priority: true,
        mobility: 'fixed',
        type: 'upper-strength',
        stress: { ...getSessionType('upper-strength').stress },
      }),
    ],
    { availableWindows: [window('wed', 2), window('sat', 5)] },
  )
  response(map, 'Legs', 'Priority legs')
  response(map, 'Pulls', 'Priority upper')
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.ok(result.changes.some((change) => change.sessionId === 'Legs'))
  assert.ok(result.changes.some((change) => change.sessionId === 'Pulls'))
  assert.deepEqual(
    result.sessions.filter((item) => item.priority).map((item) => item.id),
    ['Priority legs', 'Priority upper'],
  )
})

test('an improved priority gap cannot shorten a different reported pairing', () => {
  const map = pair({
    availableWindows: [window('earlier', 1, '17:00', '18:00')],
  })
  map.sessions.push(
    session('Earlier legs', { day: 0, startTime: '18:00', mobility: 'fixed' }),
  )
  response(map, 'Deadlifts', 'ATHX strength')
  response(map, 'Earlier legs', 'Deadlifts')
  const result = planWeek(map)
  assert.equal(result.status, 'unchanged')
})

test('literal commitment clashes produce a feasible direct schedule change', () => {
  const map = audit([session('Run', { day: 0, fingerprintConfirmed: false })], {
    blockedWindows: [
      window('shift', 0, '17:00', '20:00', { label: 'Late shift' }),
    ],
    availableWindows: [window('tuesday', 1)],
  })
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.deepEqual(placement(result, 'Run'), [1, '18:00'])
  assert.equal(result.changes[0].basis, 'schedule')
  assert.match(result.changes[0].detail, /Late shift/)
})

test('a fixed commitment clash returns exact session and window identifiers', () => {
  const map = audit([session('Run', { mobility: 'fixed' })], {
    blockedWindows: [window('shift', 0)],
  })
  const result = planWeek(map)
  assert.equal(result.status, 'blocked')
  assert.ok(
    result.blockers.some(
      (item) => item.sessionId === 'Run' && item.windowId === 'shift',
    ),
  )
})

test('a flexible clash with no compatible slot is blocked without removing training', () => {
  const map = audit([session('Run')], { blockedWindows: [window('shift', 0)] })
  const result = planWeek(map)
  assert.equal(result.status, 'blocked')
  assert.equal(result.sessions.length, 1)
  assert.ok(result.blockers.some((item) => item.sessionId === 'Run'))
})

test('availability must match location, equipment and any imported session restriction', () => {
  for (const bad of [
    window('elsewhere', 0, '18:00', '19:00', {
      location: 'Park',
      equipment: ['barbell'],
    }),
    window('no-barbell', 0, '18:00', '19:00', { location: 'Gym' }),
    window('restricted', 0, '18:00', '19:00', {
      location: 'Gym',
      equipment: ['barbell'],
      sessionIds: ['other'],
    }),
  ]) {
    const map = pair({ availableWindows: [bad] })
    map.sessions[0].location = 'Gym'
    map.sessions[0].equipment = ['barbell']
    response(map, 'Deadlifts', 'ATHX strength')
    assert.equal(planWeek(map).status, 'unchanged', bad.id)
  }
})

test('unentered days are never assumed to be available', () => {
  const result = planWeek(response(pair(), 'Deadlifts', 'ATHX strength'))
  assert.equal(result.status, 'unchanged')
  assert.ok(result.blockers.some((item) => item.type === 'availability'))
})

test('a session must fit completely and can use a non-grid boundary', () => {
  const map = pair({
    availableWindows: [window('wide', 0, '17:00', '19:07')],
    blockedWindows: [window('busy', 0, '17:00', '18:07')],
  })
  response(map, 'Deadlifts', 'ATHX strength')
  assert.deepEqual(placement(planWeek(map), 'Deadlifts'), [0, '18:07'])
})

test('multipart gap uses relevant parts and preserves their order, breaks and booking time', () => {
  const map = pair({
    availableWindows: [window('monday', 0, '18:00', '20:00')],
  })
  map.sessions[0].components = [
    newPart({
      id: 'legs-part',
      name: 'Squats',
      duration: 20,
      breakAfter: 10,
      fingerprintConfirmed: true,
      stress: { ...getSessionType('lower-strength').stress },
    }),
    newPart({
      id: 'upper-part',
      name: 'Pressing',
      duration: 40,
      breakAfter: 5,
      fingerprintConfirmed: true,
      stress: { ...getSessionType('upper-strength').stress },
    }),
  ]
  map.sessions[0].startDelay = 15
  response(map, 'Deadlifts', 'ATHX strength')
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.equal(result.changes[0].beforeGap, 745)
  assert.match(result.changes[0].detail, /“Squats” part/)
  assert.equal(bookingDuration(result.sessions[0]), 90)
  assert.deepEqual(result.sessions[0].components, map.sessions[0].components)
})

test('typical week checks Sunday to Monday; a specific week does not invent next week', () => {
  const sessions = [
    session('Sunday legs', { day: 6 }),
    session('Monday priority', {
      day: 0,
      startTime: '07:00',
      freshness: 'yes',
      priority: true,
      mobility: 'fixed',
    }),
  ]
  const typical = audit(sessions)
  assert.equal(analyseSchedule(typical).concerns[0].gapMinutes, 720)
  const specific = { ...typical, weekMode: 'specific', weekStart: '2026-09-14' }
  assert.equal(analyseSchedule(specific).concerns.length, 0)
})

test('overnight bookings clash with early next-day commitments', () => {
  const map = audit(
    [
      session('Late session', {
        day: 0,
        startTime: '23:30',
        duration: 90,
        mobility: 'fixed',
      }),
    ],
    { blockedWindows: [window('sleep', 1, '00:00', '07:00')] },
  )
  assert.equal(planWeek(map).status, 'blocked')
  assert.equal(analyseSchedule(map).issues[0].windowId, 'sleep')
})

test('specific week labels use its actual first weekday and account for daylight saving', () => {
  const map = audit(
    [
      session('Saturday legs', { day: 0, startTime: '18:00' }),
      session('Sunday priority', {
        day: 1,
        startTime: '07:00',
        freshness: 'yes',
        priority: true,
      }),
    ],
    { weekMode: 'specific', weekStart: '2026-03-28' },
  )
  const analysis = analyseSchedule(map)
  assert.equal(analysis.valid, true)
  assert.equal(analysis.concerns[0].gapMinutes, 660)
  assert.match(analysis.concerns[0].reason, /Saturday/)
  assert.match(analysis.concerns[0].reason, /Sunday/)
})

test('ambiguous and skipped clock-change starts fail visibly', () => {
  for (const weekStart of ['2026-03-29', '2026-10-25']) {
    const result = planWeek(
      audit([session('Clock change', { startTime: '01:30' })], {
        weekMode: 'specific',
        weekStart,
      }),
    )
    assert.equal(result.status, 'invalid')
    assert.equal(result.blockers[0].sessionId, 'Clock change')
  }
})

test('name changes preserve answer context but content changes request an update', () => {
  const map = response(pair(), 'Deadlifts', 'ATHX strength')
  map.sessions[0].name = 'Tuesday deadlifts'
  assert.equal(analyseSchedule(map).concerns[0].needsUpdate, false)
  map.sessions[0].exercises = 'Completely different exercises'
  assert.equal(analyseSchedule(map).concerns[0].needsUpdate, true)
  assert.equal(map.pairResponses['Deadlifts->ATHX strength'].answer, 'yes')
})

test('a plan is deterministic and never changes duration, effort or training content', () => {
  const map = response(
    pair({ availableWindows: [window('friday', 4), window('monday', 0)] }),
    'Deadlifts',
    'ATHX strength',
  )
  const first = planWeek(map)
  assert.deepEqual(planWeek(map), first)
  for (const item of first.sessions) {
    const before = map.sessions.find((entry) => entry.id === item.id)
    assert.deepEqual(
      { ...item, day: before.day, startTime: before.startTime },
      before,
    )
  }
})

test('no inferred concern is generated for unconfirmed multipart content', () => {
  const map = pair({ availableWindows: [window('monday', 0)] })
  map.sessions[0].components = [
    newPart({
      name: 'Squats',
      type: 'lower-strength',
      stress: { ...getSessionType('lower-strength').stress },
      duration: 60,
    }),
  ]
  assert.equal(analyseSchedule(map).concerns.length, 0)
})

test('a new possible pairing is named as a consequence of an improved reported pairing', () => {
  const map = pair({ availableWindows: [window('thursday', 3)] })
  map.sessions.push(
    session('Friday legs', { day: 4, freshness: 'yes', mobility: 'fixed' }),
  )
  response(map, 'Deadlifts', 'ATHX strength')
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  const consequence = result.changes[0].consequences.find(
    (item) => item.targetId === 'Friday legs',
  )
  assert.ok(consequence)
  assert.match(consequence.reason, /Friday legs/)
  assert.match(consequence.reason, /Thursday/)
  assert.equal(consequence.gapMinutes, 1380)
})

test('moving a source after its target in a specific week is described as an order change', () => {
  const map = response(
    pair({
      weekMode: 'specific',
      weekStart: '2026-09-14',
      availableWindows: [window('thursday', 3)],
    }),
    'Deadlifts',
    'ATHX strength',
  )
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.equal(result.changes[0].afterGap, null)
  assert.match(result.changes[0].detail, /now takes place after/)
  assert.doesNotMatch(result.changes[0].detail, /10080|168 hours/)
})

test('renaming a busy window updates the direct clash explanation', () => {
  const map = audit([session('Run', { mobility: 'fixed' })], {
    blockedWindows: [
      window('busy', 0, '18:00', '19:00', { label: 'Family commitment' }),
    ],
  })
  assert.match(planWeek(map).blockers[0].reason, /Family commitment/)
})

test('a stale answer cannot assert that the user currently needs freshness', () => {
  const map = response(pair(), 'Deadlifts', 'ATHX strength')
  map.sessions[1].freshness = 'no'
  const result = analyseSchedule(map)
  assert.equal(result.concerns[0].needsUpdate, true)
  assert.doesNotMatch(result.concerns[0].reason, /want to start.*fresh/)
})

test('overnight availability can host a next-day move without entering sleep', () => {
  const map = audit(
    [
      session('Late session', {
        day: 0,
        startTime: '20:00',
        fingerprintConfirmed: false,
      }),
    ],
    {
      availableWindows: [window('overnight', 1, '23:00', '02:00')],
      blockedWindows: [
        window('clash', 0, '20:00', '22:00'),
        window('busy', 1, '23:00', '00:30'),
      ],
    },
  )
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.deepEqual(placement(result, 'Late session'), [2, '00:30'])
})

test('empty and malformed weeks return usable states rather than invented sessions', () => {
  assert.equal(planWeek(audit([])).status, 'unchanged')
  assert.equal(
    planWeek(audit([session('Bad', { startTime: '25:00' })])).status,
    'invalid',
  )
  assert.equal(
    planWeek(audit([session('Bad', { duration: 0 })])).status,
    'invalid',
  )
  assert.equal(
    planWeek(
      audit([session('Bad')], {
        weekMode: 'specific',
        weekStart: '2026-02-30',
      }),
    ).status,
    'invalid',
  )
  assert.equal(
    planWeek(audit([session('Bad', { components: {} })])).status,
    'invalid',
  )
  assert.equal(
    planWeek(audit([session('Bad', { components: [null] })])).status,
    'invalid',
  )
  assert.equal(
    planWeek(audit([session('Bad', { duration: 30.5 })])).status,
    'invalid',
  )
})

test('reported findings preserve the full session-or-sleep answer and the original dates', () => {
  const map = workedExample()
  response(map, 'example-deadlifts', 'example-intervals')
  const result = planWeek(map)
  assert.equal(result.status, 'proposed')
  assert.equal(
    result.remaining.some(
      (item) => item.key === 'example-deadlifts->example-intervals',
    ),
    false,
  )
  const finding = result.concerns.find(
    (item) => item.key === 'example-deadlifts->example-intervals',
  )
  assert.match(finding.reason, /on Tuesday.*on Wednesday.*or your sleep/)
  assert.doesNotMatch(finding.reason, /on Thursday|harder to complete/)
  assert.match(
    result.changes[0].detail,
    /original time between.*on Wednesday.*or your sleep/,
  )
})

test('the worked example explains its confirmed deadlifts and controlled lowering', () => {
  const result = planWeek(workedExample())
  const change = result.changes[0]
  assert.match(change.detail, /deadlifts load your hamstrings and glutes/)
  assert.match(
    change.detail,
    /eccentric loading: the muscles produce force as they lengthen/,
  )
  assert.match(
    change.detail,
    /may make it harder to hold your planned running pace/,
  )
  assert.deepEqual(
    change.mechanismSources.map((source) => source.url),
    [
      'https://pubmed.ncbi.nlm.nih.gov/11932579/',
      'https://pubmed.ncbi.nlm.nih.gov/25774624/',
      'https://pubmed.ncbi.nlm.nih.gov/23724883/',
    ],
  )
  assert.doesNotMatch(
    change.detail,
    /will impair|muscle damage has|will recover/,
  )
})

test('a name alone, negated exercise or unconfirmed content cannot invent a named mechanism', () => {
  for (const exercises of [
    '',
    'No deadlifts; step-ups',
    'Skip deadlifts today',
    'Avoid deadlifts and controlled lowering',
  ]) {
    const map = workedExample()
    map.sessions[0].exercises = exercises
    const result = planWeek(map)
    assert.doesNotMatch(
      result.changes[0].detail,
      /deadlifts load your hamstrings|eccentric loading/,
      exercises,
    )
  }
  const map = workedExample()
  map.sessions[0].fingerprintConfirmed = false
  assert.equal(
    analyseSchedule(map).concerns.some((item) =>
      /hamstrings|eccentric loading/.test(item.reason),
    ),
    false,
  )
})

test('a worked-example move identifies its actual available slot and changed neighbours', () => {
  const change = planWeek(workedExample()).changes[0]
  assert.match(
    change.summary,
    /Time after Tuesday’s “Deadlifts and split squats” increases from 12 hours to 36 hours/,
  )
  assert.doesNotMatch(change.summary, /^Move /)
  assert.match(
    change.availability,
    /60-minute session.*“Before work” slot, Thursday 07:00 to 08:00.*Outdoors/,
  )
  const upper = change.consequences.find(
    (item) => item.targetId === 'example-upper',
  )
  assert.ok(upper)
  assert.equal(upper.beforeGap, 58 * 60)
  assert.equal(upper.afterGap, 34 * 60)
  assert.match(upper.reason, /ends Thursday 08:00.*starts Friday 18:00/)
  const athx = change.consequences.find(
    (item) => item.targetId === 'example-athx',
  )
  assert.equal(athx.beforeGap, 74 * 60)
  assert.equal(athx.afterGap, 50 * 60)
  assert.equal(athx.newConcern, false)
  assert.equal(
    change.consequences.some(
      (item) => item.key === 'example-deadlifts->example-intervals',
    ),
    false,
  )
})

test('a coordinated swap names the booking that vacates the destination', () => {
  const map = pair()
  map.sessions.push(
    session('Upper body', {
      day: 3,
      type: 'upper-strength',
      stress: { ...getSessionType('upper-strength').stress },
    }),
  )
  response(map, 'Deadlifts', 'ATHX strength')
  const result = planWeek(map)
  assert.match(
    result.changes.find((item) => item.sessionId === 'Deadlifts').availability,
    /slot vacated by “Upper body”: Thursday 18:00 to 19:00/,
  )
})

test('date, time-zone and week-mode edits retain the answer but require updated context', () => {
  const initial = pair({ weekMode: 'specific', weekStart: '2026-03-23' })
  response(initial, 'Deadlifts', 'ATHX strength')
  for (const patch of [
    { weekStart: '2026-03-30' },
    { timeZone: 'America/New_York' },
    { weekMode: 'typical' },
  ]) {
    const map = { ...structuredClone(initial), ...patch }
    const concern = analyseSchedule(map).concerns.find(
      (item) => item.key === 'Deadlifts->ATHX strength',
    )
    assert.equal(concern.needsUpdate, true)
    assert.equal(concern.answer, 'yes')
    assert.equal(concern.basis, 'inferred')
    assert.doesNotMatch(concern.reason, /You reported that/)
  }
})

test('legacy response context without a schedule reference is retained for review', () => {
  const map = response(pair(), 'Deadlifts', 'ATHX strength')
  delete map.pairResponses['Deadlifts->ATHX strength'].context.scheduleKey
  assert.equal(analyseSchedule(map).concerns[0].needsUpdate, true)
  assert.equal(map.pairResponses['Deadlifts->ATHX strength'].answer, 'yes')
})

test('dated availability and neighbour consequences include their actual dates', () => {
  const map = {
    ...workedExample(),
    weekMode: 'specific',
    weekStart: '2026-09-14',
  }
  const change = planWeek(map).changes[0]
  assert.match(change.availability, /Thursday 17 Sept? 2026 07:00 to 08:00/)
  assert.match(
    change.consequences.find((item) => item.targetId === 'example-upper')
      .reason,
    /Thursday 17 Sept? 2026 08:00.*Friday 18 Sept? 2026 18:00/,
  )
})

test('an unchanged result with stale evidence directs review of the retained answer', () => {
  const map = workedExample()
  response(map, 'example-deadlifts', 'example-intervals', 'sometimes')
  map.sessions[0].exercises =
    'Deadlifts with a controlled lowering phase; three sets of split squats'
  const result = planWeek(map)
  assert.equal(result.status, 'unchanged')
  assert.equal(result.concerns[0].needsUpdate, true)
  assert.equal(result.concerns[0].answer, 'sometimes')
  assert.match(
    result.summary,
    /previous answer is still selected.*changed session details/,
  )
  assert.doesNotMatch(
    result.summary,
    /No rearrangement|cannot|impossible|no available/i,
  )
  assert.deepEqual(
    map.availableWindows.map((slot) => slot.day),
    [3],
  )
  response(map, 'example-deadlifts', 'example-intervals', 'sometimes')
  const refreshed = planWeek(map)
  assert.equal(refreshed.status, 'proposed')
  assert.equal(refreshed.changes[0].to.day, 3)
})
