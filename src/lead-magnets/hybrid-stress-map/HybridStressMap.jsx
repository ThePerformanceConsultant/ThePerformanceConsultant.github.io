'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import '../../styles/stress-map.css'
import {
  BODY_AREAS,
  DAYS,
  EMPTY_AUDIT,
  EMPTY_PROFILE,
  GOAL_OPTIONS,
  HYROX_EXAMPLE,
  RECOVERY_FLAGS,
  SCHEMA_VERSION,
  STORAGE_KEY,
  getRole,
  getSessionType,
  newSession,
} from './constants.js'
import { analyseWeek, formatLoad, validateAudit } from './engine.js'
import { SessionEditor } from './SessionEditor.jsx'
import { StressMapResults } from './StressMapResults.jsx'

const STEPS = [
  { index: '01', label: 'Priorities' },
  { index: '02', label: 'Context' },
  { index: '03', label: 'Week map' },
  { index: '04', label: 'Results' },
]

const cloneEmptyAudit = () => ({
  ...EMPTY_AUDIT,
  profile: {
    ...EMPTY_PROFILE,
    performanceMarkers: ['', ''],
    maintenanceGoals: [],
    recoveryFlags: [],
    bodyConcerns: [],
  },
  sessions: [],
})

function uniqueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`stress-map-field ${className}`}>
      <span className="stress-map-field__label">{label}</span>
      {hint ? <span className="stress-map-field__hint">{hint}</span> : null}
      {children}
      {error ? <span className="stress-map-field__error">{error}</span> : null}
    </label>
  )
}

