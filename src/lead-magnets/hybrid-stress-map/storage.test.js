import assert from 'node:assert/strict'
import test from 'node:test'
import { HYROX_EXAMPLE } from './constants.js'
import {
  PLANNING_STORAGE_KEY,
  newPlanningAudit,
  newPlanningSession,
  bookingDuration,
  sessionSignature,
} from './planning-model.js'
import {
  PLANNING_ARCHIVE_PREFIX,
  loadSavedAudits,
  restorePlanningAudit,
  savePlanningAudit,
} from './storage.js'

const originalKey = 'tpc-hybrid-stress-map-v1'
const revisedKey = 'tpc-hybrid-stress-map-v2'
function memory(entries = {}) {
  const data = new Map(Object.entries(entries)),
    writes = []
  return {
    data,
    writes,
    get length() {
      return data.size
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(key)
      data.set(key, value)
    },
  }
}
function revisedSession(id, day, changes = {}) {
  return {
    id,
    label: id,
    day,
    startTime: '18:00',
    duration: 60,
    type: 'lower-strength',
    description: 'Squat and deadlift',
    role: 'main',
    effort: 'hard',
    intent: 'fresh',
    confirmed: true,
    equipment: [],
    location: 'Gym',
    components: [],
    demands: {
      legs: 'substantial',
      impact: 'none',
      hardEfforts: 'no',
      freshSkill: 'yes',
    },
    ...changes,
  }
}
function revised() {
  return {
    schemaVersion: 3,
    weekType: 'repeating',
    startDate: '2026-09-16',
    timeZone: 'Europe/London',
    goal: 'strength',
    prioritySessionIds: ['b'],
    sessions: [revisedSession('a', 0), revisedSession('b', 1)],
    availableWindows: [],
    blockedWindows: [],
    sleepWindows: [],
    responses: {
      'effect:a:b': 'sometimes',
      'recovery:b': 'yes',
      'crowded:b': 'yes',
    },
    review: { priorityOutcomes: { b: 'partly' }, note: 'A difficult week' },
    selectedAction: { type: 'keep' },
    updatedAt: '2026-09-16T09:00:00Z',
  }
}

test('loads every compatible saved source without any writes', () => {
  const audit = newPlanningAudit()
  const storage = memory({
    [originalKey]: JSON.stringify(HYROX_EXAMPLE),
    [revisedKey]: JSON.stringify(revised()),
    [PLANNING_STORAGE_KEY]: JSON.stringify(audit),
  })
  const before = [...storage.data]
  const result = loadSavedAudits(storage)
  assert.equal(result.choices.length, 3)
  assert.deepEqual(result.errors, [])
  assert.deepEqual([...storage.data], before)
  assert.deepEqual(storage.writes, [])
})

test('original day alternatives retain only their saved time, length and session restriction', () => {
  const audit = restorePlanningAudit(HYROX_EXAMPLE, originalKey)
  const session = audit.sessions.find(
    (entry) => entry.id === 'example-hyrox-class',
  )
  assert.equal(session.name, 'HYROX class')
  assert.deepEqual(
    audit.availableWindows.find((window) =>
      window.sessionIds.includes(session.id),
    ),
    {
      id: 'legacy-example-hyrox-class-3',
      day: 3,
      startTime: '18:00',
      endTime: '19:00',
      sessionIds: [session.id],
      location: '',
      equipment: [],
    },
  )
  assert.equal(
    audit.sessions.find((entry) => entry.id === 'example-intervals').priority,
    true,
  )
  assert.deepEqual(audit.legacy.snapshot, HYROX_EXAMPLE)
})

test('v3 pair answers retain context and conditional rest answers stay only in legacy', () => {
  const raw = revised(),
    audit = restorePlanningAudit(raw, revisedKey)
  assert.equal(audit.weekStart, '2026-09-14')
  assert.equal(audit.pairResponses['a->b'].answer, 'sometimes')
  assert.equal(audit.pairResponses['a->b'].context.gapMinutes, 23 * 60)
  assert.equal(
    audit.pairResponses['a->b'].context.sourceSignature,
    sessionSignature(audit.sessions[0]),
  )
  assert.deepEqual(Object.keys(audit.pairResponses), ['a->b'])
  assert.equal(audit.legacy.snapshot.responses['recovery:b'], 'yes')
  assert.deepEqual(audit.legacy.snapshot.review, raw.review)
  assert.deepEqual(audit.legacy.snapshot.selectedAction, raw.selectedAction)
  assert.equal(audit.acceptedPlan, null)
})

