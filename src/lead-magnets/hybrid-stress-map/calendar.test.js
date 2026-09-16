import assert from 'node:assert/strict'
import test from 'node:test'
import ICAL from 'ical.js'
import { newPlanningAudit, newPlanningSession } from './planning-model.js'
import {
  buildPlanCalendar,
  resolveCalendarTime,
  escapeCalendarText,
  foldCalendarLine,
} from './calendar.js'

function input(patch = {}) {
  return {
    audit: {
      ...newPlanningAudit(),
      id: 'saved-plan',
      timeZone: 'Europe/London',
    },
    plan: {
      sessions: [
        newPlanningSession({
          id: 'strength',
          name: 'Squat; strength',
          day: 0,
          startTime: '18:00',
          duration: 60,
          location: 'City Gym',
        }),
      ],
      changes: [],
    },
    weekStart: '2026-09-14',
    createdAt: '2026-09-16T10:00:00Z',
    ...patch,
  }
}
const unfold = (value) => value.replace(/\r\n[ \t]/g, '')
const events = (value) =>
  unfold(value)
    .split('BEGIN:VEVENT\r\n')
    .slice(1)
    .map((part) => part.split('END:VEVENT')[0])

test('exports the entire selected week with stable UIDs, locations and named time zone', () => {
  const options = input()
  options.plan.sessions.push(
    newPlanningSession({
      id: 'run',
      name: 'Run',
      day: 2,
      startTime: '07:00',
      duration: 45,
    }),
  )
  const result = buildPlanCalendar(options),
    parsed = events(result)
  assert.equal(parsed.length, 2)
  assert.match(
    parsed[0],
    /UID:saved-plan-strength@theperformanceconsultant.net/,
  )
  assert.match(parsed[0], /DTSTART;TZID=Europe\/London:20260914T180000/)
  assert.match(parsed[0], /DTEND;TZID=Europe\/London:20260914T190000/)
  assert.match(parsed[0], /SUMMARY:Squat\\; strength/)
  assert.match(parsed[0], /LOCATION:City Gym/)
  assert.doesNotMatch(result, /RRULE:/)
  assert.match(result, /^BEGIN:VCALENDAR\r\n/)
  assert.match(result, /END:VCALENDAR\r\n$/)
  assert.doesNotMatch(result.replaceAll('\r\n', ''), /[\r\n]/)
  const second = buildPlanCalendar({
    ...options,
    createdAt: '2026-09-17T10:00:00Z',
  })
  assert.equal(
    events(second)[0].match(/UID:(.*)/)[1],
    parsed[0].match(/UID:(.*)/)[1],
  )
})

test('weekly repeat counts include the chosen end date and no later starts', () => {
  const options = input({ repeatUntil: '2026-09-28' })
  options.plan.sessions.push(
    newPlanningSession({ id: 'run', name: 'Run', day: 2, startTime: '07:00' }),
  )
  const parsed = events(buildPlanCalendar(options))
  assert.match(parsed[0], /RRULE:FREQ=WEEKLY;COUNT=3/)
  assert.match(parsed[1], /RRULE:FREQ=WEEKLY;COUNT=2/)
})

test('spring recurrence keeps 18:00 local with correct transition definition', () => {
  const result = buildPlanCalendar(
    input({ weekStart: '2026-03-23', repeatUntil: '2026-04-06' }),
  )
  assert.match(
    result,
    /BEGIN:DAYLIGHT\r\nDTSTART:20260329T010000\r\nTZOFFSETFROM:\+0000\r\nTZOFFSETTO:\+0100/,
  )
  assert.equal(
    resolveCalendarTime('2026-03-23', '18:00', 'Europe/London'),
    Date.parse('2026-03-23T18:00:00Z'),
  )
  assert.equal(
    resolveCalendarTime('2026-03-30', '18:00', 'Europe/London'),
    Date.parse('2026-03-30T17:00:00Z'),
  )
  assert.match(events(result)[0], /RRULE:FREQ=WEEKLY;COUNT=3/)
})

test('autumn recurrence keeps 18:00 local with correct transition definition', () => {
  const result = buildPlanCalendar(
    input({ weekStart: '2026-10-19', repeatUntil: '2026-11-02' }),
  )
  assert.match(
    result,
    /BEGIN:STANDARD\r\nDTSTART:20261025T020000\r\nTZOFFSETFROM:\+0100\r\nTZOFFSETTO:\+0000/,
  )
  assert.equal(
    resolveCalendarTime('2026-10-19', '18:00', 'Europe/London'),
    Date.parse('2026-10-19T17:00:00Z'),
  )
  assert.equal(
    resolveCalendarTime('2026-10-26', '18:00', 'Europe/London'),
    Date.parse('2026-10-26T18:00:00Z'),
  )
})

