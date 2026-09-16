import assert from 'node:assert/strict'
import test from 'node:test'

import {
  changeSessionType,
  makeAthxParts,
  validatePlanningSession,
} from './editor-model.js'
import {
  bookingDuration,
  newPart,
  newPlanningSession,
} from './planning-model.js'

test('a multipart booking saves without single-session duration, type or effort', () => {
  const session = newPlanningSession({
    name: 'ATHX practice',
    type: '',
    duration: '',
    effort: '',
    startDelay: 10,
    components: [
      newPart({ name: 'Strength', duration: 20, breakAfter: 5 }),
      newPart({ name: 'Endurance', duration: 20 }),
    ],
  })
  assert.deepEqual(validatePlanningSession(session), {})
  assert.equal(bookingDuration(session), 55)
})

test('unknown content and optional progression do not block a valid calendar booking', () => {
  const session = newPlanningSession({
    name: 'Thursday gym class',
    type: 'custom',
    fingerprintConfirmed: false,
    progression: '',
    plannedRpe: '',
    role: '',
    effort: 'unknown',
    freshness: 'unknown',
  })
  assert.deepEqual(validatePlanningSession(session), {})
})

test('priority and flexible remain independent', () => {
  const session = newPlanningSession({
    name: 'Intervals',
    priority: true,
    mobility: 'movable',
  })
  assert.deepEqual(validatePlanningSession(session), {})
  const changed = changeSessionType(session, 'running-intervals')
  assert.equal(changed.priority, true)
  assert.equal(changed.mobility, 'movable')
})

test('type changes retain names, timing, exercises and unrelated saved fields', () => {
  const original = newPlanningSession({
    name: '6 × 3-minute intervals',
    startTime: '07:00',
    day: 2,
    exercises: '6 × 3 minutes at target pace',
    fingerprintConfirmed: true,
    review: { performance: 'worse' },
    location: 'Track',
    equipment: ['Spikes'],
  })
  const updated = changeSessionType(original, 'running-intervals')
  for (const field of [
    'name',
    'startTime',
    'day',
    'exercises',
    'review',
    'location',
    'equipment',
  ]) {
    assert.deepEqual(updated[field], original[field])
  }
  assert.equal(updated.fingerprintConfirmed, false)
  assert.equal(updated.stress.impact, 3)
})

test('multipart validation identifies the specific invalid part and rejects total duration over a day', () => {
  const session = newPlanningSession({
    name: 'Long training day',
    components: [
      newPart({ name: '', duration: 900, breakAfter: -10 }),
      newPart({ name: 'Second block', duration: 600 }),
    ],
  })
  const errors = validatePlanningSession(session)
  assert.ok(errors['part-0-name'])
  assert.ok(errors['part-0-breakAfter'])
  assert.ok(errors.booking)
})

test('single and multipart timings reject blank, fractional and malformed values', () => {
  assert.ok(
    validatePlanningSession(newPlanningSession({ name: 'Gym', duration: '' }))
      .duration,
  )
  assert.ok(
    validatePlanningSession(newPlanningSession({ name: 'Gym', duration: 1.5 }))
      .duration,
  )
  assert.ok(
    validatePlanningSession(
      newPlanningSession({ name: 'Gym', startTime: '24:00' }),
    ).startTime,
  )
  assert.ok(
    validatePlanningSession(newPlanningSession({ name: 'Gym', day: 7 })).day,
  )
  assert.ok(
    validatePlanningSession(
      newPlanningSession({
        name: 'Gym',
        components: [newPart({ name: 'Squats', duration: '' })],
      }),
    )['part-0-duration'],
  )
})

test('overnight sessions save with full duration intact', () => {
  const session = newPlanningSession({
    name: 'Late shift gym',
    startTime: '23:30',
    duration: 90,
  })
  assert.deepEqual(validatePlanningSession(session), {})
  assert.equal(bookingDuration(session), 90)
})

test('ATHX template parts remain editable and do not silently confirm example demands', () => {
  const first = makeAthxParts()
  const second = makeAthxParts()
  assert.equal(first.length, 3)
  assert.equal(bookingDuration({ components: first }), 70)
  assert.ok(first.every((part) => !part.fingerprintConfirmed))
  assert.equal(new Set([...first, ...second].map((part) => part.id)).size, 6)
  first[0].duration = 30
  assert.equal(bookingDuration({ components: first }), 80)
  assert.equal(bookingDuration({ components: second }), 70)
})
