import {
  bookingDuration,
  clock,
  dayLabel,
  dayOptions,
  EFFORTS,
  parseClock,
} from './planning-model.js'
import { resolveCalendarTime } from './calendar.js'

export function Arrow({ back = false }) {
  return (
    <svg
      className="planner-arrow"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={back ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path
        d="M4 12h15m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
export function Field({ label, hint, children, error }) {
  return (
    <label className="stress-map-field">
      <span className="stress-map-field__label">{label}</span>
      {hint && <span className="stress-map-field__hint">{hint}</span>}
      {children}
      {error && <span className="stress-map-field__error">{error}</span>}
    </label>
  )
}
export function sessionKind(session) {
  if (session.components?.length) return ['mixed', 'Separate parts']
  if (/run|bike|cycle|row/.test(session.type)) return ['endurance', 'Endurance']
  if (/strength|hypertrophy|weightlifting/.test(session.type))
    return ['strength', 'Strength']
  if (/custom|mobility/.test(session.type))
    return ['other', session.type === 'mobility' ? 'Mobility' : 'Other']
  return ['mixed', 'Mixed training or sport']
}
export function finishTime(audit, session) {
  const start = parseClock(session.startTime)
  const end = start + bookingDuration(session)
  if (audit?.weekMode === 'specific' && audit.weekStart) {
    const date = new Date(`${audit.weekStart}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + session.day)
    const dateText = date.toISOString().slice(0, 10)
    const epoch =
      resolveCalendarTime(dateText, session.startTime, audit.timeZone) +
      bookingDuration(session) * 60000
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: audit.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date(epoch))
        .map((part) => [part.type, part.value]),
    )
    return {
      endTime: `${parts.hour}:${parts.minute}`,
      nextDay: `${parts.year}-${parts.month}-${parts.day}` !== dateText,
    }
  }
  return { endTime: clock(end), nextDay: end >= 1440 }
}
export function timing(audit, session) {
  let finish
  try {
    finish = finishTime(audit, session)
  } catch {
    return `${dayLabel(audit, session.day)} ${session.startTime} (check the date and time)`
  }
  return `${dayLabel(audit, session.day)} ${session.startTime}–${finish.endTime}${finish.nextDay ? ' (next day)' : ''}`
}
export function Legend() {
  return (
    <div className="planner-legend" aria-label="Calendar colour legend">
      <span>
        <i data-kind="strength" />
        Strength
      </span>
      <span>
        <i data-kind="endurance" />
        Endurance
      </span>
      <span>
        <i data-kind="mixed" />
        Mixed training or sport
      </span>
      <span>
        <i data-kind="other" />
        Other or mobility
      </span>
      <span className="planner-tag">Priority</span>
      <span className="planner-tag">Fixed</span>
      <span className="planner-tag planner-tag--moved">Moved</span>
    </div>
  )
}
export function WeekCalendar({
  audit,
  sessions = audit.sessions,
  changes = [],
  onEdit,
  onDuplicate,
  onRemove,
  label = 'Training week',
}) {
  return (
    <section className="planner-calendar" aria-label={label}>
      <Legend />
      <div className="planner-week">
        {dayOptions(audit).map((day) => (
          <article className="planner-day" key={day.value}>
            <header>
              <b>{day.label}</b>
              {day.date && (
                <small>
                  {new Date(`${day.date}T12:00Z`).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'UTC',
                  })}
                </small>
              )}
            </header>
            <div className="planner-day-sessions">
              {sessions
                .filter((s) => s.day === day.value)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((session) => {
                  const [kind, kindLabel] = sessionKind(session)
                  const change = changes.find((c) => c.sessionId === session.id)
                  let finish
                  try {
                    finish = finishTime(audit, session)
                  } catch {
                    finish = { endTime: 'Check time', nextDay: false }
                  }
                  return (
                    <article
                      className={`planner-session ${change ? 'planner-session--moved' : ''}`}
                      data-kind={kind}
                      key={session.id}
                    >
                      <div className="planner-session-time">
                        {session.startTime}–{finish.endTime}
                        {finish.nextDay && <small>Next day</small>}
                      </div>
                      <h4>
                        {onEdit ? (
                          <button type="button" onClick={() => onEdit(session)}>
                            {session.name}
                          </button>
                        ) : (
                          session.name
                        )}
                      </h4>
                      <p className="planner-session-kind">{kindLabel}</p>
                      <div className="planner-tags">
                        {session.priority && (
                          <span className="planner-tag">Priority</span>
                        )}
                        {session.mobility === 'fixed' && (
                          <span className="planner-tag">Fixed</span>
                        )}
                        {change && (
                          <span className="planner-tag planner-tag--moved">
                            Moved
                          </span>
                        )}
                      </div>
                      {session.location && <p>{session.location}</p>}
                      {session.components?.length ? (
                        <details>
                          <summary>
                            {session.components.length} parts ·{' '}
                            {bookingDuration(session)} min
                          </summary>
                          <ol>
                            {session.components.map((part) => (
                              <li key={part.id}>
                                {part.name || 'Unnamed part'}{' '}
                                <b>{part.duration} min</b>
                                {Number(part.breakAfter) > 0 && (
                                  <small>
                                    {part.breakAfter} min break afterwards
                                  </small>
                                )}
                              </li>
                            ))}
                          </ol>
                        </details>
                      ) : (
                        <p className="planner-effort">
                          {EFFORTS.find(
                            ([value]) => value === session.effort,
                          )?.[1] || 'Effort not entered'}
                        </p>
                      )}
                      {change && (
                        <p className="planner-moved-from">
                          From {dayLabel(audit, change.from.day)}{' '}
                          {change.from.startTime}
                        </p>
                      )}
                      {onDuplicate && (
                        <div className="planner-card-actions">
                          <button
                            type="button"
                            onClick={() => onDuplicate(session)}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemove(session)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              {!sessions.some((s) => s.day === day.value) && (
                <p className="planner-empty-day">No session</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