test('uses the selected zone rather than device-local time, including non-hour offsets', () => {
  assert.equal(
    resolveCalendarTime('2026-09-14', '18:00', 'Asia/Kathmandu'),
    Date.parse('2026-09-14T12:15:00Z'),
  )
  assert.equal(
    resolveCalendarTime('2026-09-14', '18:00', 'America/New_York'),
    Date.parse('2026-09-14T22:00:00Z'),
  )
  const options = input()
  options.audit.timeZone = 'Asia/Kathmandu'
  const result = buildPlanCalendar(options)
  assert.match(result, /TZOFFSETTO:\+0545/)
  assert.match(result, /DTSTART;TZID=Asia\/Kathmandu:20260914T180000/)
})

test('detects nonexistent and ambiguous start times in every repeated occurrence', () => {
  assert.throws(
    () => resolveCalendarTime('2026-03-29', '01:30', 'Europe/London'),
    /does not exist/,
  )
  assert.throws(
    () => resolveCalendarTime('2026-10-25', '01:30', 'Europe/London'),
    /occurs twice/,
  )
  const options = input({ weekStart: '2026-03-16', repeatUntil: '2026-04-05' })
  options.plan.sessions[0].day = 6
  options.plan.sessions[0].startTime = '01:30'
  assert.throws(() => buildPlanCalendar(options), /2026-03-29/)
})

test('specific weeks use a literal date anchor and refuse weekly repetition', () => {
  const options = input({ weekStart: '2026-09-16' })
  options.audit.weekMode = 'specific'
  assert.match(events(buildPlanCalendar(options))[0], /20260916T180000/)
  assert.throws(
    () => buildPlanCalendar({ ...options, repeatUntil: '2026-09-30' }),
    /typical training week/,
  )
})

test('multipart sessions remain one booking and retain preparation, parts and breaks', () => {
  const options = input()
  options.plan.sessions[0] = newPlanningSession({
    id: 'athx',
    name: 'ATHX',
    day: 6,
    startTime: '23:30',
    startDelay: 30,
    components: [
      { id: 's', name: 'Strength', duration: 20, breakAfter: 10 },
      { id: 'e', name: 'Endurance', duration: 22, breakAfter: 38 },
      { id: 'm', name: 'MetCon', duration: 25, breakAfter: 5 },
    ],
  })
  const parsed = events(buildPlanCalendar(options))
  assert.equal(parsed.length, 1)
  assert.match(parsed[0], /DTEND;TZID=Europe\/London:20260921T020000/)
  assert.match(parsed[0], /30 minutes before the first part/)
  assert.match(
    parsed[0],
    /Endurance: Monday\\, 21 Sept 2026\\, 00:30 to Monday\\, 21 Sept 2026\\, 00:52 \(22 minutes\)\\, then 38 minutes break/,
  )
})

test('move explanations retain exact original and new times with their basis', () => {
  const options = input()
  options.plan.sessions[0].day = 2
  options.plan.changes = [
    {
      sessionId: 'strength',
      from: { day: 0, startTime: '18:00' },
      to: { day: 2, startTime: '18:00' },
      basis: 'reported',
      summary: 'Another day before lifting.',
      reason: 'You reported tired legs after running.',
      detail: 'The new slot leaves another day before lifting.',
      availability:
        'The full 60-minute session fits Wednesday 18:00–19:00 at City Gym. Required equipment: barbell.',
      mechanismSources: [
        { label: 'Training study', url: 'https://example.test/study' },
      ],
      beforeGap: 23 * 60,
      afterGap: 47 * 60,
      consequences: ['The Thursday class stays at 18:00.'],
    },
  ]
  const result = events(buildPlanCalendar(options))[0]
  assert.match(result, /Original: Monday\\, 14 Sept 2026\\, 18:00/)
  assert.match(result, /New: Wednesday\\, 16 Sept 2026\\, 18:00/)
  assert.match(result, /Based on your reported experience/)
  assert.match(result, /Original spacing: 23 hours between sessions. Revised spacing: 47 hours between sessions/)
  assert.match(result, /Thursday class stays/)
  assert.match(result, /Another day before lifting/)
  assert.match(
    result,
    /full 60-minute session fits Wednesday 18:00–19:00 at City Gym/,
  )
  assert.match(result, /Required equipment: barbell/)
  assert.match(result, /Training study: https:\/\/example.test\/study/)
})

test('negative exported gaps describe an overlap instead of available recovery time', () => {
  const options = input()
  options.plan.changes = [{ sessionId: 'strength', from: { day: 0, startTime: '18:00' }, to: { day: 0, startTime: '19:00' },
    basis: 'schedule', beforeGap: -15, afterGap: 45 }]
  const result = parsedCalendar(buildPlanCalendar(options))[0].description
  assert.match(result, /Original spacing: sessions overlap by 15 minutes/)
  assert.match(result, /Revised spacing: 45 minutes between sessions/)
  assert.doesNotMatch(result, /-15 minutes|Original spacing: 15 minutes between/)
  options.plan.changes[0].beforeGap = 0
  assert.match(parsedCalendar(buildPlanCalendar(options))[0].description, /Original spacing: no gap between sessions/)
})

