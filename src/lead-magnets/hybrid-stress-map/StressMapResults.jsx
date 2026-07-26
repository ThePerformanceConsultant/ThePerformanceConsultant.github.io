'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  BODY_AREAS,
  DAYS,
  DOMAIN_DEFINITIONS,
  EVIDENCE_REFERENCES,
} from './constants.js'
import { formatLoad, formatPercent } from './engine.js'

function ResultEyebrow({ children }) {
  return <p className="stress-map-result-eyebrow">{children}</p>
}

function Fingerprint({ stress, compact = false }) {
  return (
    <div className={`stress-map-fingerprint ${compact ? 'stress-map-fingerprint--compact' : ''}`}>
      {DOMAIN_DEFINITIONS.map((domain) => {
        const score = Number(stress?.[domain.key]) || 0
        return (
          <div key={domain.key} title={`${domain.label}: ${score} of 3`}>
            <span aria-hidden="true">
              <i style={{ '--stress-level': score }} />
            </span>
            <b>{domain.short}</b>
            <small>{score}</small>
          </div>
        )
      })}
    </div>
  )
}

function WeeklyHeatmap({ days }) {
  return (
    <div className="stress-map-heatmap-shell">
      <table className="stress-map-heatmap" aria-label="Maximum daily stress by domain">
        <thead>
          <tr>
            <th className="stress-map-heatmap__corner" scope="col">Domain</th>
            {days.map((day) => <th key={day.value} scope="col">{day.short}</th>)}
          </tr>
        </thead>
        <tbody>
          {DOMAIN_DEFINITIONS.map((domain) => (
            <tr className="stress-map-heatmap__row" key={domain.key}>
              <th scope="row"><span>{domain.label}</span><b>{domain.short}</b></th>
              {days.map((day) => {
                const score = day.domains[domain.key]
                return (
                  <td
                    key={day.value}
                    className={`stress-level-${score}`}
                    aria-label={`${day.label}, ${domain.label}: ${score} of 3`}
                  >
                    {score}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="stress-map-heatmap__legend" aria-label="Stress scale">
        <span><i className="stress-level-0" />0 negligible</span>
        <span><i className="stress-level-1" />1 light</span>
        <span><i className="stress-level-2" />2 substantial</span>
        <span><i className="stress-level-3" />3 dominant or high</span>
      </div>
      <p>Colours describe relative demand. They do not describe danger.</p>
    </div>
  )
}

function WeekBoard({ days, actions, title = 'Current weekly map' }) {
  return (
    <section className="stress-map-week-board" aria-labelledby={`week-board-${title.replaceAll(' ', '-').toLowerCase()}`}>
      <div className="stress-map-result-section__header">
        <ResultEyebrow>Seven-day structure</ResultEyebrow>
        <h3 id={`week-board-${title.replaceAll(' ', '-').toLowerCase()}`}>{title}</h3>
      </div>
      <div className="stress-map-week-grid">
        {days.map((day) => (
          <article key={day.value} className={day.lowStress ? 'is-low-stress' : ''}>
            <header>
              <span>{day.short}</span>
              <b>{day.lowStress ? 'Low stress' : formatLoad(day.plannedLoad)}</b>
            </header>
            <div>
              {day.sessions.length ? day.sessions.map((session) => (
                <div className="stress-map-week-session" key={session.id}>
                  <span>{session.startTime}</span>
                  <h4>{session.label}</h4>
                  {actions?.[session.id] ? <b data-action={actions[session.id].action}>{actions[session.id].label}</b> : null}
                  <Fingerprint stress={session.stress} compact />
                </div>
              )) : <p>No session</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function CollisionCard({ collision, sessionMap }) {
  const sessions = (collision.sessionIds || []).map((id) => sessionMap.get(id)).filter(Boolean)
  return (
    <article className={`stress-map-collision stress-map-collision--${collision.severity}`}>
      <div className="stress-map-collision__top">
        <span>{collision.severity === 'information' ? 'Context' : collision.severity}</span>
        <small>{collision.recoveryAmplified ? 'Recovery context increases review priority' : collision.ruleId.replaceAll('-', ' ')}</small>
      </div>
      <h4>{collision.headline}</h4>
      <p>{collision.explanation}</p>
      {sessions.length ? (
        <div className="stress-map-collision__sessions">
          {sessions.map((session) => <span key={session.id}>{DAYS[session.day].short} · {session.label}</span>)}
        </div>
      ) : null}
      <details>
        <summary>Review options</summary>
        <ul>{collision.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
      </details>
    </article>
  )
}

function CopySummaryButton({ analysis }) {
  const [state, setState] = useState('idle')
  const actor = analysis.sessions.find((session) => session.id === analysis.mainFinding?.actorSessionId)
  const action = actor ? analysis.actions[actor.id] : null
  const summary = [
    `Hybrid Training Week Stress Map`,
    `Priority 1: ${analysis.profile.priority1}`,
    `Priority 2: ${analysis.profile.priority2}`,
    `Result: ${analysis.statusCopy.title}`,
    `Main finding: ${analysis.mainFinding?.headline || 'No major structural collision identified.'}`,
    `Session to protect: ${analysis.sessionToProtect?.label || 'No specific session identified.'}`,
    `First change: ${actor && action ? `${action.label}: ${actor.label}` : 'No immediate change identified.'}`,
    `Leave unchanged: ${analysis.leaveUnchanged?.label || 'Review after completing the week.'}`,
    `Planned weekly load: ${formatLoad(analysis.totalLoad)} arbitrary units`,
    `Unstructured load share: ${formatPercent(analysis.progression.unstructuredShare)}`,
    `Scope: This is a programming audit, not an injury-prediction tool.`,
  ].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setState('copied')
      window.setTimeout(() => setState('idle'), 1800)
    } catch {
      setState('error')
    }
  }

  return (
    <button type="button" className="stress-map-button stress-map-button--ghost-light" onClick={copy}>
      {state === 'copied' ? 'Summary copied' : state === 'error' ? 'Copy unavailable' : 'Copy summary'}
    </button>
  )
}

function RevisedWeek({ analysis }) {
  const revision = analysis.revisedWeek
  if (!revision) return null
  const revisedHeading = revision.status === 'moved'
    ? 'A revised week, based only on the availability you entered.'
    : revision.status === 'rotate'
      ? 'A rotation test that removes one automatic weekly addition.'
      : 'No automatic revision has been made.'
  const revisionLabel = {
    moved: 'Suggested move',
    rotate: 'Rotation test',
    modify: 'Dose or modality decision',
    manual: 'Manual decision',
    unchanged: 'Original structure retained',
  }[revision.status] || 'Review decision'

  const revisedDays = DAYS.map((day) => ({
    ...day,
    sessions: revision.sessions.filter((session) => session.day === day.value),
  }))

  return (
    <section className="stress-map-revision">
      <div className="stress-map-result-section__header">
        <ResultEyebrow>Test structure</ResultEyebrow>
        <h3>{revisedHeading}</h3>
      </div>
      <div className={`stress-map-revision__notice stress-map-revision__notice--${revision.status}`}>
        <span>{revisionLabel}</span>
        <p>{revision.message}</p>
      </div>
      <div className="stress-map-revision__grid">
        {revisedDays.map((day) => (
          <article key={day.value}>
            <span>{day.short}</span>
            <div>
              {day.sessions.length
                ? day.sessions.map((session) => <p key={session.id}>{session.label}</p>)
                : <p>Low-stress or no session</p>}
            </div>
          </article>
        ))}
      </div>
      <p className="stress-map-revision__scope">
        No session has been automatically moved to an unavailable time. Recalculate after changing dose, modality or position.
      </p>
    </section>
  )
}

function BodyAreaWatchlist({ analysis }) {
  const selected = new Set(analysis.profile.bodyConcerns || [])
  const areas = BODY_AREAS.map((area) => ({
    area,
    concerned: selected.has(area),
    sessions: analysis.sessions.filter((session) => session.bodyAreas.includes(area)),
  })).filter((item) => item.concerned || item.sessions.length >= 2)

  if (!areas.length) return null

  return (
    <section className="stress-map-watchlist">
      <div className="stress-map-result-section__header">
        <ResultEyebrow>Body-area watchlist</ResultEyebrow>
        <h3>Repeated exposure, displayed without assigning injury probability.</h3>
      </div>
      <div className="stress-map-watchlist__grid">
        {areas.map((item) => (
          <article key={item.area} className={item.concerned ? 'is-concern' : ''}>
            <header>
              <h4>{item.area}</h4>
              <span>{item.sessions.length} session{item.sessions.length === 1 ? '' : 's'}</span>
            </header>
            {item.sessions.length
              ? <p>{item.sessions.map((session) => `${DAYS[session.day].short} ${session.label}`).join(' · ')}</p>
              : <p>No session was tagged with substantial exposure.</p>}
          </article>
        ))}
      </div>
    </section>
  )
}

function ReviewPanel({ analysis, onReviewMode }) {
  const review = analysis.review
  const reviewLabel = (value) => ({
    yes: 'Completed as planned',
    partly: 'Partly completed',
    no: 'Not completed as planned',
    better: 'Better than target',
    expected: 'As expected',
    worse: 'Worse than target',
    time: 'Time',
    fatigue: 'Fatigue',
    pain: 'Pain',
    'class-content': 'Class content',
    motivation: 'Motivation',
    other: 'Other',
  }[value] || '')
  return (
    <section className="stress-map-review-panel">
      <div className="stress-map-result-section__header">
        <ResultEyebrow>Seven-day review</ResultEyebrow>
        <h3>Compare the week you planned with the week you completed.</h3>
      </div>
      {!review.reviewed.length ? (
        <div className="stress-map-review-panel__empty">
          <p>Complete the training week, then record actual duration and overall session RPE. The tool will highlight repeated differences between plan and practice.</p>
          <button type="button" className="stress-map-button stress-map-button--dark" onClick={onReviewMode}>Open review mode</button>
        </div>
      ) : (
        <>
          <div className="stress-map-review-metrics">
            <div><span>Review coverage</span><strong>{formatPercent(review.coverage)}</strong></div>
            <div>
              <span>Actual weekly load</span>
              <strong>{formatLoad(review.actualTotal)}</strong>
              {review.actualTotal == null ? <small>Complete duration and RPE for every session</small> : null}
            </div>
            <div><span>Sessions above plan</span><strong>{review.warnings.length}</strong></div>
          </div>
          {review.weeklyAbovePlan ? (
            <div className="stress-map-review-warning">
              <span>Actual load above plan</span>
              <p>Your week is more demanding in practice than it appears on paper. Review unknown class content, extended sessions, spontaneous accessories and “easy” work becoming moderate.</p>
            </div>
          ) : null}
          <div className="stress-map-review-sessions">
            {review.reviewed.map((session) => (
              <article key={session.id}>
                <div>
                  <span>{DAYS[session.day].short} · {session.label}</span>
                  <strong>{session.actualDuration} min × RPE {session.actualRpe} = {formatLoad(session.actualLoad)}</strong>
                </div>
                <p>
                  {[
                    reviewLabel(session.review?.completion),
                    reviewLabel(session.review?.performance),
                    session.review?.soreness !== '' && session.review?.soreness != null
                      ? `Soreness ${session.review.soreness}/10`
                      : '',
                    session.review?.fatigue !== '' && session.review?.fatigue != null
                      ? `Fatigue ${session.review.fatigue}/10`
                      : '',
                    session.review?.deviationReason
                      ? `Deviation: ${reviewLabel(session.review.deviationReason)}`
                      : '',
                  ].filter(Boolean).join(' · ') || 'No additional response context entered.'}
                </p>
              </article>
            ))}
          </div>
          {review.pain.length ? (
            <div className="stress-map-clinical-note">
              Pain changed movement in {review.pain.length} session{review.pain.length === 1 ? '' : 's'}. This should be assessed appropriately rather than converted into a stress score.
            </div>
          ) : null}
          <button type="button" className="stress-map-button stress-map-button--dark" onClick={onReviewMode}>Edit review entries</button>
        </>
      )}
    </section>
  )
}

export function StressMapResults({ analysis, onEdit, onReviewMode, onReset }) {
  const reduceMotion = useReducedMotion()
  const resultHeadingRef = useRef(null)
  const sessionMap = useMemo(() => new Map(analysis.sessions.map((session) => [session.id, session])), [analysis.sessions])
  const firstActor = analysis.sessions.find((session) => session.id === analysis.mainFinding?.actorSessionId)
  const firstAction = firstActor ? analysis.actions[firstActor.id] : null

  useEffect(() => {
    resultHeadingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <motion.div
      className="stress-map-results"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <section className={`stress-map-result-hero stress-map-result-hero--${analysis.status}`}>
        <div className="stress-map-result-hero__signal" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="stress-map-result-hero__copy">
          <ResultEyebrow>{analysis.statusCopy.eyebrow}</ResultEyebrow>
          <h2 ref={resultHeadingRef} tabIndex="-1">{analysis.statusCopy.title}</h2>
          <p>{analysis.statusCopy.summary}</p>
        </div>
        <div className="stress-map-result-hero__actions">
          <CopySummaryButton analysis={analysis} />
          <button type="button" className="stress-map-button stress-map-button--signal" onClick={() => window.print()}>
            Print or save PDF
          </button>
        </div>
        <div className="stress-map-result-hero__scope">
          <span>Programming audit</span>
          <p>This result does not calculate readiness, tolerance or injury risk.</p>
        </div>
      </section>

      <section className="stress-map-result-decisions">
        <article>
          <span>01 · Main finding</span>
          <h3>{analysis.mainFinding?.headline || 'No clear structural collision was identified.'}</h3>
          <p>{analysis.mainFinding?.explanation || 'Complete the week and compare planned with actual session RPE before changing the structure.'}</p>
        </article>
        <article>
          <span>02 · Protect</span>
          <h3>{analysis.sessionToProtect?.label || 'No specific session identified'}</h3>
          <p>{analysis.sessionToProtect
            ? 'This progressive Priority 1 session should receive the highest realistic freshness.'
            : 'Define at least one progressive Priority 1 session before making further changes.'}</p>
        </article>
        <article>
          <span>03 · First change</span>
          <h3>{firstActor && firstAction ? `${firstAction.label}: ${firstActor.label}` : 'Leave the order unchanged for now'}</h3>
          <p>{firstAction?.description || 'The audit does not support inventing a change without clearer evidence.'}</p>
        </article>
        <article>
          <span>04 · Leave unchanged</span>
          <h3>{analysis.leaveUnchanged?.label || 'Complete the seven-day review'}</h3>
          <p>{analysis.leaveUnchanged
            ? 'This session has a clear role and is not the first source of conflict.'
            : 'Do not move sessions simply to obtain a different colour.'}</p>
        </article>
      </section>

      <section className="stress-map-metrics" aria-label="Weekly analysis">
        <article>
          <span>Planned weekly load</span>
          <strong>{formatLoad(analysis.metrics.totalLoad)}</strong>
          <p>Arbitrary units, interpreted within this week.</p>
        </article>
        <article>
          <span>Unstructured load share</span>
          <strong>{formatPercent(analysis.metrics.unstructuredShare)}</strong>
          <p>{analysis.progression.shareLabel}.</p>
        </article>
        <article>
          <span>Collision flags</span>
          <strong>{analysis.metrics.redCollisions}<small> red</small></strong>
          <p>{analysis.metrics.amberCollisions} amber review flag{analysis.metrics.amberCollisions === 1 ? '' : 's'}.</p>
        </article>
        <article>
          <span>Recovery context</span>
          <strong>{analysis.recovery.label}</strong>
          <p>{analysis.recovery.count} contextual factor{analysis.recovery.count === 1 ? '' : 's'} selected.</p>
        </article>
      </section>

      <section className="stress-map-result-section stress-map-result-section--heatmap">
        <div className="stress-map-result-section__header">
          <ResultEyebrow>Stress fingerprint</ResultEyebrow>
          <h3>Different sessions can repeat the same demand.</h3>
          <p>Each cell shows the highest score reached on that day. Session-RPE load remains separate.</p>
        </div>
        <WeeklyHeatmap days={analysis.days} />
      </section>

      <WeekBoard days={analysis.days} actions={analysis.actions} />

      <section className="stress-map-action-table">
        <div className="stress-map-result-section__header">
          <ResultEyebrow>Session actions</ResultEyebrow>
          <h3>Protect, keep, move, modify or rotate.</h3>
        </div>
        <div>
          {analysis.sessions.map((session) => {
            const action = analysis.actions[session.id]
            return (
              <article key={session.id}>
                <div>
                  <span>{DAYS[session.day].short} · {session.startTime}</span>
                  <h4>{session.label}</h4>
                </div>
                <Fingerprint stress={session.stress} compact />
                <div>
                  <b data-action={action.action}>{action.label}</b>
                  <p>{action.description}</p>
                  {action.secondary ? <small>{action.secondary}</small> : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="stress-map-collisions-section">
        <div className="stress-map-result-section__header">
          <ResultEyebrow>Collision review</ResultEyebrow>
          <h3>{analysis.collisions.length
            ? `${analysis.collisions.length} finding${analysis.collisions.length === 1 ? '' : 's'} to interpret in context.`
            : 'No collision rule was activated.'}</h3>
          <p>One session can activate more than one rule. Review the main cause before making several changes.</p>
        </div>
        {analysis.collisions.length ? (
          <div className="stress-map-collisions-grid">
            {analysis.collisions.map((collision) => (
              <CollisionCard key={collision.id} collision={collision} sessionMap={sessionMap} />
            ))}
          </div>
        ) : (
          <div className="stress-map-empty-result">
            <p>Complete the planned week and compare actual RPE before increasing volume or adding another hard exposure.</p>
          </div>
        )}
      </section>

      <BodyAreaWatchlist analysis={analysis} />
      <RevisedWeek analysis={analysis} />

      <section className="stress-map-seven-day-test">
        <div>
          <ResultEyebrow>Seven-day test</ResultEyebrow>
          <h3>Change one decision, then review the response.</h3>
        </div>
        <ol>
          <li><span>01</span><p>Keep the Priority 1 session and its progression visible.</p></li>
          <li><span>02</span><p>Change the lowest-priority collision first. Preserve total volume during a sequencing test where practical.</p></li>
          <li><span>03</span><p>Record actual duration and overall session RPE after each session.</p></li>
          <li><span>04</span><p>Compare performance, soreness, fatigue and any pain that changed movement.</p></li>
          <li><span>05</span><p>Change the map when the same collision or plan-to-actual difference persists.</p></li>
        </ol>
      </section>

      <ReviewPanel analysis={analysis} onReviewMode={onReviewMode} />

      <section className="stress-map-coaching-route">
        <div>
          <ResultEyebrow>Where individual coaching may help</ResultEyebrow>
          <h3>{analysis.coaching.name} · {analysis.coaching.label}</h3>
          <p>{analysis.coaching.reason}</p>
        </div>
        <div>
          <strong>{analysis.coaching.price}</strong>
          {analysis.coaching.name !== 'Review' ? <a className="stress-map-button stress-map-button--signal" href="/?apply=1">Apply for coaching</a> : null}
        </div>
      </section>

      <section className="stress-map-methodology">
        <div className="stress-map-result-section__header">
          <ResultEyebrow>Methodological boundary</ResultEyebrow>
          <h3>What this tool can and cannot establish.</h3>
        </div>
        <div className="stress-map-methodology__grid">
          <article>
            <span>Concurrent training</span>
            <p>Strength and endurance training are not inherently incompatible. The map protects explosive, power and technical sessions where overlapping work may affect their quality. It does not automatically remove endurance work.</p>
          </article>
          <article>
            <span>Session-RPE</span>
            <p>Duration multiplied by overall session RPE compares relative internal load within the same athlete. It does not quantify external mechanical work or make different stress types interchangeable.</p>
          </article>
          <article>
            <span>Running novelty</span>
            <p>A run more than 10% longer than the previous 30-day maximum activates a review warning. The cohort finding is observational and does not establish a safe threshold or individual injury probability.</p>
          </article>
          <article>
            <span>Recovery context</span>
            <p>Sleep, stress, energy availability, illness, pain and recent training history change how findings should be prioritised. They do not produce a readiness score.</p>
          </article>
        </div>
        <details className="stress-map-reference-list">
          <summary>Evidence and references</summary>
          <ol>
            {EVIDENCE_REFERENCES.map((reference) => (
              <li key={reference.number}>
                <span>{reference.number}</span>
                <p>{reference.citation} <a href={reference.href} target="_blank" rel="noreferrer">{reference.title}</a></p>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <footer className="stress-map-results__footer">
        <button type="button" className="stress-map-button stress-map-button--dark" onClick={onEdit}>Edit the week</button>
        <button type="button" className="stress-map-button stress-map-button--ghost" onClick={onReset}>Start a new map</button>
      </footer>
    </motion.div>
  )
}
