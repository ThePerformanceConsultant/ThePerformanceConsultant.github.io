'use client'

import { useMemo, useState } from 'react'
import { DOMAIN_DEFINITIONS } from './constants.js'
import { analyseWeek } from './engine.js'
import { pairContext } from './planner.js'
import {
  bookingDuration,
  dayLabel,
  formatGap,
  pairKey,
} from './planning-model.js'
import { downloadPlanCalendar } from './calendar.js'
import { Arrow, Field, timing, WeekCalendar } from './PlanningUI.jsx'

const BASIS = {
  schedule: 'From your timetable',
  reported: 'From your experience',
  inferred: 'Inferred from your session details',
}
const ANSWERS = [
  ['yes', 'Yes'],
  ['sometimes', 'Sometimes'],
  ['no', 'No'],
  ['unknown', 'Not sure'],
]
const asText = (value) =>
  typeof value === 'string'
    ? value
    : value?.message || value?.reason || value?.detail || ''

function OptionalDetail({ audit }) {
  const analysis = useMemo(
    () =>
      analyseWeek(
        {
          ...audit,
          sessions: audit.sessions.map((session) => {
            const stress = session.components?.length
              ? Object.fromEntries(
                  DOMAIN_DEFINITIONS.map((domain) => [
                    domain.key,
                    Math.max(
                      0,
                      ...session.components.map((part) =>
                        Number(part.stress?.[domain.key] || 0),
                      ),
                    ),
                  ]),
                )
              : session.stress
            return { ...session, duration: bookingDuration(session), stress }
          }),
        },
        { skipValidation: true, skipRevision: true },
      ),
    [audit],
  )
  return (
    <div className="planner-optional-detail">
      <p>
        The amounts below come from the session types and descriptions you
        confirmed. Select a session in the calendar above to change its details.
      </p>
      <div className="planner-table-scroll">
        <table>
          <caption>Relative demands in the entered sessions</caption>
          <thead>
            <tr>
              <th>Session</th>
              {DOMAIN_DEFINITIONS.map((domain) => (
                <th key={domain.key}>{domain.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.sessions.map((session) => {
              const confirmed = session.components?.length
                ? session.components.every((part) => part.fingerprintConfirmed)
                : session.fingerprintConfirmed
              const analysed = analysis.sessions.find(
                (item) => item.id === session.id,
              )
              return (
                <tr key={session.id}>
                  <th>
                    {dayLabel(audit, session.day)} · {session.name}
                  </th>
                  {DOMAIN_DEFINITIONS.map((domain) => (
                    <td
                      key={domain.key}
                      data-level={
                        confirmed
                          ? analysed?.stress?.[domain.key] || 0
                          : undefined
                      }
                    >
                      {confirmed
                        ? analysed?.stress?.[domain.key] || 0
                        : 'Not set'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="planner-hint">
        0 None · 1 Small amount · 2 Moderate · 3 Substantial
      </p>
      <h3>Progression and completed sessions</h3>
      <div className="planner-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Progression</th>
              <th>Planned effort</th>
              <th>Completed duration / effort</th>
            </tr>
          </thead>
          <tbody>
            {audit.sessions.map((session) => (
              <tr key={session.id}>
                <th>
                  {dayLabel(audit, session.day)} · {session.name}
                </th>
                <td>
                  {{
                    yes: 'Planned progression',
                    partly: 'Repeated; progression unsure',
                    no: 'Sessions vary',
                  }[session.progression] || 'Not entered'}
                </td>
                <td>{session.plannedRpe || 'Not entered'}</td>
                <td>
                  {session.actualDuration
                    ? `${session.actualDuration} min`
                    : 'Not entered'}
                  {session.actualRpe ? ` / ${session.actualRpe}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PairQuestion({ audit, sourceId, targetId, onAnswer, needsUpdate }) {
  const source = audit.sessions.find((session) => session.id === sourceId)
  const target = audit.sessions.find((session) => session.id === targetId)
  if (!source || !target) return null
  const answer = audit.pairResponses[pairKey(sourceId, targetId)]?.answer
  if (!Number.isFinite(pairContext(audit, sourceId, targetId)?.gapMinutes))
    return <p className="planner-hint">Choose the earlier session first.</p>
  return (
    <div className="planner-pair-question">
      <p>
        With the times you entered, have you found that the time between “
        {source.name}” on <strong>{dayLabel(audit, source.day)}</strong> and “
        {target.name}” on <strong>{dayLabel(audit, target.day)}</strong> affects
        “{target.name}” or your sleep?
      </p>
      {needsUpdate && (
        <p className="planner-answer-update">
          You previously answered{' '}
          {ANSWERS.find(([value]) => value === answer)?.[1] || 'Not sure'}.
          These session details have changed; update the answer if needed.
        </p>
      )}
      <div
        className="planner-answer-options"
        role="group"
        aria-label={`Experience between ${source.name} on ${dayLabel(audit, source.day)} and ${target.name} on ${dayLabel(audit, target.day)}`}
      >
        {ANSWERS.map(([value, label]) => (
          <button
            type="button"
            aria-pressed={answer === value}
            key={value}
            onClick={() => onAnswer(sourceId, targetId, value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function OtherPair({ audit, onAnswer }) {
  const [sourceId, setSource] = useState('')
  const [targetId, setTarget] = useState('')
  const label = (session) =>
    `${dayLabel(audit, session.day)} ${session.startTime} · ${session.name}`
  return (
    <details className="stress-map-details">
      <summary>Check another pair of sessions</summary>
      <p>
        For example, Thursday’s leg session may still affect Sunday’s long run
        even though another session falls between them. Select both sessions
        below.
      </p>
      <div className="stress-map-field-grid">
        <Field label="Earlier session">
          <select
            value={sourceId}
            onChange={(e) => {
              setSource(e.target.value)
              if (e.target.value === targetId) setTarget('')
            }}
          >
            <option value="">Choose a session</option>
            {audit.sessions.map((session) => (
              <option value={session.id} key={session.id}>
                {label(session)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Later session">
          <select value={targetId} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Choose a session</option>
            {audit.sessions
              .filter((session) => session.id !== sourceId)
              .map((session) => (
                <option value={session.id} key={session.id}>
                  {label(session)}
                </option>
              ))}
          </select>
        </Field>
      </div>
      {sourceId && targetId && (
        <PairQuestion
          audit={audit}
          sourceId={sourceId}
          targetId={targetId}
          onAnswer={onAnswer}
        />
      )}
    </details>
  )
}

function CalendarDownload({ audit, plan }) {
  const [weekStart, setWeekStart] = useState(audit.weekStart || '')
  const [repeat, setRepeat] = useState(false)
  const [repeatUntil, setRepeatUntil] = useState('')
  const timeZone = audit.timeZone
  const [message, setMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const download = () => {
    if (repeat && !repeatUntil) {
      setMessage('Choose the last date for your weekly sessions.')
      return
    }
    try {
      downloadPlanCalendar({
        audit: { ...audit, timeZone },
        plan,
        weekStart,
        repeatUntil: repeat ? repeatUntil : '',
      })
      setMessage('Calendar file downloaded.')
    } catch (error) {
      setMessage(
        error.message ||
          'The calendar could not be downloaded. Check the dates and try again.',
      )
    }
  }
  const copy = async () => {
    const content = [
      'Training Week Stress Map',
      ...plan.sessions.map(
        (session) =>
          `${timing(audit, session)} · ${session.name}${session.location ? ` · ${session.location}` : ''}`,
      ),
      '',
      ...plan.changes
        .flatMap((change) => [
          change.summary,
          change.reason,
          change.detail,
          change.availability,
          ...(change.consequences || []).map(asText),
        ])
        .filter(Boolean),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(content)
      setCopyMessage('Summary copied.')
    } catch {
      setCopyMessage(
        'The browser could not copy the summary. Select and copy the text on this page instead.',
      )
    }
  }
  return (
    <section className="planner-download">
      <div>
        <p className="stress-map-kicker">Your selected week</p>
        <h3>Download your training calendar</h3>
        <p>
          The file includes every session in the selected timetable, with the
          reasons for any moves.
        </p>
      </div>
      <div className="stress-map-field-grid">
        <Field
          label={
            audit.weekMode === 'typical'
              ? 'First Monday'
              : 'First date of this week'
          }
        >
          <input
            type="date"
            value={weekStart}
            disabled={audit.weekMode === 'specific'}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </Field>
        <Field label="Time zone" hint="Set in Available time">
          <input value={timeZone} readOnly />
        </Field>
      </div>
      {audit.weekMode === 'typical' && (
        <>
          <label className="planner-checkbox">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
            />
            Repeat weekly
          </label>
          {repeat && (
            <Field
              label="Repeat until"
              hint="Sessions starting on this date are included."
            >
              <input
                type="date"
                value={repeatUntil}
                min={weekStart}
                onChange={(e) => setRepeatUntil(e.target.value)}
              />
            </Field>
          )}
        </>
      )}
      <div className="planner-add-row">
        <button
          type="button"
          className="stress-map-button stress-map-button--dark"
          onClick={download}
        >
          Download calendar (.ics)
          <Arrow />
        </button>
        <button
          className="stress-map-button stress-map-button--ghost"
          onClick={copy}
        >
          Copy summary
        </button>
      </div>
      <p className="planner-hint">
        For Google Calendar, import the file on a computer.{' '}
        <a
          href="https://support.google.com/calendar/answer/37118?hl=en-uk"
          target="_blank"
          rel="noreferrer"
        >
          Import instructions
        </a>
      </p>
      {message && <p role="status">{message}</p>}
      {copyMessage && <p role="status">{copyMessage}</p>}
    </section>
  )
}

export function StressMapResults({
  audit,
  plan,
  onAnswer,
  onEdit,
  onEditAvailability,
  onEditSessions,
  onAccept,
  onUndo,
}) {
  const [compare, setCompare] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const accepted = audit.acceptedPlan
  const displayPlan = accepted || plan
  const changes = displayPlan.changes || []
  const concerns = plan.concerns || []
  const blockers = plan.blockers || []
  const canAccept = ['proposed', 'unchanged'].includes(plan.status)
  const sentence =
    typeof displayPlan.summary === 'string' ? displayPlan.summary : ''
  return (
    <div className="planner-results">
      <header className="stress-map-step__header">
        <span>03 / 03</span>
        <div>
          <p>{accepted ? 'Your selected week' : 'Your proposed week'}</p>
          <h2>
            {accepted ? (
              <>
                Your training <em>timetable.</em>
              </>
            ) : changes.length ? (
              <>
                {changes.length === 1
                  ? 'One session'
                  : `${changes.length} sessions`}{' '}
                <em>can move.</em>
              </>
            ) : (
              <>
                Review your <em>training week.</em>
              </>
            )}
          </h2>
          {sentence && <p>{sentence}</p>}
        </div>
      </header>
      <section className="planner-summary" aria-label="Summary of changes">
        <div className="planner-summary-numbers">
          <div>
            <strong>
              {displayPlan.sessions?.length || audit.sessions.length}
            </strong>
            <span>Sessions kept</span>
          </div>
          <div>
            <strong>{changes.length}</strong>
            <span>{changes.length === 1 ? 'Change' : 'Changes'}</span>
          </div>
          <div>
            <strong>{audit.sessions.filter((s) => s.priority).length}</strong>
            <span>Priority sessions</span>
          </div>
        </div>
        {changes.length > 0 && (
          <ul>
            {changes.map((change) => (
              <li key={change.sessionId}>
                <strong>
                  {audit.sessions.find((s) => s.id === change.sessionId)?.name}
                </strong>
                <span>
                  {timing(audit, change.from)} <Arrow />{' '}
                  {timing(audit, change.to)}
                </span>
                <p>{change.summary || change.detail || change.reason}</p>
              </li>
            ))}
          </ul>
        )}
        {(plan.remaining || []).length > 0 && (
          <div className="planner-remaining">
            <h3>Still worth reviewing</h3>
            {plan.remaining.map((item, i) => (
              <p key={i}>{asText(item)}</p>
            ))}
          </div>
        )}
      </section>
      {blockers.length > 0 && (
        <section className="planner-blockers">
          <h3>What limits the available changes</h3>
          {blockers.map((blocker, i) => (
            <article key={i}>
              <p>{asText(blocker)}</p>
              {audit.sessions
                .filter((session) =>
                  [blocker.sessionId, ...(blocker.sessionIds || [])].includes(
                    session.id,
                  ),
                )
                .map((session) => (
                  <button
                    key={session.id}
                    className="stress-map-text-button"
                    onClick={() => onEdit(session)}
                  >
                    Edit {session.name} on {dayLabel(audit, session.day)}
                    <Arrow />
                  </button>
                ))}
            </article>
          ))}
          <button
            className="stress-map-button stress-map-button--ghost"
            onClick={onEditAvailability}
          >
            Edit available time
            <Arrow />
          </button>
        </section>
      )}
      {plan.status === 'invalid' && (
        <div className="planner-alert" role="alert">
          {(plan.errors || ['Some session details need to be completed.']).map(
            (error, i) => (
              <div key={i}>
                <p>{asText(error)}</p>
                {error.sessionId &&
                  audit.sessions.some(
                    (session) => session.id === error.sessionId,
                  ) && (
                    <button
                      className="stress-map-text-button"
                      onClick={() =>
                        onEdit(
                          audit.sessions.find(
                            (session) => session.id === error.sessionId,
                          ),
                        )
                      }
                    >
                      Edit this session
                      <Arrow />
                    </button>
                  )}
              </div>
            ),
          )}
          <button
            className="stress-map-button stress-map-button--ghost"
            onClick={onEditAvailability}
          >
            Review available time
          </button>
          <button
            className="stress-map-button stress-map-button--ghost"
            onClick={onEditSessions}
          >
            Review sessions and week dates
          </button>
        </div>
      )}
      <div className="planner-results-actions">
        <div>
          {canAccept && !accepted && (
            <button
              className="stress-map-button stress-map-button--signal"
              onClick={() => onAccept(plan)}
            >
              Use this week
              <Arrow />
            </button>
          )}
          {accepted && (
            <button
              className="stress-map-button stress-map-button--ghost"
              onClick={onUndo}
            >
              Undo selection
            </button>
          )}
          <button
            className="stress-map-button stress-map-button--ghost"
            aria-pressed={compare}
            onClick={() => setCompare(!compare)}
          >
            {compare ? 'Show proposed week' : 'Compare with original'}
          </button>
        </div>
        <p>
          {compare
            ? 'Original timetable'
            : accepted
              ? 'Selected timetable'
              : 'Proposed timetable'}
        </p>
      </div>
      <WeekCalendar
        audit={audit}
        sessions={
          compare ? audit.sessions : displayPlan.sessions || audit.sessions
        }
        changes={compare ? [] : changes}
        onEdit={(session) =>
          onEdit(session, compare ? null : displayPlan.sessions)
        }
        label={compare ? 'Original timetable' : 'Proposed timetable'}
      />
      {changes.length > 0 && (
        <section className="planner-change-list">
          <h3>Why these changes?</h3>
          {changes.map((change, i) => (
            <article className="planner-change" key={change.sessionId}>
              <header>
                <span className="planner-change-number">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="stress-map-kicker">
                    {BASIS[change.basis] || 'Schedule change'}
                  </p>
                  <h4>
                    {
                      audit.sessions.find((s) => s.id === change.sessionId)
                        ?.name
                    }
                  </h4>
                </div>
              </header>
              <div className="planner-change-times">
                <span>
                  <small>Original</small>
                  {timing(audit, change.from)}
                </span>
                <Arrow />
                <span>
                  <small>Proposed</small>
                  {timing(audit, change.to)}
                </span>
              </div>
              <p className="planner-change-reason">{change.reason}</p>
              {change.detail && change.detail !== change.reason && (
                <p>{change.detail}</p>
              )}
              {change.availability && (
                <p className="planner-availability-reason">
                  {change.availability}
                </p>
              )}
              {Number.isFinite(change.beforeGap) &&
                Number.isFinite(change.afterGap) && (
                  <p className="planner-gap">
                    <span>
                      {change.beforeGap < 0 || change.afterGap < 0
                        ? 'Session separation'
                        : 'Time between sessions'}
                    </span>
                    <strong>
                      {change.beforeGap < 0
                        ? `${formatGap(change.beforeGap)} overlap`
                        : formatGap(change.beforeGap)}{' '}
                      <Arrow />{' '}
                      {change.afterGap < 0
                        ? `${formatGap(change.afterGap)} overlap`
                        : formatGap(change.afterGap)}
                    </strong>
                  </p>
                )}
              {change.consequences?.length > 0 && (
                <div className="planner-consequences">
                  <h5>Elsewhere in the week</h5>
                  {change.consequences.map((item, j) => (
                    <p key={j}>{asText(item)}</p>
                  ))}
                </div>
              )}
              {!!change.mechanismSources?.length && (
                <details className="stress-map-details">
                  <summary>Research for this explanation</summary>
                  {change.mechanismSources.map((source) => (
                    <p key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.label}
                      </a>
                    </p>
                  ))}
                </details>
              )}
              {change.sourceId && change.targetId && (
                <details className="stress-map-details">
                  <summary>Add your experience of these sessions</summary>
                  <PairQuestion
                    audit={audit}
                    sourceId={change.sourceId}
                    targetId={change.targetId}
                    onAnswer={onAnswer}
                    needsUpdate={
                      concerns.find(
                        (c) =>
                          c.key === pairKey(change.sourceId, change.targetId),
                      )?.needsUpdate
                    }
                  />
                </details>
              )}
            </article>
          ))}
        </section>
      )}
      {concerns.length > 0 && (
        <section className="planner-concerns">
          <h3>Refine the suggestions with your experience</h3>
          {concerns.map((concern) => {
            const source = audit.sessions.find(
                (s) => s.id === concern.sourceId,
              ),
              target = audit.sessions.find((s) => s.id === concern.targetId)
            return (
              <details className="stress-map-details" key={concern.key}>
                <summary>
                  {source?.name} ({dayLabel(audit, source?.day || 0)}) and{' '}
                  {target?.name} ({dayLabel(audit, target?.day || 0)})
                </summary>
                <p>{concern.reason}</p>
                {concern.basis === 'inferred' && (
                  <button
                    type="button"
                    className="stress-map-button stress-map-button--ghost"
                    onClick={() =>
                      onAnswer(concern.sourceId, concern.targetId, 'no')
                    }
                  >
                    This combination is fine for me
                  </button>
                )}
                <PairQuestion
                  audit={audit}
                  sourceId={concern.sourceId}
                  targetId={concern.targetId}
                  onAnswer={onAnswer}
                  needsUpdate={concern.needsUpdate}
                />
              </details>
            )
          })}
        </section>
      )}
      {audit.sessions.length > 1 && (
        <OtherPair audit={audit} onAnswer={onAnswer} />
      )}
      {accepted && (
        <CalendarDownload
          key={accepted.id || audit.id}
          audit={audit}
          plan={accepted}
        />
      )}
      <details
        className="stress-map-details planner-advanced"
        onToggle={(e) => setAdvanced(e.currentTarget.open)}
      >
        <summary>Optional: session demands, progression and review</summary>
        {advanced && <OptionalDetail audit={audit} />}
      </details>
      <details className="stress-map-details">
        <summary>Research behind the session-spacing suggestions</summary>
        <p>
          Strength training can affect a subsequent run. The response depends on
          the exercises, training experience and the session that follows. The
          map uses your confirmed session details and any experience you add to
          explain its suggestions.
        </p>
        <p>
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/23724883/"
            target="_blank"
            rel="noreferrer"
          >
            Doma and Deakin: strength and endurance training order, running
            economy and performance
          </a>
        </p>
        <p>
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/28553994/"
            target="_blank"
            rel="noreferrer"
          >
            Doma and colleagues: repeated resistance exercise and subsequent
            running performance
          </a>
        </p>
      </details>
    </div>
  )
}