test('v2 single priority migrates and unknown answers remain unknown', () => {
  const raw = {
    ...revised(),
    schemaVersion: 2,
    prioritySessionId: 'b',
    responses: { 'effect:a:b': 'unknown', recovery: 'yes' },
  }
  delete raw.prioritySessionIds
  const audit = restorePlanningAudit(raw, revisedKey)
  assert.equal(audit.sessions[1].priority, true)
  assert.equal(audit.pairResponses['a->b'].answer, 'unknown')
  assert.equal(audit.legacy.snapshot.responses.recovery, 'yes')
})

test('specific-week migration retains the literal first date and day positions', () => {
  const raw = { ...revised(), weekType: 'one-off' }
  const audit = restorePlanningAudit(raw, revisedKey)
  assert.equal(audit.weekStart, '2026-09-16')
  assert.equal(audit.weekMode, 'specific')
  assert.deepEqual(
    audit.sessions.map((session) => session.day),
    [0, 1],
  )
})

test('multipart migration preserves booking time, breaks and unknown content', () => {
  const raw = revised()
  raw.sessions[0] = revisedSession('a', 0, {
    duration: 150,
    startDelay: 30,
    confirmed: false,
    components: [
      {
        id: 'part-a',
        label: 'Strength',
        duration: 20,
        breakAfter: 10,
        demands: {},
        confirmed: false,
      },
      {
        id: 'part-b',
        label: 'Endurance',
        duration: 22,
        breakAfter: 38,
        demands: {},
        confirmed: false,
      },
      {
        id: 'part-c',
        label: 'MetCon',
        duration: 25,
        breakAfter: 0,
        demands: {},
        confirmed: false,
      },
    ],
  })
  const audit = restorePlanningAudit(raw, revisedKey)
  assert.equal(bookingDuration(audit.sessions[0]), 150)
  assert.equal(audit.sessions[0].components.at(-1).breakAfter, 5)
  assert.equal(audit.sessions[0].fingerprintConfirmed, false)
  assert.equal(audit.sessions[0].components[0].fingerprintConfirmed, false)
  assert.deepEqual(audit.legacy.snapshot.sessions[0], raw.sessions[0])
})

test('sleep slots and exact location/equipment requirements migrate', () => {
  const raw = revised()
  raw.availableWindows = [
    {
      id: 'free',
      day: 2,
      startTime: '17:00',
      endTime: '19:00',
      location: 'Gym',
      equipment: ['barbell'],
    },
  ]
  raw.sleepWindows = [
    {
      id: 'sleep',
      day: 1,
      startTime: '22:00',
      endTime: '07:00',
      location: '',
      equipment: [],
    },
  ]
  const audit = restorePlanningAudit(raw, revisedKey)
  assert.deepEqual(audit.availableWindows, raw.availableWindows)
  assert.equal(audit.blockedWindows[0].kind, 'sleep')
  assert.deepEqual(audit.locations, ['Gym'])
})

test('invalid JSON, unsupported versions and malformed records are preserved', () => {
  const storage = memory({
    [PLANNING_STORAGE_KEY]: '{bad',
    [originalKey]: JSON.stringify({ schemaVersion: 9 }),
    [revisedKey]: JSON.stringify({ ...revised(), sessions: {} }),
  })
  const before = [...storage.data],
    result = loadSavedAudits(storage)
  assert.equal(result.choices.length, 0)
  assert.equal(result.errors.length, 3)
  assert.deepEqual([...storage.data], before)
  assert.deepEqual(storage.writes, [])
})

test('saving writes only the new key and round-trips answers and accepted timetable', () => {
  const legacy = JSON.stringify(revised()),
    storage = memory({ [revisedKey]: legacy })
  const audit = restorePlanningAudit(revised(), revisedKey)
  audit.acceptedPlan = {
    sessions: structuredClone(audit.sessions),
    changes: [
      {
        sessionId: 'a',
        from: { day: 0, startTime: '18:00' },
        to: { day: 2, startTime: '18:00' },
        reason: 'More time before lifting',
      },
    ],
  }
  audit.acceptedPlan.sessions[0].day = 2
  const saved = savePlanningAudit(audit, storage)
  assert.deepEqual(storage.writes, [PLANNING_STORAGE_KEY])
  assert.equal(storage.getItem(revisedKey), legacy)
  assert.ok(saved.updatedAt)
  const restored = loadSavedAudits(storage).choices.find(
    (choice) => choice.key === PLANNING_STORAGE_KEY,
  ).audit
  assert.deepEqual(restored.pairResponses, audit.pairResponses)
  assert.deepEqual(restored.acceptedPlan, audit.acceptedPlan)
})