function Toggle({ checked, label, onChange }) {
  return (
    <label className={`stress-map-toggle ${checked ? 'is-selected' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span aria-hidden="true" />
      <b>{label}</b>
    </label>
  )
}

function StepNav({ current, onSelect }) {
  return (
    <nav className="stress-map-step-nav" aria-label="Stress Map progress">
      {STEPS.map((step, index) => (
        <button
          type="button"
          key={step.label}
          aria-label={`Step ${step.index}: ${step.label}`}
          className={`${current === index ? 'is-current' : ''} ${current > index ? 'is-complete' : ''}`}
          aria-current={current === index ? 'step' : undefined}
          onClick={() => index <= current && onSelect(index)}
          disabled={index > current}
        >
          <span>{step.index}</span>
          <b>{step.label}</b>
        </button>
      ))}
    </nav>
  )
}

function StressMapHeader({ started, currentStep, onSelectStep, onStart }) {
  return (
    <header className="stress-map-header">
      <a href="/" className="stress-map-header__brand" aria-label="Return to The Performance Consultant">
        <img src="/brand/logo-lockup-light.png" alt="The Performance Consultant" />
      </a>
      {started ? <StepNav current={currentStep} onSelect={onSelectStep} /> : (
        <p>Free evidence-led programme audit</p>
      )}
      <button type="button" className="stress-map-header__action" onClick={onStart}>
        {started ? 'Continue map' : 'Start audit'} <span aria-hidden="true">↘</span>
      </button>
    </header>
  )
}

function HeroWeekVisual() {
  const days = [
    ['MON', 'Strength', '3', '1', '0', '1'],
    ['TUE', 'Intervals', '3', '3', '0', '3'],
    ['WED', 'HYROX', '3', '2', '2', '3'],
    ['THU', 'Easy run', '1', '2', '0', '0'],
    ['FRI', 'Strength', '3', '0', '2', '1'],
    ['SAT', 'Long run', '2', '3', '0', '0'],
    ['SUN', 'Review', '0', '0', '0', '0'],
  ]
  return (
    <div className="stress-map-hero-visual" aria-hidden="true">
      <div className="stress-map-hero-visual__head">
        <span>WEEK / 07</span>
        <b>STRESS FINGERPRINT</b>
      </div>
      <div className="stress-map-hero-visual__labels">
        <span>DAY</span><span>SESSION</span><span>FORCE</span><span>IMPACT</span><span>GRIP</span><span>HIGH INT.</span>
      </div>
      {days.map((day, dayIndex) => (
        <motion.div
          key={day[0]}
          className="stress-map-hero-visual__row"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + dayIndex * 0.055, duration: 0.45 }}
        >
          <b>{day[0]}</b>
          <span>{day[1]}</span>
          {day.slice(2).map((score, index) => <i key={index} className={`stress-level-${score}`}>{score}</i>)}
        </motion.div>
      ))}
      <div className="stress-map-hero-visual__scan" />
      <div className="stress-map-hero-visual__finding">
        <span>PRIMARY FINDING</span>
        <p>Impact and metabolic stress repeat within 24 hours.</p>
      </div>
    </div>
  )
}

function Landing({ hasSavedMap, onStart, onExample }) {
  return (
    <>
      <section className="stress-map-hero">
        <div className="stress-map-hero__grid" aria-hidden="true" />
        <div className="stress-map-hero__copy">
          <p className="stress-map-kicker">The Performance Consultant · Free interactive tool</p>
          <h1>
            Does your training week
            <em>actually fit together?</em>
          </h1>
          <p className="stress-map-hero__intro">
            A weekly stress audit for CrossFit, HYROX, strength and multi-disciplinary athletes.
          </p>
          <p className="stress-map-hero__body">
            See what each session is trying to improve, what it costs, and where the week repeatedly loads the same tissues and performance qualities.
          </p>
          <div className="stress-map-hero__actions">
            <button type="button" className="stress-map-button stress-map-button--signal stress-map-button--large" onClick={onStart}>
              {hasSavedMap ? 'Resume my training map' : 'Map my training week'} <span aria-hidden="true">↘</span>
            </button>
            <button type="button" className="stress-map-text-button" onClick={onExample}>Explore a worked HYROX example</button>
          </div>
          <div className="stress-map-hero__requirements">
            <span>No wearable required</span>
            <span>Approximately 10 minutes</span>
            <span>Saved only on this device</span>
          </div>
        </div>
        <HeroWeekVisual />
        <div className="stress-map-hero__scope">
          <span>Important scope</span>
          <p>This is a programming audit rather than an injury-prediction tool. It cannot diagnose an injury or determine individual recovery from one week of data.</p>
        </div>
      </section>

      <section className="stress-map-opening">
        <div className="stress-map-opening__title">
          <p className="stress-map-kicker stress-map-kicker--dark">The audit asks better questions</p>
          <h2>Session count is <em>not enough.</em></h2>
        </div>
        <div className="stress-map-opening__copy">
          <p>The number of sessions in a week does not tell you whether the programme is coherent.</p>
          <ul>
            <li>What is each session intended to improve?</li>
            <li>Which qualities are supposed to progress now?</li>
            <li>Which sessions repeatedly load the same tissues?</li>
            <li>Are important sessions performed with enough freshness?</li>
            <li>How much weekly work has no defined progression?</li>
            <li>Does the programme fit around sleep, work and recovery?</li>
          </ul>
        </div>
      </section>

      <section className="stress-map-method-strip">
        <article><span>01</span><h3>Relative session load</h3><p>Duration × session RPE compares the size of sessions within your own week.</p></article>
        <article><span>02</span><h3>Stress fingerprints</h3><p>Six domains keep mechanical, impact, metabolic and technical demands distinct.</p></article>
        <article><span>03</span><h3>Goal alignment</h3><p>The session that serves Priority 1 receives protection before optional work.</p></article>
        <article><span>04</span><h3>Progression visibility</h3><p>Repeated activity is separated from training with a measurable progression.</p></article>
        <article><span>05</span><h3>Recovery context</h3><p>Sleep, stress, nutrition, illness and pain change the priority of a review.</p></article>
      </section>

      <section className="stress-map-deliverables">
        <div>
          <p className="stress-map-kicker stress-map-kicker--dark">Your completed map</p>
          <h2>One primary finding.<br /><em>One first change.</em></h2>
        </div>
        <ol>
          {[
            'Primary and secondary training priorities',
            'A six-domain fingerprint for every session',
            'Planned and actual session load',
            'Same-day and adjacent-day collision flags',
            'Sessions that compromise higher-priority work',
            'Progression and unstructured-load analysis',
            'A running-distance novelty warning where relevant',
            'Protect, keep, move, modify or rotate actions',
            'A revised seven-day structure',
            'A printable review report',
          ].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}
        </ol>
      </section>
    </>
  )
}

function PriorityStep({ profile, errors, onChange }) {
  const updateArray = (key, value, checked) => {
    const next = new Set(profile[key] || [])
    if (checked) next.add(value)
    else next.delete(value)
    onChange({ [key]: [...next] })
  }

  const updateMarker = (index, value) => {
    const markers = [...(profile.performanceMarkers || ['', ''])]
    markers[index] = value
    onChange({ performanceMarkers: markers })
  }

  return (
    <div className="stress-map-step">
      <header className="stress-map-step__header">
        <span>01 / 04</span>
        <div>
          <p>Goal hierarchy</p>
          <h2>Decide what the week is <em>for.</em></h2>
          <p>The audit cannot protect an important session until the programme has one clear primary outcome.</p>
        </div>
      </header>

      <div className="stress-map-step__body">
        <div className="stress-map-field-grid">
          <Field label="Single most important outcome" hint="Priority 1, for the next 8 to 12 weeks" error={errors.priority1}>
            <select value={profile.priority1} onChange={(event) => onChange({ priority1: event.target.value })} aria-invalid={Boolean(errors.priority1)}>
              <option value="">Choose Priority 1</option>
              {GOAL_OPTIONS.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
            </select>
          </Field>
          <Field label="Most important secondary outcome" hint="Must differ from Priority 1" error={errors.priority2}>
            <select value={profile.priority2} onChange={(event) => onChange({ priority2: event.target.value })} aria-invalid={Boolean(errors.priority2)}>
              <option value="">Choose Priority 2</option>
              {GOAL_OPTIONS.filter((goal) => goal !== profile.priority1).map((goal) => <option key={goal} value={goal}>{goal}</option>)}
            </select>
          </Field>
        </div>

        <fieldset className="stress-map-toggle-field">
          <legend>Which qualities only need to be maintained?</legend>
          <p>Maintenance is legitimate. It should not be mistaken for a quality that must improve now.</p>
          <div className="stress-map-toggle-grid">
            {GOAL_OPTIONS.filter((goal) => goal !== 'Other' && goal !== profile.priority1 && goal !== profile.priority2).map((goal) => (
              <Toggle
                key={goal}
                checked={(profile.maintenanceGoals || []).includes(goal)}
                label={goal}
                onChange={(event) => updateArray('maintenanceGoals', goal, event.target.checked)}
              />
            ))}
          </div>
        </fieldset>

        <div className="stress-map-performance-markers">
          <div>
            <span>Measurable progress</span>
            <h3>Which two markers would prove that the programme is working?</h3>
            <p>Use outcomes such as a five-repetition squat, HYROX run pace, five-kilometre time or Zone 2 pace at a given heart rate.</p>
          </div>
          <div>
            <Field label="Performance marker 1" error={errors.performanceMarkers}>
              <input
                value={profile.performanceMarkers?.[0] || ''}
                onChange={(event) => updateMarker(0, event.target.value)}
                placeholder="For example, HYROX run pace"
                aria-invalid={Boolean(errors.performanceMarkers)}
              />
            </Field>
            <Field label="Performance marker 2">
              <input
                value={profile.performanceMarkers?.[1] || ''}
                onChange={(event) => updateMarker(1, event.target.value)}
                placeholder="For example, five-kilometre time"
                aria-invalid={Boolean(errors.performanceMarkers)}
              />
            </Field>
          </div>
        </div>

        <div className="stress-map-field-grid">
          <Field label="Which sessions are mainly completed for enjoyment or social reasons?" hint="These sessions remain legitimate">
            <textarea
              rows="4"
              value={profile.enjoymentSessions}
              onChange={(event) => onChange({ enjoymentSessions: event.target.value })}
              placeholder="For example, Saturday partner WOD"
            />
          </Field>
          <Field label="Which sessions are genuinely fixed?" hint="Coached, club, group or work-dependent">
            <textarea
              rows="4"
              value={profile.fixedSessions}
              onChange={(event) => onChange({ fixedSessions: event.target.value })}
              placeholder="For example, Tuesday running group"
            />
          </Field>
        </div>

        <Field label="What is the first session you would remove if recovery became insufficient?" hint="If every session is mandatory, the hierarchy is not yet established">
          <input
            value={profile.removeFirst}
            onChange={(event) => onChange({ removeFirst: event.target.value })}
            placeholder="Name the first session you would reconsider"
          />
        </Field>
      </div>
    </div>
  )
}

function ContextStep({ profile, onChange }) {
  const activeFlags = profile.recoveryFlags?.includes('none')
    ? []
    : profile.recoveryFlags || []
  const context = activeFlags.length >= 3 ? 'Limited context' : activeFlags.length === 2 ? 'Constrained context' : 'Normal context'

  const toggleRecovery = (id, checked) => {
    if (id === 'none') {
      onChange({ recoveryFlags: checked ? ['none'] : [] })
      return
    }
    const next = new Set((profile.recoveryFlags || []).filter((item) => item !== 'none'))
    if (checked) next.add(id)
    else next.delete(id)
    onChange({ recoveryFlags: [...next] })
  }

  const toggleConcern = (area, checked) => {
    const next = new Set(profile.bodyConcerns || [])
    if (checked) next.add(area)
    else next.delete(area)
    onChange({ bodyConcerns: [...next] })
  }

  return (
    <div className="stress-map-step">
      <header className="stress-map-step__header">
        <span>02 / 04</span>
        <div>
          <p>Recovery context</p>
          <h2>Does the week fit your <em>current capacity?</em></h2>
          <p>These answers change the priority of a review. They do not create a readiness score.</p>
        </div>
      </header>
      <div className="stress-map-step__body">
        <div className="stress-map-context-readout">
          <div>
            <span>Context classification</span>
            <strong>{context}</strong>
          </div>
          <p>{activeFlags.length} factor{activeFlags.length === 1 ? '' : 's'} selected. The thresholds are pragmatic coaching rules, not validated cut-offs.</p>
        </div>

        <fieldset className="stress-map-toggle-field">
          <legend>Which factors have applied during the last two weeks?</legend>
          <div className="stress-map-toggle-grid stress-map-toggle-grid--context">
            {RECOVERY_FLAGS.map((flag) => (
              <Toggle
                key={flag.id}
                checked={(profile.recoveryFlags || []).includes(flag.id)}
                label={flag.label}
                onChange={(event) => toggleRecovery(flag.id, event.target.checked)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="stress-map-toggle-field">
          <legend>Current body-area concerns</legend>
          <p>The result will display every session that you tag with substantial exposure to a selected area.</p>
          <div className="stress-map-toggle-grid">
            {BODY_AREAS.map((area) => (
              <Toggle
                key={area}
                checked={(profile.bodyConcerns || []).includes(area)}
                label={area}
                onChange={(event) => toggleConcern(area, event.target.checked)}
              />
            ))}
          </div>
        </fieldset>

        {activeFlags.includes('pain-changing-training') ? (
          <div className="stress-map-clinical-note">
            Pain that changes movement, worsens, or produces neurological symptoms requires appropriate assessment rather than a higher score in this tool.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SessionCard({ session, action, onEdit, onDuplicate, onRemove }) {
  const type = getSessionType(session.type)
  const role = getRole(session.role)
  const plannedLoad = (Number(session.duration) || 0) * (Number(session.plannedRpe) || 0)
  return (
    <article className="stress-map-session-card">
      <header>
        <div>
          <span>{DAYS[Number(session.day)]?.short || 'Day'} · {session.startTime}</span>
          <h3>{session.name || type.label}</h3>
        </div>
        <strong>{formatLoad(plannedLoad)}</strong>
      </header>
      <div className="stress-map-session-card__meta">
        <span>RPE {session.plannedRpe}</span>
        <span>{session.duration} min</span>
        <span>Alignment {role.score}</span>
        <span>{session.progression === 'yes' ? 'Progressive' : session.progression === 'partly' ? 'Partly progressive' : 'Unstructured'}</span>
      </div>
      <div className="stress-map-session-card__fingerprint" aria-label="Session stress fingerprint">
        {Object.entries(session.stress || type.stress).map(([key, score]) => (
          <i key={key} className={`stress-level-${score}`} title={`${key}: ${score}`}>{score}</i>
        ))}
      </div>
      {action ? <p className="stress-map-session-card__action">{action}</p> : null}
      <footer>
        <button type="button" onClick={onEdit}>Edit</button>
        <button type="button" onClick={onDuplicate}>Duplicate</button>
        <button type="button" onClick={onRemove}>Remove</button>
      </footer>
    </article>
  )
}

function WeekStep({
  audit,
  analysis,
  errors,
  onMode,
  onAdd,
  onEdit,
  onDuplicate,
  onRemove,
  onExample,
}) {
  const sorted = [...audit.sessions].sort((a, b) => Number(a.day) - Number(b.day) || String(a.startTime).localeCompare(String(b.startTime)))
  return (
    <div className="stress-map-step">
      <header className="stress-map-step__header">
        <span>03 / 04</span>
        <div>
          <p>Week map</p>
          <h2>Record what the sessions <em>actually demand.</em></h2>
          <p>Session-RPE ranks relative internal load. The fingerprint keeps different stress types separate.</p>
        </div>
      </header>
      <div className="stress-map-step__body">
        <div className="stress-map-mode-switch" role="group" aria-label="Audit mode">
          <button
            type="button"
            aria-pressed={audit.mode === 'plan'}
            className={audit.mode === 'plan' ? 'is-active' : ''}
            onClick={() => onMode('plan')}
          >
            <span>Plan mode</span>
            <small>Expected duration and session RPE</small>
          </button>
          <button
            type="button"
            aria-pressed={audit.mode === 'review'}
            className={audit.mode === 'review' ? 'is-active' : ''}
            onClick={() => onMode('review')}
          >
            <span>Review mode</span>
            <small>Add actual load and session response</small>
          </button>
        </div>

        <div className="stress-map-week-toolbar">
          <div>
            <span>{audit.sessions.length} session{audit.sessions.length === 1 ? '' : 's'} entered</span>
            <p>Add rest days only by leaving that day empty. Every actual training session needs its own card.</p>
          </div>
          <div>
            <button type="button" className="stress-map-text-button stress-map-text-button--dark" onClick={onExample}>Load worked example</button>
            <button type="button" className="stress-map-button stress-map-button--dark" onClick={onAdd}>Add session</button>
          </div>
        </div>

        {errors.sessions ? <div className="stress-map-error-banner" role="alert">{errors.sessions}</div> : null}
        {Object.keys(errors).some((key) => key.startsWith('session-') && key !== 'sessions') ? (
          <div className="stress-map-error-banner" role="alert">
            At least one session is incomplete. Open each card and review the highlighted fields.
          </div>
        ) : null}

        {sorted.length ? (
          <div className="stress-map-session-list">
            {sorted.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                action={analysis.valid ? analysis.actions?.[session.id]?.label : ''}
                onEdit={() => onEdit(session)}
                onDuplicate={() => onDuplicate(session)}
                onRemove={() => onRemove(session)}
              />
            ))}
          </div>
        ) : (
          <div className="stress-map-week-empty">
            <span>07</span>
            <h3>Your week is currently empty.</h3>
            <p>Start with the first substantial session of Monday, or load the worked HYROX example to see how the tool behaves.</p>
            <button type="button" className="stress-map-button stress-map-button--signal" onClick={onAdd}>Add the first session</button>
          </div>
        )}

        <div className="stress-map-load-note">
          <strong>Why there is no weekly stress score</strong>
          <p>A heavy squat session, interval run and hard BJJ session can produce similar session-RPE loads while creating different mechanical, metabolic and technical demands. The output ranks sessions and maps overlap. It does not collapse the week into a universal score.</p>
        </div>
      </div>
    </div>
  )
}

function ToolFooter() {
  return (
    <footer className="stress-map-site-footer">
      <div>
        <img src="/brand/logo-lockup-light.png" alt="The Performance Consultant" />
        <p>Evidence-led online performance and nutrition coaching.</p>
      </div>
      <div>
        <span>Privacy</span>
        <p>Your map stays in this browser. This page does not transmit your training, recovery or pain information.</p>
      </div>
      <div>
        <a href="/">Main website</a>
        <a href="/blog">Blog</a>
        <a href="mailto:will@theperformanceconsultant.net">Email</a>
      </div>
      <small>© {new Date().getFullYear()} The Performance Consultant</small>
    </footer>
  )
}

export default function HybridStressMap() {
  const [audit, setAudit] = useState(cloneEmptyAudit)
  const [started, setStarted] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [hasSavedMap, setHasSavedMap] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [stepErrors, setStepErrors] = useState({})
  const [editor, setEditor] = useState(null)
  const [editorIsNew, setEditorIsNew] = useState(false)
  const toolRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const analysis = useMemo(() => analyseWeek(audit), [audit])

  useEffect(() => {
    let stored = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      setStorageAvailable(false)
      setHydrated(true)
      return
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.schemaVersion === SCHEMA_VERSION && parsed.profile && Array.isArray(parsed.sessions)) {
          setAudit(parsed)
          setHasSavedMap(parsed.sessions.length > 0 || Boolean(parsed.profile.priority1))
        }
      } catch {
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          setStorageAvailable(false)
        }
      }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const next = { ...audit, updatedAt: new Date().toISOString() }
    setHasSavedMap(next.sessions.length > 0 || Boolean(next.profile.priority1))
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageAvailable(true)
    } catch {
      setStorageAvailable(false)
    }
  }, [audit, hydrated])

  const scrollToTool = useCallback(() => {
    requestAnimationFrame(() => toolRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    }))
  }, [reduceMotion])

  const start = () => {
    setStarted(true)
    scrollToTool()
  }

  const setCurrentStep = (currentStep) => {
    setAudit((current) => ({ ...current, currentStep }))
    setStepErrors({})
    setStarted(true)
    scrollToTool()
  }

  const updateProfile = (patch) => {
    setAudit((current) => ({ ...current, profile: { ...current.profile, ...patch } }))
    setStepErrors({})
  }

  const loadExample = () => {
    if (hasSavedMap && !window.confirm('Replace the current map with the worked HYROX example? Your current entries will be removed from this browser.')) return
    setAudit(structuredClone(HYROX_EXAMPLE))
    setStepErrors({})
    setStarted(true)
    scrollToTool()
  }

  const nextFromPriorities = () => {
    const errors = {}
    if (!audit.profile.priority1) errors.priority1 = 'Choose one primary outcome.'
    if (!audit.profile.priority2) errors.priority2 = 'Choose one secondary outcome.'
    if (audit.profile.priority1 && audit.profile.priority1 === audit.profile.priority2) {
      errors.priority2 = 'Priority 2 must differ from Priority 1.'
    }
    if (!audit.profile.performanceMarkers?.[0]?.trim() || !audit.profile.performanceMarkers?.[1]?.trim()) {
      errors.performanceMarkers = 'Enter two performance markers.'
    }
    setStepErrors(errors)
    if (!Object.keys(errors).length) setCurrentStep(1)
  }

  const openNewSession = () => {
    setEditor(newSession({
      id: uniqueId(),
      type: 'custom',
      name: '',
      fingerprintConfirmed: false,
    }))
    setEditorIsNew(true)
  }

  const openSession = (session) => {
    setEditor(structuredClone(session))
    setEditorIsNew(false)
  }

  const saveSession = () => {
    setAudit((current) => ({
      ...current,
      sessions: editorIsNew
        ? [...current.sessions, editor]
        : current.sessions.map((session) => session.id === editor.id ? editor : session),
    }))
    setEditor(null)
    setEditorIsNew(false)
    setStepErrors({})
  }

  const duplicateSession = (session) => {
    const duplicate = {
      ...structuredClone(session),
      id: uniqueId(),
      name: `${session.name} copy`,
    }
    setAudit((current) => ({ ...current, sessions: [...current.sessions, duplicate] }))
  }

  const removeSession = (session) => {
    if (!window.confirm(`Remove ${session.name || 'this session'} from the map?`)) return
    setAudit((current) => ({ ...current, sessions: current.sessions.filter((item) => item.id !== session.id) }))
  }

  const calculate = () => {
    const validation = validateAudit(audit)
    setStepErrors(validation.errors)
    if (!validation.valid) return
    setCurrentStep(3)
  }

  const reset = () => {
    if (!window.confirm('Start a new map? The current entries saved in this browser will be removed.')) return
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      setStorageAvailable(false)
    }
    setAudit(cloneEmptyAudit())
    setHasSavedMap(false)
    setStarted(false)
    setStepErrors({})
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const renderStep = () => {
    if (audit.currentStep === 0) return <PriorityStep profile={audit.profile} errors={stepErrors} onChange={updateProfile} />
    if (audit.currentStep === 1) return <ContextStep profile={audit.profile} onChange={updateProfile} />
    if (audit.currentStep === 2) {
      return (
        <WeekStep
          audit={audit}
          analysis={analysis}
          errors={stepErrors}
          onMode={(mode) => setAudit((current) => ({ ...current, mode }))}
          onAdd={openNewSession}
          onEdit={openSession}
          onDuplicate={duplicateSession}
          onRemove={removeSession}
          onExample={loadExample}
        />
      )
    }
    return analysis.valid ? (
      <StressMapResults
        analysis={analysis}
        onEdit={() => setCurrentStep(2)}
        onReviewMode={() => {
          setAudit((current) => ({ ...current, mode: 'review', currentStep: 2 }))
          setStarted(true)
          scrollToTool()
        }}
        onReset={reset}
      />
    ) : (
      <div className="stress-map-error-state" role="alert">
        <h2>The map needs more information.</h2>
        <p>Return to the week and complete the required session details before calculating the result.</p>
        <button type="button" className="stress-map-button stress-map-button--dark" onClick={() => setCurrentStep(2)}>Review the week</button>
      </div>
    )
  }

  return (
    <div className="stress-map" id="top">
      <StressMapHeader
        started={started}
        currentStep={audit.currentStep}
        onSelectStep={setCurrentStep}
        onStart={start}
      />
      <main>
        <Landing hasSavedMap={hasSavedMap} onStart={start} onExample={loadExample} />

        <section className={`stress-map-tool-shell ${started ? 'is-started' : ''}`} ref={toolRef} id="stress-map-tool">
          {!started ? (
            <div className="stress-map-tool-gate">
              <p className="stress-map-kicker">Your week, interpreted in context</p>
              <h2>Ready to map the <em>actual programme?</em></h2>
              <p>You will need the normal training week, approximate session durations and an honest estimate of overall session RPE.</p>
              <button type="button" className="stress-map-button stress-map-button--signal stress-map-button--large" onClick={start}>Begin the audit</button>
              <small>No account. No email gate. Data stays on this device.</small>
            </div>
          ) : (
            <>
              <div className="stress-map-tool-progress">
                <StepNav current={audit.currentStep} onSelect={setCurrentStep} />
                <span aria-live="polite">
                  {storageAvailable ? 'Saved locally' : 'Local saving unavailable'}
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={audit.currentStep}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                  transition={{ duration: reduceMotion ? 0 : 0.32 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {audit.currentStep < 3 ? (
                <div className="stress-map-step-actions">
                  <button
                    type="button"
                    className="stress-map-button stress-map-button--ghost"
                    onClick={() => audit.currentStep > 0 ? setCurrentStep(audit.currentStep - 1) : reset()}
                  >
                    {audit.currentStep > 0 ? 'Previous step' : 'Start again'}
                  </button>
                  {audit.currentStep === 0 ? (
                    <button type="button" className="stress-map-button stress-map-button--signal" onClick={nextFromPriorities}>Continue to context</button>
                  ) : audit.currentStep === 1 ? (
                    <button type="button" className="stress-map-button stress-map-button--signal" onClick={() => setCurrentStep(2)}>Build the week</button>
                  ) : (
                    <button type="button" className="stress-map-button stress-map-button--signal" onClick={calculate}>Calculate my Stress Map</button>
                  )}
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
      <ToolFooter />
      <SessionEditor
        session={editor}
        mode={audit.mode}
        onChange={setEditor}
        onClose={() => {
          setEditor(null)
          setEditorIsNew(false)
        }}
        onSave={saveSession}
      />
    </div>
  )
}
