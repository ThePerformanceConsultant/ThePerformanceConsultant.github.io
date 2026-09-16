import { bookingDuration, formatGap, parseClock } from './planning-model.js'

const DAY = 86400000
const pad = (value) => String(value).padStart(2, '0')
const dateText = (epoch) => new Date(epoch).toISOString().slice(0, 10)
const stamp = (epoch) =>
  new Date(epoch)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
const formatters = new Map()
function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || ''))
    throw new Error(`Choose a valid ${label}.`)
  const epoch = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(epoch) || dateText(epoch) !== value)
    throw new Error(`Choose a valid ${label}.`)
  return epoch
}
function formatter(zone) {
  if (typeof zone !== 'string' || !zone)
    throw new Error('Choose a valid time zone before downloading the calendar.')
  if (!formatters.has(zone)) {
    try {
      formatters.set(
        zone,
        new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {
          timeZone: zone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        }),
      )
    } catch {
      throw new Error(
        'Choose a valid time zone before downloading the calendar.',
      )
    }
  }
  return formatters.get(zone)
}
function wallTime(epoch, zone) {
  const parts = Object.fromEntries(
    formatter(zone)
      .formatToParts(new Date(epoch))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
}
function offsetAt(epoch, zone) {
  return wallTime(epoch, zone) - Math.floor(epoch / 1000) * 1000
}
export function resolveCalendarTime(date, time, zone) {
  const minute = parseClock(time)
  if (!Number.isFinite(minute))
    throw new Error(
      'Enter a valid session start time before downloading the calendar.',
    )
  const wanted = parseDate(date, 'session date') + minute * 60000
  const offsets = new Set(
    [-48, -24, -12, 0, 12, 24, 48].map((hour) =>
      offsetAt(wanted + hour * 3600000, zone),
    ),
  )
  const matches = [...offsets]
    .map((offset) => wanted - offset)
    .filter((epoch) => wallTime(epoch, zone) === wanted)
  if (matches.length !== 1)
    throw new Error(
      `${date} at ${time} ${matches.length ? 'occurs twice' : 'does not exist'} when the clocks change in ${zone}. Choose another start time before downloading the calendar.`,
    )
  return matches[0]
}
export function escapeCalendarText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}
export function foldCalendarLine(line) {
  const encoder = new TextEncoder()
  let current = '',
    count = 0
  const lines = []
  for (const character of line) {
    const bytes = encoder.encode(character).length
    if (count + bytes > 75) {
      lines.push(current)
      current = ' '
      count = 1
    }
    current += character
    count += bytes
  }
  lines.push(current)
  return lines.join('\r\n')
}
function offsetText(milliseconds) {
  const seconds = Math.abs(milliseconds / 1000)
  return `${milliseconds < 0 ? '-' : '+'}${pad(Math.floor(seconds / 3600))}${pad(Math.floor((seconds % 3600) / 60))}${seconds % 60 ? pad(seconds % 60) : ''}`
}
function timeZoneLines(zone, from, until) {
  const start = Math.floor((from - 370 * DAY) / DAY) * DAY
  const end = until + 2 * DAY
  let previousEpoch = start,
    previousOffset = offsetAt(start, zone)
  const lines = [
    'BEGIN:VTIMEZONE',
    `TZID:${zone}`,
    'BEGIN:STANDARD',
    `DTSTART:${stamp(start + previousOffset)}`,
    `TZOFFSETFROM:${offsetText(previousOffset)}`,
    `TZOFFSETTO:${offsetText(previousOffset)}`,
    'END:STANDARD',
  ]
  for (let probe = start + DAY; probe <= end + DAY; probe += DAY) {
    const nextOffset = offsetAt(probe, zone)
    if (nextOffset !== previousOffset) {
      let lower = previousEpoch,
        upper = probe
      while (upper - lower > 1000) {
        const middle = Math.floor((lower + upper) / 2000) * 1000
        if (offsetAt(middle, zone) === previousOffset) lower = middle
        else upper = middle
      }
      const kind = nextOffset > previousOffset ? 'DAYLIGHT' : 'STANDARD'
      lines.push(
        `BEGIN:${kind}`,
        `DTSTART:${stamp(upper + previousOffset)}`,
        `TZOFFSETFROM:${offsetText(previousOffset)}`,
        `TZOFFSETTO:${offsetText(nextOffset)}`,
        `END:${kind}`,
      )
    }
    previousOffset = nextOffset
    previousEpoch = probe
  }
  return [...lines, 'END:VTIMEZONE']
}
function namedTime(epoch, zone, weekly = false) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'long',
    ...(weekly ? {} : { day: 'numeric', month: 'short', year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(epoch))
}
function positionText(position, anchor, zone, weekly) {
  if (!position || !Number.isInteger(position.day) || !position.startTime)
    return ''
  return namedTime(
    resolveCalendarTime(
      dateText(anchor + position.day * DAY),
      position.startTime,
      zone,
    ),
    zone,
    weekly,
  )
}
function spacingText(minutes) {
  if (minutes < 0) return `sessions overlap by ${formatGap(Math.abs(minutes))}`
  if (minutes === 0) return 'no gap between sessions'
  return `${formatGap(minutes)} between sessions`
}
function describeSession(session, change, anchor, zone, start, weekly = false) {
  const lines = []
  if (session.exercises) lines.push(session.exercises)
  if (session.components?.length) {
    let elapsed = Number(session.startDelay || 0)
    if (elapsed) lines.push(`${elapsed} minutes before the first part.`)
    for (const part of session.components) {
      const partStart = start + elapsed * 60000,
        partEnd = partStart + Number(part.duration) * 60000
      lines.push(
        `${part.name || part.label || 'Session part'}: ${namedTime(partStart, zone, weekly)} to ${namedTime(partEnd, zone, weekly)} (${part.duration} minutes)${Number(part.breakAfter) ? `, then ${part.breakAfter} minutes break` : ''}.`,
      )
      if (part.exercises) lines.push(part.exercises)
      elapsed += Number(part.duration) + Number(part.breakAfter || 0)
    }
  }
  if (change) {
    const before = positionText(change.from, anchor, zone, weekly),
      after = positionText(change.to, anchor, zone, weekly)
    if (before && after) lines.push(`Original: ${before}.`, `New: ${after}.`)
    const basis =
      {
        reported: 'Based on your reported experience',
        'user-reported': 'Based on your reported experience',
        inferred: 'Inferred from the session details you entered',
        timetable: 'Based on your timetable',
        schedule: 'Based on your timetable',
        constraint: 'Based on your timetable',
      }[change.basis] || change.basis
    if (basis) lines.push(String(basis))
    if (change.summary) lines.push(String(change.summary))
    if (change.reason) lines.push(String(change.reason))
    if (change.detail && change.detail !== change.reason)
      lines.push(String(change.detail))
    if (change.availability) lines.push(String(change.availability))
    if (Number.isFinite(change.beforeGap) && Number.isFinite(change.afterGap))
      lines.push(
        `Original spacing: ${spacingText(change.beforeGap)}. Revised spacing: ${spacingText(change.afterGap)}.`,
      )
    for (const consequence of Array.isArray(change.consequences)
      ? change.consequences
      : change.consequences
        ? [change.consequences]
        : [])
      lines.push(
        typeof consequence === 'string'
          ? consequence
          : consequence.detail || consequence.reason || '',
      )
    for (const source of change.mechanismSources || [])
      if (source?.label && source?.url)
        lines.push(`${source.label}: ${source.url}`)
  }
  return lines.filter(Boolean).join('\n')
}
export function buildPlanCalendar({
  audit,
  plan,
  weekStart = audit?.weekStart,
  repeatUntil = '',
  createdAt = new Date(),
}) {
  if (!audit?.id || !Array.isArray(plan?.sessions) || !plan.sessions.length)
    throw new Error('Choose a training week before downloading the calendar.')
  const anchor = parseDate(weekStart, 'first date for this training week')
  const zone = audit.timeZone
  formatter(zone)
  if (audit.weekMode === 'typical' && new Date(anchor).getUTCDay() !== 1)
    throw new Error(
      'Choose a Monday as the first date for your typical training week.',
    )
  if (repeatUntil && audit.weekMode !== 'typical')
    throw new Error(
      'Weekly repetition is available for a typical training week.',
    )
  const lastDate = repeatUntil
    ? parseDate(repeatUntil, 'repeat end date')
    : anchor + 6 * DAY
  if (lastDate < anchor)
    throw new Error(
      'Choose a repeat end date on or after the first training date.',
    )
  const created = new Date(createdAt)
  if (!Number.isFinite(created.getTime()))
    throw new Error('The calendar creation date could not be read.')
  const eventLines = [],
    ids = new Set()
  let earliest = Infinity,
    latest = -Infinity
  for (const session of plan.sessions) {
    if (!session.id || ids.has(session.id))
      throw new Error('Each calendar session needs a unique reference.')
    ids.add(session.id)
    if (!Number.isInteger(session.day) || session.day < 0 || session.day > 6)
      throw new Error('Choose a day for each calendar session.')
    const duration = bookingDuration(session)
    if (!Number.isInteger(duration) || duration <= 0 || duration > 1440)
      throw new Error(
        `Enter a duration in whole minutes for ${session.name || 'each session'}.`,
      )
    const firstDate = anchor + session.day * DAY
    if (repeatUntil && firstDate > lastDate) continue
    const count = repeatUntil
      ? Math.floor((lastDate - firstDate) / (7 * DAY)) + 1
      : 1
    let firstStart, regularStart
    const transitionOccurrences = []
    for (let occurrence = 0; occurrence < count; occurrence++) {
      const start = resolveCalendarTime(
        dateText(firstDate + occurrence * 7 * DAY),
        session.startTime,
        zone,
      )
      firstStart ??= start
      earliest = Math.min(earliest, start)
      latest = Math.max(latest, start + duration * 60000)
      if (offsetAt(start, zone) !== offsetAt(start + duration * 60000, zone))
        transitionOccurrences.push(start)
      else regularStart ??= start
    }
    const uid = `${encodeURIComponent(audit.id)}-${encodeURIComponent(session.id)}@theperformanceconsultant.net`
    const change = plan.changes?.find((item) => item.sessionId === session.id)
    const content = [
      `SUMMARY:${escapeCalendarText(session.name || session.label || 'Training session')}`,
      `DESCRIPTION:${escapeCalendarText(describeSession(session, change, anchor, zone, repeatUntil ? (regularStart ?? firstStart) : firstStart, Boolean(repeatUntil)))}`,
      ...(session.location
        ? [`LOCATION:${escapeCalendarText(session.location)}`]
        : []),
    ]
    const singleAcrossTransition =
      !repeatUntil && transitionOccurrences.length > 0
    eventLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp(created.getTime())}Z`,
      singleAcrossTransition
        ? `DTSTART:${stamp(firstStart)}Z`
        : `DTSTART;TZID=${zone}:${stamp(wallTime(firstStart, zone))}`,
      ...(repeatUntil
        ? [`DURATION:PT${duration}M`]
        : [
            singleAcrossTransition
              ? `DTEND:${stamp(firstStart + duration * 60000)}Z`
              : `DTEND;TZID=${zone}:${stamp(wallTime(firstStart + duration * 60000, zone))}`,
          ]),
      ...content,
    )
    if (repeatUntil) eventLines.push(`RRULE:FREQ=WEEKLY;COUNT=${count}`)
    eventLines.push('END:VEVENT')
    // Explicit UTC exceptions preserve elapsed duration when clocks change during
    // a booking. The recurrence identifier retains the series' local start time.
    if (repeatUntil)
      for (const start of transitionOccurrences)
        eventLines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `RECURRENCE-ID;TZID=${zone}:${stamp(wallTime(start, zone))}`,
          `DTSTAMP:${stamp(created.getTime())}Z`,
          `DTSTART:${stamp(start)}Z`,
          `DTEND:${stamp(start + duration * 60000)}Z`,
          ...content.map((line) =>
            line.startsWith('DESCRIPTION:')
              ? `DESCRIPTION:${escapeCalendarText(describeSession(session, change, anchor, zone, start, true))}`
              : line,
          ),
          'END:VEVENT',
        )
  }
  if (!eventLines.length)
    throw new Error(
      'There are no sessions before the selected repeat end date.',
    )
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Performance Consultant//Training Week//EN',
      'CALSCALE:GREGORIAN',
      ...timeZoneLines(zone, earliest, latest),
      ...eventLines,
      'END:VCALENDAR',
    ]
      .map(foldCalendarLine)
      .join('\r\n') + '\r\n'
  )
}
export function downloadPlanCalendar(options) {
  const calendar = buildPlanCalendar(options)
  const url = URL.createObjectURL(
    new Blob([calendar], { type: 'text/calendar;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'my-training-week.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return calendar
}