test('saving refuses to overwrite invalid or unsupported current saved data', () => {
  for (const value of ['{bad', JSON.stringify({ schemaVersion: 99 })]) {
    const storage = memory({ [PLANNING_STORAGE_KEY]: value })
    assert.throws(
      () => savePlanningAudit(newPlanningAudit(), storage),
      /kept|unsupported/,
    )
    assert.equal(storage.getItem(PLANNING_STORAGE_KEY), value)
    assert.equal(storage.writes.length, 0)
  }
})

test('drafts round-trip without requiring completed training details', () => {
  const audit = newPlanningAudit(),
    storage = memory()
  audit.sessions = [
    newPlanningSession({ name: '', startTime: '', duration: '' }),
  ]
  savePlanningAudit(audit, storage)
  assert.equal(loadSavedAudits(storage).choices[0].audit.sessions[0].name, '')
})

test('storage access and quota failures produce usable errors without deleting data', () => {
  const inaccessible = {
    getItem() {
      throw new Error('Browser storage is unavailable')
    },
  }
  assert.equal(loadSavedAudits(inaccessible).errors.length, 3)
  assert.throws(
    () =>
      savePlanningAudit(newPlanningAudit(), {
        getItem: () => null,
        setItem() {
          throw new Error('Quota')
        },
      }),
    /could not save/,
  )
})

test('switching to another saved week archives the latest current edits and makes them selectable', () => {
  const current = newPlanningAudit(),
    older = restorePlanningAudit(revised(), revisedKey)
  current.sessions = [
    newPlanningSession({
      name: 'My newer edits',
      exercises: 'Keep this description',
    }),
  ]
  const storage = memory({
    [PLANNING_STORAGE_KEY]: JSON.stringify(current),
    [revisedKey]: JSON.stringify(revised()),
  })
  savePlanningAudit(older, storage)
  const archiveKey = `${PLANNING_ARCHIVE_PREFIX}${encodeURIComponent(current.id)}`
  assert.deepEqual(JSON.parse(storage.getItem(archiveKey)), current)
  const result = loadSavedAudits(storage)
  assert.equal(result.choices.length, 2)
  assert.equal(result.choices[0].audit.id, older.id)
  assert.equal(
    result.choices[1].audit.sessions[0].exercises,
    'Keep this description',
  )
  assert.equal(
    result.choices.filter((choice) => choice.audit.id === older.id).length,
    1,
  )
  const modifiedEarlier = structuredClone(result.choices[1].audit)
  modifiedEarlier.sessions[0].name = 'Restored and edited'
  savePlanningAudit(modifiedEarlier, storage)
  const reloaded = loadSavedAudits(storage)
  assert.equal(
    reloaded.choices.find((choice) => choice.key === PLANNING_STORAGE_KEY).audit
      .sessions[0].name,
    'Restored and edited',
  )
  assert.ok(reloaded.choices.some((choice) => choice.audit.id === older.id))
})

test('same-week saves do not archive and unrelated corrupt archives do not block saving', () => {
  const current = newPlanningAudit(),
    corruptKey = `${PLANNING_ARCHIVE_PREFIX}unrelated`
  const storage = memory({
    [PLANNING_STORAGE_KEY]: JSON.stringify(current),
    [corruptKey]: '{bad',
  })
  savePlanningAudit(
    { ...current, profile: { ...current.profile, priority1: 'Strength' } },
    storage,
  )
  assert.deepEqual(storage.writes, [PLANNING_STORAGE_KEY])
  assert.equal(storage.getItem(corruptKey), '{bad')
  assert.equal(loadSavedAudits(storage).choices.length, 1)
  assert.equal(loadSavedAudits(storage).errors.length, 1)
})

test('switching cannot overwrite a corrupt archive with the same plan reference', () => {
  const current = newPlanningAudit(),
    other = newPlanningAudit(),
    key = `${PLANNING_ARCHIVE_PREFIX}${encodeURIComponent(current.id)}`
  const original = JSON.stringify(current),
    storage = memory({ [PLANNING_STORAGE_KEY]: original, [key]: '{bad' })
  assert.throws(() => savePlanningAudit(other, storage), /earlier saved copy/)
  assert.equal(storage.getItem(PLANNING_STORAGE_KEY), original)
  assert.equal(storage.getItem(key), '{bad')
  assert.deepEqual(storage.writes, [])
})

test('v3 class uses the existing CrossFit type and does not invent individual progression answers', () => {
  const raw = revised()
  raw.sessions[0].type = 'class'
  raw.progression = 'planned'
  const audit = restorePlanningAudit(raw, revisedKey)
  assert.equal(audit.sessions[0].type, 'crossfit')
  assert.equal(audit.sessions[0].progression, '')
  assert.equal(audit.legacy.snapshot.progression, 'planned')
})
