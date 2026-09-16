'use client'

import { useEffect, useRef, useState } from 'react'
import '../../styles/stress-map.css'
import { GOAL_OPTIONS } from './constants.js'
import {
  bookingDuration,
  dayOptions,
  dayLabel,
  PLANNING_STORAGE_KEY,
  newPart,
  newPlanningAudit,
  newPlanningSession,
  parseClock,
  uid,
} from './planning-model.js'
import { loadSavedAudits, savePlanningAudit } from './storage.js'
import { pairContext } from './planner.js'
import { workedExample } from './examples.js'
import { Arrow, Field, WeekCalendar } from './PlanningUI.jsx'
import { SessionEditor } from './SessionEditor.jsx'
import { StressMapResults } from './StressMapResults.jsx'

const STEPS = ['Training sessions', 'Available time', 'Proposed week']

function Landing({ hasSaved, onStart, onExample }) {
  return (
    <>
      <section className="stress-map-hero">
        <div className="stress-map-hero__grid" aria-hidden="true" />
        <div className="stress-map-hero__copy">
          <p className="stress-map-kicker">
            The Performance Consultant · Training tools
          </p>
          <h1>
            Training Week <em>Stress Map</em>
          </h1>
          <p className="stress-map-hero__intro">
            A planning aid to help you balance training with life and its chaos.
          </p>
          <p className="stress-map-hero__body">
            Add your sessions and available times. Compare a revised timetable,
            see the reason for each change and download the week to your
            calendar.
          </p>
          <div className="stress-map-hero__actions">
            <button
              className="stress-map-button stress-map-button--signal"
              onClick={onStart}
            >
              {hasSaved ? 'Open my training week' : 'Map my training week'}
              <Arrow />
            </button>
            <button className="stress-map-text-button" onClick={onExample}>
              Explore the ATHX example
              <Arrow />
            </button>
          </div>
        </div>
        <div className="stress-map-hero-visual">
          <div className="stress-map-hero-visual__head">
            <span>WORKED EXAMPLE</span>
            <b>ONE CHANGE, EXPLAINED</b>
          </div>
          <div className="planner-example-row">
            <span>
              TUE
              <br />
              <b>18:00</b>
            </span>
            <div>
              <strong>Deadlifts and split squats</strong>
              <p>Finishes at 19:00</p>
            </div>
            <span className="planner-tag">Fixed</span>
          </div>
          <div className="planner-example-row planner-example-row--before">
            <span>
              WED
              <br />
              <b>07:00</b>
            </span>
            <div>
              <strong>Run intervals</strong>
              <p>12 hours after lifting</p>
            </div>
            <span className="planner-tag">Priority</span>
          </div>
          <div className="planner-example-move">
            <Arrow />
            <span>Move the run to the available Thursday slot</span>
          </div>
          <div className="planner-example-row planner-example-row--after">
            <span>
              THU
              <br />
              <b>07:00</b>
            </span>
            <div>
              <strong>Run intervals</strong>
              <p>36 hours after lifting</p>
            </div>
            <span className="planner-tag planner-tag--moved">Moved</span>
          </div>
          <div className="stress-map-hero-visual__finding">
            <span>WHY THIS CHANGE?</span>
            <p>
              Both sessions load your legs. Moving the run gives you another day
              between them.
            </p>
          </div>
        </div>
      </section>
      <section className="stress-map-opening">
        <div>
          <p className="stress-map-kicker">Your whole week</p>
          <h2>
            Fit training around <em>your commitments.</em>
          </h2>
        </div>
        <div className="stress-map-opening__copy">
          <p>
            A fixed class, an early run and a late strength session can be
            difficult to arrange around work and family. The map compares the
            times you have available and shows which sessions could move.
          </p>
          <p>
            Mark every priority session. Keep fixed bookings in place. For ATHX
            and other sessions with separate parts, include the breaks as well
            as the training.
          </p>
        </div>
      </section>
      <section className="stress-map-deliverables">
        <div>
          <p className="stress-map-kicker">What you get</p>
          <h2>
            A revised week,
            <br />
            <em>with reasons.</em>
          </h2>
        </div>
        <ol>
          {[
            'A complete timetable using your available times',
            'The original and proposed time for every move',
            'Explanations tied to your exercises and experience',
            'A calendar file with the sessions you choose',
          ].map((text, i) => (
            <li key={text}>
              <span>0{i + 1}</span>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

function TimeWindows({ audit, kind, onChange }) {
  const key = kind === 'available' ? 'availableWindows' : 'blockedWindows'
  const windows = audit[key] || []
  const update = (id, patch) =>
    onChange({
      [key]: windows.map((window) =>
        window.id === id ? { ...window, ...patch } : window,
      ),
    })
  const add = () =>
    onChange({
      [key]: [
        ...windows,
        {
          id: uid(),
          day: 0,
          startTime: kind === 'available' ? '07:00' : '09:00',
          endTime: kind === 'available' ? '08:00' : '17:00',
          location: '',
          equipment: [],
          label: '',
          kind: 'busy',
        },
      ],
    })
  return (
    <section className="planner-windows">
      <header>
        <div>
          <h3>
            {kind === 'available'
              ? 'When could you train?'
              : 'When are you busy'}
          </h3>
          <p>
            {kind === 'available'
              ? 'Add alternative times you could use. Your existing session times are already included.'
              : 'Add work, travel, sleep or other commitments that a session must fit around.'}
          </p>
        </div>
        <button
          type="button"
          className="stress-map-button stress-map-button--ghost"
          onClick={add}
        >
          {kind === 'available' ? 'Add available time' : 'Add a commitment'}
        </button>
      </header>
      {windows.map((window, i) => (
        <article className="planner-window" key={window.id}>
          <div className="planner-window-heading">
            <b>
              {kind === 'available' ? 'Available time' : 'Commitment'} {i + 1}
            </b>
            <button
              type="button"
              className="stress-map-text-button"
              onClick={() =>
                onChange({
                  [key]: windows.filter((item) => item.id !== window.id),
                })
              }
            >
              Remove
            </button>
          </div>
          <div className="stress-map-field-grid planner-window-fields">
            <Field label="Day">
              <select
                value={window.day}
                onChange={(e) =>
                  update(window.id, { day: Number(e.target.value) })
                }
              >
                {dayOptions(audit).map((day) => (
                  <option value={day.value} key={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="From">
              <input
                type="time"
                value={window.startTime}
                onChange={(e) =>
                  update(window.id, { startTime: e.target.value })
                }
              />
            </Field>
            <Field label="Until">
              <input
                type="time"
                value={window.endTime}
                onChange={(e) => update(window.id, { endTime: e.target.value })}
              />
            </Field>
            <Field label={kind === 'available' ? 'Place' : 'Commitment name'}>
              {kind === 'available' ? (
                <select
                  value={window.location || ''}
                  onChange={(e) =>
                    update(window.id, { location: e.target.value })
                  }
                >
                  <option value="">No specific place</option>
                  {audit.locations.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={window.label || ''}
                  placeholder="For example, work or travel"
                  onChange={(e) => update(window.id, { label: e.target.value })}
                />
              )}
            </Field>
          </div>
          {parseClock(window.endTime) <= parseClock(window.startTime) && (
            <p className="planner-hint">Finishes the following day.</p>
          )}
          {kind === 'available' && (
            <Field
              label="Equipment available"
              hint="Separate items with commas. For example: barbell, rower."
            >
              <input
                value={(window.equipment || []).join(', ')}
                onChange={(e) =>
                  update(window.id, {
                    equipment: e.target.value
                      .split(',')
                      .map((value) => value.trim()),
                  })
                }
                onBlur={() =>
                  update(window.id, {
                    equipment: (window.equipment || []).filter(Boolean),
                  })
                }
              />
            </Field>
          )}
          {window.sessionIds?.length > 0 && (
            <p className="planner-hint">
              Saved availability for{' '}
              {window.sessionIds
                .map((id) => {
                  const session = audit.sessions.find((s) => s.id === id)
                  return session
                    ? `${session.name} on ${dayLabel(audit, session.day)} at ${session.startTime}`
                    : 'a previous session'
                })
                .join(', ')}
              .{' '}
              <button
                type="button"
                className="stress-map-text-button"
                onClick={() => update(window.id, { sessionIds: undefined })}
              >
                Make this time available for any session
              </button>
            </p>
          )}
          {(audit.weekMode === 'typical' || window.day < 6) && (
            <button
              className="stress-map-text-button"
              type="button"
              onClick={() =>
                onChange({
                  [key]: [
                    ...windows,
                    {
                      ...structuredClone(window),
                      id: uid(),
                      day: (window.day + 1) % 7,
                    },
                  ],
                })
              }
            >
              Copy to the next day
              <Arrow />
            </button>
          )}
        </article>
      ))}
      {!windows.length && (
        <p className="planner-empty-note">
          {kind === 'available'
            ? 'No alternative times added yet.'
            : 'No commitments added yet.'}
        </p>
      )}
    </section>
  )
}

export default function HybridStressMap() {
  const [audit, setAudit] = useState(newPlanningAudit)
  const [started, setStarted] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [choices, setChoices] = useState([])
  const [saveState, setSaveState] = useState('')
  const [loadErrors, setLoadErrors] = useState([])
  const [example, setExample] = useState(false)
  const personalRef = useRef(null)
  const [editor, setEditor] = useState(null)
  const [editorBase, setEditorBase] = useState(null)
  const [showSaved, setShowSaved] = useState(false)
  const [errors, setErrors] = useState([])
  const [planState, setPlanState] = useState({ status: 'idle', result: null })
  const toolRef = useRef(null)
  const saveEnabled = useRef(false)

  useEffect(() => {
    try {
      const saved = loadSavedAudits(window.localStorage)
      setChoices(saved.choices)
      setLoadErrors(saved.errors || [])
      const current =
        saved.choices.find((choice) => choice.key === PLANNING_STORAGE_KEY) ||
        (saved.choices.length === 1 ? saved.choices[0] : null)
      if (current) {
        setAudit(current.audit)
        saveEnabled.current = true
      } else if (!saved.choices.length) saveEnabled.current = true
      const params = new URLSearchParams(window.location.search)
      if (params.get('example') === 'athx') {
        personalRef.current = current?.audit || null
        const sample = workedExample()
        const requestedStep = Number(params.get('step'))
        sample.currentStep = [0, 1, 2].includes(requestedStep)
          ? requestedStep
          : 0
        setAudit(sample)
        setExample(true)
        setStarted(true)
      }
    } catch (error) {
      setLoadErrors([error.message || 'Saved weeks could not be loaded.'])
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || example || !saveEnabled.current) return
    try {
      savePlanningAudit(audit, window.localStorage)
      setSaveState('Saved on this device')
      setChoices(loadSavedAudits(window.localStorage).choices)
    } catch {
      setSaveState(
        'Saving is unavailable in this browser. Keep this tab open and download your calendar before leaving.',
      )
    }
  }, [audit, hydrated, example])

  useEffect(() => {
    if (audit.currentStep !== 2 || !started || !audit.sessions.length) return
    setPlanState({ status: 'loading', result: null })
    let worker
    try {
      worker = new Worker(new URL('./planner.worker.js', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = ({ data }) =>
        setPlanState(
          data.error
            ? { status: 'error', error: data.error }
            : { status: 'ready', result: data.result },
        )
      worker.onerror = () =>
        setPlanState({
          status: 'error',
          error:
            'The timetable could not be checked. Check the save status above before reloading this page to try again.',
        })
      worker.postMessage(audit)
    } catch {
      setPlanState({
        status: 'error',
        error:
          'This browser could not start the timetable comparison. Your entries are still shown here. Check the save status before updating or reloading this browser.',
      })
    }
    return () => worker?.terminate()
  }, [audit, started])

  const scrollToTool = () =>
    requestAnimationFrame(() =>
      toolRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    )
  const start = () => {
    setStarted(true)
    scrollToTool()
  }
  const go = (currentStep) => {
    const issues = []
    if (currentStep > 0) {
      if (!audit.sessions.length)
        issues.push('Add at least one training session.')
      const date = new Date(`${audit.weekStart}T00:00:00Z`)
      if (
        audit.weekMode === 'specific' &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(audit.weekStart || '') ||
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== audit.weekStart)
      )
        issues.push('Choose the first date of your training week.')
    }
    if (currentStep === 2) {
      for (const window of [...audit.availableWindows, ...audit.blockedWindows])
        if (
          !Number.isFinite(parseClock(window.startTime)) ||
          !Number.isFinite(parseClock(window.endTime))
        )
          issues.push('Complete the start and finish time for each time slot.')
    }
    if (issues.length) {
      setErrors([...new Set(issues)])
      return
    }
    setAudit((current) => ({ ...current, currentStep }))
    setErrors([])
    setStarted(true)
    scrollToTool()
  }
  const change = (patch) => {
    setAudit((current) => ({ ...current, ...patch, acceptedPlan: null }))
    setErrors([])
  }
  const onExample = () => {
    if (!example) personalRef.current = audit
    setAudit(workedExample())
    setExample(true)
    setStarted(true)
    setErrors([])
    scrollToTool()
  }
  const leaveExample = () => {
    setAudit(personalRef.current || newPlanningAudit())
    setExample(false)
    setErrors([])
    scrollToTool()
  }
  const addLocation = (name) => {
    const clean = name.trim()
    if (clean)
      setAudit((current) => ({
        ...current,
        locations: [...new Set([...current.locations, clean])],
      }))
  }
  const openNew = (multipart = false) => {
    setEditorBase(null)
    setEditor(newPlanningSession(multipart ? { components: [newPart()] } : {}))
  }
  const edit = (session, baseSessions = null) => {
    setEditorBase(baseSessions)
    setEditor(structuredClone(session))
  }
  const saveSession = () => {
    const item = { ...editor, duration: bookingDuration(editor) }
    const base = editorBase || audit.sessions
    change({
      sessions: base.some((s) => s.id === item.id)
        ? base.map((s) => (s.id === item.id ? item : s))
        : [...base, item],
    })
    setEditor(null)
    setEditorBase(null)
  }
  const remove = (session) => {
    if (
      window.confirm(
        `Remove “${session.name}” on ${dayLabel(audit, session.day)} at ${session.startTime} from this week?`,
      )
    ) {
      const responses = Object.fromEntries(
        Object.entries(audit.pairResponses).filter(
          ([key]) => !key.split('->').includes(session.id),
        ),
      )
      change({
        sessions: audit.sessions.filter((s) => s.id !== session.id),
        pairResponses: responses,
      })
    }
  }
  const copy = (session) => {
    const duplicate = {
      ...structuredClone(session),
      id: uid(),
      name: `${session.name} copy`,
      components: (session.components || []).map((part) => ({
        ...part,
        id: uid(),
      })),
    }
    change({ sessions: [...audit.sessions, duplicate] })
    setEditorBase(null)
    setEditor(duplicate)
  }
  const next = () => go(Math.min(2, audit.currentStep + 1))
  const answer = (sourceId, targetId, value) => {
    const context = pairContext(audit, sourceId, targetId)
    if (!Number.isFinite(context?.gapMinutes)) {
      setErrors(['Choose the earlier session first.'])
      return
    }
    change({
      pairResponses: {
        ...audit.pairResponses,
        [`${sourceId}->${targetId}`]: {
          answer: value,
          context,
          answeredAt: new Date().toISOString(),
        },
      },
    })
  }

  return (
    <div className="stress-map" id="top">
      <header className="stress-map-header">
        <a href="/" className="stress-map-header__brand">
          <img src="/brand/logo-lockup.png" alt="The Performance Consultant" />
        </a>
        <p>Training Week Stress Map</p>
        <button className="stress-map-header__action" onClick={start}>
          {started ? 'Continue' : 'Start your map'}
          <Arrow />
        </button>
      </header>
      <main>
        {!started && (
          <Landing
            hasSaved={Boolean(choices.length)}
            onStart={start}
            onExample={onExample}
          />
        )}
        <section
          className="stress-map-tool-shell"
          ref={toolRef}
          id="stress-map-tool"
        >
          {!started ? (
            <div className="stress-map-tool-gate">
              <p className="stress-map-kicker">Your training week</p>
              <h2>
                Start with <em>your sessions.</em>
              </h2>
              <button
                className="stress-map-button stress-map-button--dark"
                onClick={start}
              >
                Build my timetable
                <Arrow />
              </button>
            </div>
          ) : (
            <>
              {example && (
                <div className="planner-example-banner">
                  <div>
                    <strong>Worked ATHX example</strong>
                    <p>
                      Edit these representative sessions to explore the tool.
                      Your saved week is kept separately.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="stress-map-button stress-map-button--ghost"
                    onClick={leaveExample}
                  >
                    Return to my week
                  </button>
                </div>
              )}
              {!!loadErrors.length && (
                <div className="planner-alert" role="status">
                  {loadErrors.map((error, i) => (
                    <p key={i}>
                      {typeof error === 'string' ? error : error.message}
                    </p>
                  ))}
                </div>
              )}
              {choices.length > 1 &&
              (!saveEnabled.current || showSaved) &&
              !example ? (
                <section className="planner-saved-choices">
                  <h2>Choose a saved week</h2>
                  <p>
                    Choose a week to open. Your other saved weeks will be kept.
                  </p>
                  {choices.map((choice) => (
                    <button
                      className="planner-saved-choice"
                      key={choice.key}
                      onClick={() => {
                        saveEnabled.current = true
                        setAudit(choice.audit)
                        setShowSaved(false)
                      }}
                    >
                      <strong>{choice.label}</strong>
                      <span>
                        {choice.sessionCount} sessions
                        {choice.updatedAt
                          ? ` · ${new Date(choice.updatedAt).toLocaleDateString('en-GB')}`
                          : ''}
                      </span>
                      <Arrow />
                    </button>
                  ))}
                </section>
              ) : (
                <>
                  <div className="stress-map-tool-progress">
                    <nav
                      className="stress-map-step-nav"
                      aria-label="Map progress"
                    >
                      {STEPS.map((label, i) => (
                        <button
                          key={label}
                          type="button"
                          className={
                            audit.currentStep === i ? 'is-current' : ''
                          }
                          aria-current={
                            audit.currentStep === i ? 'step' : undefined
                          }
                          onClick={() => go(i)}
                        >
                          <span>0{i + 1}</span>
                          <b>{label}</b>
                        </button>
                      ))}
                    </nav>
                    {!example && (
                      <div>
                        <small role="status">{saveState}</small>
                        <button
                          type="button"
                          className="stress-map-text-button planner-open-saved"
                          onClick={() => {
                            setAudit(newPlanningAudit())
                            setErrors([])
                          }}
                        >
                          Start a new week
                        </button>
                        {choices.length > 1 && (
                          <button
                            type="button"
                            className="stress-map-text-button planner-open-saved"
                            onClick={() => {
                              const saved = loadSavedAudits(window.localStorage)
                              setChoices(saved.choices)
                              setLoadErrors(saved.errors)
                              setShowSaved(true)
                            }}
                          >
                            Open another saved week
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.length > 0 && (
                    <div className="planner-alert" role="alert">
                      {errors.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  )}
                  {audit.currentStep === 0 && (
                    <div className="stress-map-step">
                      <header className="stress-map-step__header">
                        <span>01 / 03</span>
                        <div>
                          <p>Your sessions</p>
                          <h2>
                            What does your <em>week include?</em>
                          </h2>
                          <p>
                            Add each session and select every priority. A
                            priority session can still move if its timing is
                            flexible.
                          </p>
                        </div>
                      </header>
                      <div className="stress-map-field-grid">
                        <Field label="Which week are you planning?">
                          <select
                            value={audit.weekMode}
                            onChange={(e) =>
                              change({
                                weekMode: e.target.value,
                                weekStart: '',
                              })
                            }
                          >
                            <option value="specific">
                              A specific training week
                            </option>
                            <option value="typical">
                              My typical training week
                            </option>
                          </select>
                        </Field>
                        {audit.weekMode === 'specific' && (
                          <Field label="First day of this training week">
                            <input
                              type="date"
                              value={audit.weekStart}
                              onChange={(e) =>
                                change({ weekStart: e.target.value })
                              }
                            />
                          </Field>
                        )}
                        <Field label="Main training goal" hint="Optional">
                          <select
                            value={audit.profile.priority1}
                            onChange={(e) =>
                              change({
                                profile: {
                                  ...audit.profile,
                                  priority1: e.target.value,
                                },
                              })
                            }
                          >
                            <option value="">Choose a goal</option>
                            {[
                              ...new Set(['ATHX performance', ...GOAL_OPTIONS]),
                            ].map((goal) => (
                              <option key={goal}>{goal}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="planner-add-row">
                        <button
                          className="stress-map-button stress-map-button--dark"
                          onClick={() => openNew()}
                        >
                          Add a session
                          <Arrow />
                        </button>
                        <button
                          className="stress-map-button stress-map-button--ghost"
                          onClick={() => openNew(true)}
                        >
                          Add a session with separate parts
                          <Arrow />
                        </button>
                        {!audit.sessions.length && (
                          <button
                            className="stress-map-text-button"
                            onClick={onExample}
                          >
                            Explore the ATHX example
                          </button>
                        )}
                      </div>
                      {!audit.sessions.length ? (
                        <div className="planner-empty">
                          <h3>Add the sessions you want to keep.</h3>
                          <p>
                            Use specific names so you can recognise them later.
                            For example, “Deadlifts and split squats” or “6 ×
                            3-minute run intervals”.
                          </p>
                        </div>
                      ) : (
                        <WeekCalendar
                          audit={audit}
                          onEdit={edit}
                          onDuplicate={copy}
                          onRemove={remove}
                        />
                      )}
                      {!!audit.sessions.length && (
                        <p className="planner-hint">
                          Select a session name to edit its details.
                        </p>
                      )}
                    </div>
                  )}
                  {audit.currentStep === 1 && (
                    <div className="stress-map-step">
                      <header className="stress-map-step__header">
                        <span>02 / 03</span>
                        <div>
                          <p>Your available time</p>
                          <h2>
                            Where could sessions <em>move?</em>
                          </h2>
                          <p>
                            Add times you could use and commitments to keep
                            clear. Select the same place from the list for a
                            session and its available time.
                          </p>
                        </div>
                      </header>
                      <Field label="Time zone">
                        <select
                          value={audit.timeZone}
                          onChange={(e) => change({ timeZone: e.target.value })}
                        >
                          {[
                            ...new Set([
                              audit.timeZone,
                              'Europe/London',
                              ...(Intl.supportedValuesOf?.('timeZone') || []),
                            ]),
                          ]
                            .filter(Boolean)
                            .map((zone) => (
                              <option key={zone}>{zone}</option>
                            ))}
                        </select>
                      </Field>
                      {audit.profile.fixedSessions && (
                        <details className="stress-map-details">
                          <summary>Earlier notes about fixed sessions</summary>
                          <p>{audit.profile.fixedSessions}</p>
                          <p>
                            For training bookings, open Training sessions and
                            set the day and time to fixed. Add other commitments
                            below.
                          </p>
                        </details>
                      )}
                      <TimeWindows
                        audit={audit}
                        kind="available"
                        onChange={change}
                      />
                      <TimeWindows
                        audit={audit}
                        kind="blocked"
                        onChange={change}
                      />
                    </div>
                  )}
                  {audit.currentStep === 2 && (
                    <div className="stress-map-step">
                      {planState.status === 'loading' && (
                        <div className="planner-loading" role="status">
                          <span />
                          <h2>Comparing your available times</h2>
                          <p>
                            Checking the complete week, including sessions that
                            stay in place.
                          </p>
                        </div>
                      )}
                      {planState.status === 'error' && (
                        <div className="planner-alert" role="alert">
                          <p>{planState.error}</p>
                          <button
                            className="stress-map-button stress-map-button--ghost"
                            onClick={() => go(1)}
                          >
                            Review available time
                          </button>
                        </div>
                      )}
                      {planState.result && (
                        <StressMapResults
                          audit={audit}
                          plan={planState.result}
                          onAnswer={answer}
                          onEdit={edit}
                          onEditAvailability={() => go(1)}
                          onEditSessions={() => go(0)}
                          onAccept={(plan) =>
                            setAudit((current) => ({
                              ...current,
                              acceptedPlan: structuredClone(plan),
                            }))
                          }
                          onUndo={() =>
                            setAudit((current) => ({
                              ...current,
                              acceptedPlan: null,
                            }))
                          }
                          onChange={change}
                        />
                      )}
                    </div>
                  )}
                  {audit.currentStep < 2 && (
                    <div className="stress-map-step-actions">
                      <button
                        className="stress-map-button stress-map-button--ghost"
                        onClick={() =>
                          audit.currentStep ? go(0) : setStarted(false)
                        }
                      >
                        <Arrow back />
                        {audit.currentStep
                          ? 'Training sessions'
                          : 'Introduction'}
                      </button>
                      <button
                        className="stress-map-button stress-map-button--signal"
                        onClick={next}
                      >
                        {audit.currentStep
                          ? 'Show my proposed week'
                          : 'Add available time'}
                        <Arrow />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>
      <footer className="stress-map-site-footer">
        <div>
          <img
            src="/brand/logo-lockup-light.png"
            alt="The Performance Consultant"
          />
          <p>Training and nutrition coaching.</p>
        </div>
        <div>
          <a href="/">Main website</a>
          <a href="/blog">Blog</a>
        </div>
        <small>© {new Date().getFullYear()} The Performance Consultant</small>
      </footer>
      <SessionEditor
        session={editor}
        onChange={setEditor}
        onSave={saveSession}
        onClose={() => setEditor(null)}
        locations={audit.locations}
        onAddLocation={addLocation}
        dayOptions={dayOptions(audit)}
        audit={audit}
        editingNote={
          editorBase
            ? 'Editing the proposed timetable. Saving this edit makes it your current week.'
            : ''
        }
      />
    </div>
  )
}