test('escaping and line folding preserve Unicode without broken bytes or properties', () => {
  const value = 'Café 🏋 '.repeat(20) + ', sets; rest\\next\nline\rLAST'
  const folded = foldCalendarLine(`DESCRIPTION:${escapeCalendarText(value)}`)
  for (const line of folded.split('\r\n'))
    assert.ok(new TextEncoder().encode(line).length <= 75)
  assert.equal(unfold(folded), `DESCRIPTION:${escapeCalendarText(value)}`)
  assert.equal(
    escapeCalendarText('one\r\ntwo\rthree\nfour,;\\'),
    'one\\ntwo\\nthree\\nfour\\,\\;\\\\',
  )
})

test('invalid dates, end dates, time zones, duplicate sessions and incomplete bookings fail clearly', () => {
  assert.throws(
    () => buildPlanCalendar(input({ weekStart: '2026-02-30' })),
    /valid/,
  )
  assert.throws(
    () => buildPlanCalendar(input({ weekStart: '2026-09-15' })),
    /Monday/,
  )
  assert.throws(
    () => buildPlanCalendar(input({ repeatUntil: '2026-09-13' })),
    /on or after/,
  )
  const badZone = input()
  badZone.audit.timeZone = 'Wrong/Place'
  assert.throws(() => buildPlanCalendar(badZone), /time zone/)
  const duplicates = input()
  duplicates.plan.sessions.push(duplicates.plan.sessions[0])
  assert.throws(() => buildPlanCalendar(duplicates), /unique reference/)
  const incomplete = input()
  incomplete.plan.sessions[0].duration = ''
  assert.throws(() => buildPlanCalendar(incomplete), /duration/)
})

function parsedCalendar(value) {
  const calendar = new ICAL.Component(ICAL.parse(value))
  for (const component of calendar.getAllSubcomponents('vtimezone'))
    ICAL.TimezoneService.register(new ICAL.Timezone(component))
  const components = calendar.getAllSubcomponents('vevent')
  return components
    .filter((component) => !component.hasProperty('recurrence-id'))
    .map((component) => {
      const event = new ICAL.Event(component)
      for (const exception of components.filter(
        (item) =>
          item.hasProperty('recurrence-id') &&
          item.getFirstPropertyValue('uid') === event.uid,
      ))
        event.relateException(exception)
      return event
    })
}

test('independent parser expands both DST transitions with the same local start', () => {
  for (const [weekStart, repeatUntil, expected] of [
    [
      '2026-03-23',
      '2026-04-06',
      [
        '2026-03-23T18:00:00.000Z',
        '2026-03-30T17:00:00.000Z',
        '2026-04-06T17:00:00.000Z',
      ],
    ],
    [
      '2026-10-19',
      '2026-11-02',
      [
        '2026-10-19T17:00:00.000Z',
        '2026-10-26T18:00:00.000Z',
        '2026-11-02T18:00:00.000Z',
      ],
    ],
  ]) {
    const event = parsedCalendar(
      buildPlanCalendar(input({ weekStart, repeatUntil })),
    )[0]
    const iterator = event.iterator(),
      actual = []
    for (
      let occurrence = iterator.next();
      occurrence;
      occurrence = iterator.next()
    ) {
      assert.equal(occurrence.hour, 18)
      actual.push(occurrence.toJSDate().toISOString())
    }
    assert.deepEqual(actual, expected)
  }
})

test('independent parser preserves elapsed booking duration through a clock change', () => {
  for (const [weekStart, repeatUntil] of [
    ['2026-03-16', '2026-04-05'],
    ['2026-10-12', '2026-11-01'],
  ]) {
    const options = input({ weekStart, repeatUntil })
    Object.assign(options.plan.sessions[0], {
      day: 6,
      startTime: '00:30',
      duration: 150,
    })
    const event = parsedCalendar(buildPlanCalendar(options))[0],
      iterator = event.iterator()
    for (
      let occurrence = iterator.next();
      occurrence;
      occurrence = iterator.next()
    ) {
      const details = event.getOccurrenceDetails(occurrence)
      assert.equal(
        (details.endDate.toJSDate() - details.startDate.toJSDate()) / 60000,
        150,
      )
    }
    delete options.repeatUntil
    options.weekStart = weekStart === '2026-03-16' ? '2026-03-23' : '2026-10-19'
    const single = parsedCalendar(buildPlanCalendar(options))[0]
    assert.equal(
      (single.endDate.toJSDate() - single.startDate.toJSDate()) / 60000,
      150,
    )
  }
})

test('independent parser recovers folded Unicode descriptions and exact multi-day ends', () => {
  const options = input()
  Object.assign(options.plan.sessions[0], {
    name: 'Café séance',
    day: 6,
    startTime: '23:30',
    duration: 150,
    exercises: 'Développé épaules, 3 séries; récupération. '.repeat(5),
  })
  const event = parsedCalendar(buildPlanCalendar(options))[0]
  assert.equal(event.summary, options.plan.sessions[0].name)
  assert.equal(event.description, options.plan.sessions[0].exercises)
  assert.equal(event.endDate.toString(), '2026-09-21T02:00:00')
})
