'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import {
  DAYS,
  DOMAIN_DEFINITIONS,
  SESSION_LIBRARY,
  getSessionType,
} from './constants.js'
import {
  EFFORTS,
  FRESHNESS,
  bookingDuration,
  clock,
  newPart,
  parseClock,
} from './planning-model.js'
import {
  changeSessionType,
  makeAthxParts,
  parseEquipment,
  validatePlanningSession,
} from './editor-model.js'
import { finishTime } from './PlanningUI.jsx'

const DEMAND_COPY = {
  lowerForce:
    'Force through your legs and hips, such as squats, deadlifts or sled pushes.',
  impact: 'Repeated foot strikes, jumps, landings or lowering under load.',
  upperGrip: 'Pulling, pressing, carrying or gripping.',
  metabolic: 'Repeated hard efforts, such as intervals or a demanding circuit.',
  aerobic: 'Sustained endurance exercise, such as a longer run, ride or row.',
  freshness: 'Speed, precision or coordination that needs you to be fresh.',
}

function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`stress-map-field ${className}`}>
      <span className="stress-map-field__label">{label}</span>
      {hint ? <span className="stress-map-field__hint">{hint}</span> : null}
      {children}
      {error ? (
        <span className="stress-map-field__error" role="alert">
          {error}
        </span>
      ) : null}
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

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 4v16m-6-6 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TypeField({ value, onChange, label = 'Session type' }) {
  return (
    <Field label={label}>
      <select
        value={value || 'custom'}
        onChange={(event) => onChange(event.target.value)}
      >
        {SESSION_LIBRARY.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function EffortField({ value, onChange, label = 'How hard is this session?' }) {
  return (
    <Field label={label}>
      <select
        value={value || 'unknown'}
        onChange={(event) => onChange(event.target.value)}
      >
        {EFFORTS.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function Demands({ value, onChange, part = false }) {
  const stress = {
    ...getSessionType(value.type).stress,
    ...(value.stress || {}),
  }
  return (
    <details className="stress-map-details planner-demand-details">
      <summary>
        {part ? 'What this part involves' : 'What the session involves'}
        {value.fingerprintConfirmed ? ' · Confirmed' : ''}
      </summary>
      <p>
        Select the descriptions that fit. These help explain suggestions
        involving nearby sessions.
      </p>
      <div className="planner-demand-options">
        {DOMAIN_DEFINITIONS.map((domain) => (
          <label key={domain.key} className="planner-demand-option">
            <input
              type="checkbox"
              checked={Number(stress[domain.key]) > 0}
              onChange={(event) =>
                onChange({
                  stress: {
                    ...stress,
                    [domain.key]: event.target.checked
                      ? Math.max(
                          1,
                          Number(getSessionType(value.type).stress[domain.key]),
                        )
                      : 0,
                  },
                  fingerprintConfirmed: false,
                })
              }
            />
            <span>
              <b>{domain.label}</b>
              <small>{DEMAND_COPY[domain.key]}</small>
            </span>
          </label>
        ))}
      </div>
      <Toggle
        checked={Boolean(value.fingerprintConfirmed)}
        label={
          part
            ? 'These descriptions match this part'
            : 'These descriptions match the session'
        }
        onChange={(event) =>
          onChange({ fingerprintConfirmed: event.target.checked })
        }
      />
      <details className="stress-map-details">
        <summary>Adjust the amount of each demand</summary>
        <p>
          Use 0 for none, 1 for a small amount, 2 for moderate and 3 for
          substantial.
        </p>
        <div className="stress-map-fingerprint-editor">
          {DOMAIN_DEFINITIONS.map((domain) => (
            <label key={domain.key}>
              <span>
                <b>{domain.label}</b>
              </span>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={stress[domain.key]}
                onChange={(event) =>
                  onChange({
                    stress: {
                      ...stress,
                      [domain.key]: Number(event.target.value),
                    },
                    fingerprintConfirmed: false,
                  })
                }
                aria-label={`${domain.label} amount`}
              />
              <output>{stress[domain.key]}</output>
            </label>
          ))}
        </div>
      </details>
    </details>
  )
}

export function SessionEditor({
  session,
  onChange,
  onClose,
  onSave,
  locations = [],
  onAddLocation,
  dayOptions = DAYS,
  audit = null,
  editingNote = '',
}) {
  const [errors, setErrors] = useState({})
  const [newLocation, setNewLocation] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [equipmentDraft, setEquipmentDraft] = useState('')
  const [templateConfirmation, setTemplateConfirmation] = useState(false)
  const dialogRef = useRef(null)
  const titleRef = useRef(null)
  const partsRef = useRef(null)
  const optionalRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const reduceMotion = useReducedMotion()
  const isOpen = Boolean(session)
  const multipart = Boolean(session?.components?.length)
  const sessionId = session?.id

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    setErrors({})
    setNewLocation('')
    setAddingLocation(false)
    setTemplateConfirmation(false)
    setEquipmentDraft((session?.equipment || []).join(', '))
  }, [sessionId])

  useEffect(() => {
    if (!isOpen) return undefined
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary',
        ) || [],
      ).filter((item) => item.getClientRects().length)
    titleRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = controls()
      if (!items.length) return
      const first = items[0]
      const last = items.at(-1)
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === titleRef.current)
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.classList.add('stress-map-dialog-open')
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('stress-map-dialog-open')
      previousFocus?.focus?.()
    }
  }, [isOpen])

  const update = (patch) => onChange({ ...session, ...patch })
  const updateParts = (components, patch = {}) =>
    update({
      components,
      ...patch,
      duration: bookingDuration({ ...session, ...patch, components }),
    })
  const updatePart = (index, patch) =>
    updateParts(
      session.components.map((part, position) =>
        position === index ? { ...part, ...patch } : part,
      ),
    )
  const jumpToParts = () => {
    if (!multipart)
      updateParts([
        newPart({
          name: session.exercises?.trim() ? session.name : '',
          type: session.type,
          duration: session.duration || 15,
          effort: session.effort,
          exercises: session.exercises,
          stress: { ...session.stress },
          fingerprintConfirmed: session.fingerprintConfirmed,
        }),
      ])
    requestAnimationFrame(() => {
      partsRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      partsRef.current?.focus({ preventScroll: true })
    })
  }
  const useTemplate = () => {
    updateParts(makeAthxParts(), { startDelay: 0 })
    setTemplateConfirmation(false)
    requestAnimationFrame(() =>
      partsRef.current?.focus({ preventScroll: true }),
    )
  }
  const save = () => {
    const nextErrors = validatePlanningSession(session)
    if (finishError) nextErrors.startTime = finishError
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      if (
        [
          'plannedRpe',
          'actualRpe',
          'actualDuration',
          'runDistance',
          'longestRun30',
        ].some((key) => nextErrors[key])
      )
        optionalRef.current.open = true
      requestAnimationFrame(() => {
        const field = dialogRef.current?.querySelector('[aria-invalid="true"]')
        field?.focus()
        field?.scrollIntoView({ block: 'center' })
      })
      return
    }
    onSave()
  }
  const addLocation = () => {
    const location = newLocation.trim()
    if (!location) return
    onAddLocation?.(location)
    update({ location })
    setNewLocation('')
    setAddingLocation(false)
  }
  const knownLocations = [
    ...new Set([...locations, session?.location].filter(Boolean)),
  ]
  const duration = session ? bookingDuration(session) : 0
  const start = parseClock(session?.startTime)
  let calculatedFinish = null
  let finishError = ''
  if (audit && session && Number.isFinite(start) && Number.isFinite(duration)) {
    try {
      calculatedFinish = finishTime(audit, session)
    } catch (error) {
      finishError = error.message || 'Check the date and start time.'
    }
  }
  const finish = finishError
    ? ''
    : (calculatedFinish?.endTime ??
      (Number.isFinite(start) && Number.isFinite(duration)
        ? clock(start + duration)
        : ''))
  const finishNextDay =
    calculatedFinish?.nextDay ??
    (Number.isFinite(start) && start + duration >= 1440)

  return (
    <AnimatePresence>
      {session ? (
        <motion.div
          className="stress-map-editor-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.section
            ref={dialogRef}
            className="stress-map-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stress-map-editor-title"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
          >
            <header className="stress-map-editor__header">
              <div>
                <span>Session details</span>
                <h2 id="stress-map-editor-title" ref={titleRef} tabIndex="-1">
                  {session.name || 'New session'}
                </h2>
              </div>
              <button
                type="button"
                className="stress-map-icon-button"
                onClick={onClose}
                aria-label="Close session editor"
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>
            <div className="stress-map-editor__body">
              {editingNote && (
                <p className="planner-multipart-callout" role="status">
                  {editingNote}
                </p>
              )}
              <section className="stress-map-form-section">
                <Field
                  label="Session name"
                  hint="Use a specific name so you recognise it in your calendar, such as ‘Deadlifts and split squats’ or ‘6 × 3-minute run intervals’."
                  error={errors.name}
                >
                  <input
                    value={session.name || ''}
                    onChange={(event) => update({ name: event.target.value })}
                    aria-invalid={Boolean(errors.name)}
                    autoComplete="off"
                  />
                </Field>
                <div className="stress-map-field-grid">
                  <Field label="Day" error={errors.day}>
                    <select
                      value={session.day}
                      onChange={(event) =>
                        update({ day: Number(event.target.value) })
                      }
                      aria-invalid={Boolean(errors.day)}
                    >
                      {dayOptions.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Start time" error={errors.startTime}>
                    <input
                      type="time"
                      value={session.startTime || ''}
                      onChange={(event) =>
                        update({ startTime: event.target.value })
                      }
                      aria-invalid={Boolean(errors.startTime)}
                    />
                  </Field>
                </div>
                <Toggle
                  checked={Boolean(session.priority)}
                  label="This is a priority session"
                  onChange={(event) =>
                    update({ priority: event.target.checked })
                  }
                />
                <Field
                  label="What can change?"
                  hint="A flexible priority session can move to another available time."
                >
                  <select
                    value={session.mobility || 'movable'}
                    onChange={(event) =>
                      update({ mobility: event.target.value })
                    }
                  >
                    <option value="movable">This session is flexible</option>
                    <option value="fixed">The day and time are fixed</option>
                  </select>
                </Field>
                <Field
                  label="Place"
                  hint="Choose the same place when adding available times. For example, select ‘City Gym’ for both this session and a free slot at that gym."
                >
                  <select
                    value={session.location || ''}
                    onChange={(event) =>
                      update({ location: event.target.value })
                    }
                  >
                    <option value="">No specific place needed</option>
                    {knownLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </Field>
                {addingLocation ? (
                  <div className="planner-inline-add">
                    <Field label="New place">
                      <input
                        value={newLocation}
                        onChange={(event) => setNewLocation(event.target.value)}
                        placeholder="City Gym"
                      />
                    </Field>
                    <button
                      type="button"
                      className="stress-map-button stress-map-button--ghost"
                      disabled={!newLocation.trim()}
                      onClick={addLocation}
                    >
                      Add place
                    </button>
                    <button
                      type="button"
                      className="stress-map-button stress-map-button--ghost"
                      onClick={() => setAddingLocation(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="stress-map-button stress-map-button--ghost"
                    onClick={() => setAddingLocation(true)}
                  >
                    Add a place
                  </button>
                )}
                <Field
                  label="Equipment needed"
                  hint="Optional. Separate items with commas, for example barbell, rower."
                >
                  <input
                    value={equipmentDraft}
                    onChange={(event) => {
                      setEquipmentDraft(event.target.value)
                      update({ equipment: parseEquipment(event.target.value) })
                    }}
                  />
                </Field>
              </section>

              <div className="planner-multipart-callout">
                <p>
                  If your session has multiple parts, such as ATHX, enter each
                  part in the section below.
                </p>
                <button
                  type="button"
                  className="stress-map-button stress-map-button--ghost"
                  onClick={jumpToParts}
                >
                  {multipart
                    ? 'Go to separate parts'
                    : 'Add a session with separate parts'}{' '}
                  <Arrow />
                </button>
              </div>

              {!multipart ? (
                <section className="stress-map-form-section">
                  <TypeField
                    value={session.type}
                    onChange={(type) =>
                      onChange(changeSessionType(session, type))
                    }
                  />
                  <div className="stress-map-field-grid">
                    <Field
                      label="Duration"
                      hint="Minutes, including breaks"
                      error={errors.duration}
                    >
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        step="1"
                        inputMode="numeric"
                        value={session.duration ?? ''}
                        onChange={(event) =>
                          update({ duration: event.target.value })
                        }
                        aria-invalid={Boolean(errors.duration)}
                      />
                    </Field>
                    <EffortField
                      value={session.effort}
                      onChange={(effort) => update({ effort })}
                    />
                  </div>
                  <Field
                    label="Exercises or session content"
                    hint="Leave this blank if doing a class and you don’t know what’s in it."
                  >
                    <textarea
                      rows="3"
                      value={session.exercises || ''}
                      onChange={(event) =>
                        update({
                          exercises: event.target.value,
                          fingerprintConfirmed: false,
                        })
                      }
                    />
                  </Field>
                  <Demands value={session} onChange={update} />
                </section>
              ) : null}

              <Field label="Do you need to be fresh for this session?">
                <select
                  value={session.freshness || 'unknown'}
                  onChange={(event) =>
                    update({ freshness: event.target.value })
                  }
                >
                  {FRESHNESS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              {multipart ? (
                <section className="stress-map-form-section planner-parts-section">
                  <h3 ref={partsRef} tabIndex="-1">
                    Separate parts and breaks
                  </h3>
                  <p>
                    Enter each part in order. Factor in any breaks you take
                    within a session, if needed.
                  </p>
                  <p>
                    Use the ATHX template for a representative training example,
                    then edit the parts, durations and breaks to match your
                    session.
                  </p>
                  {templateConfirmation ? (
                    <div
                      className="planner-multipart-callout"
                      role="group"
                      aria-label="Replace separate parts"
                    >
                      <p>
                        Replace the parts entered here with the ATHX example?
                      </p>
                      <button
                        type="button"
                        className="stress-map-button stress-map-button--ghost"
                        onClick={useTemplate}
                      >
                        Replace parts with template
                      </button>
                      <button
                        type="button"
                        className="stress-map-button stress-map-button--ghost"
                        onClick={() => setTemplateConfirmation(false)}
                      >
                        Keep current parts
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="stress-map-button stress-map-button--ghost"
                      onClick={() => {
                        if (
                          session.components.some(
                            (part) =>
                              part.name?.trim() || part.exercises?.trim(),
                          )
                        )
                          setTemplateConfirmation(true)
                        else useTemplate()
                      }}
                    >
                      Use ATHX template
                    </button>
                  )}
                  <Field
                    label="Time before the first part"
                    hint="Minutes. Include a warm-up here if you have not added it as a separate part."
                    error={errors.startDelay}
                  >
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      step="1"
                      inputMode="numeric"
                      value={session.startDelay ?? 0}
                      onChange={(event) =>
                        updateParts(session.components, {
                          startDelay: event.target.value,
                        })
                      }
                      aria-invalid={Boolean(errors.startDelay)}
                    />
                  </Field>
                  {session.components.map((part, index) => (
                    <fieldset key={part.id} className="planner-part-card">
                      <legend>Part {index + 1}</legend>
                      <Field
                        label="Part name"
                        error={errors[`part-${index}-name`]}
                      >
                        <input
                          value={part.name || ''}
                          onChange={(event) =>
                            updatePart(index, { name: event.target.value })
                          }
                          aria-invalid={Boolean(errors[`part-${index}-name`])}
                        />
                      </Field>
                      <TypeField
                        value={part.type}
                        onChange={(type) =>
                          updatePart(index, changeSessionType(part, type))
                        }
                        label="Type of exercise"
                      />
                      <div className="stress-map-field-grid">
                        <Field
                          label="Part duration"
                          hint="Minutes"
                          error={errors[`part-${index}-duration`]}
                        >
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            step="1"
                            inputMode="numeric"
                            value={part.duration ?? ''}
                            onChange={(event) =>
                              updatePart(index, {
                                duration: event.target.value,
                              })
                            }
                            aria-invalid={Boolean(
                              errors[`part-${index}-duration`],
                            )}
                          />
                        </Field>
                        <Field
                          label="Break after this part"
                          hint="Minutes"
                          error={errors[`part-${index}-breakAfter`]}
                        >
                          <input
                            type="number"
                            min="0"
                            max="1440"
                            step="1"
                            inputMode="numeric"
                            value={part.breakAfter ?? 0}
                            onChange={(event) =>
                              updatePart(index, {
                                breakAfter: event.target.value,
                              })
                            }
                            aria-invalid={Boolean(
                              errors[`part-${index}-breakAfter`],
                            )}
                          />
                        </Field>
                      </div>
                      <EffortField
                        value={part.effort}
                        onChange={(effort) => updatePart(index, { effort })}
                        label="How hard is this part?"
                      />
                      <Field
                        label="Exercises in this part"
                        hint="Leave this blank if doing a class and you don’t know what’s in it."
                      >
                        <textarea
                          rows="2"
                          value={part.exercises || ''}
                          onChange={(event) =>
                            updatePart(index, {
                              exercises: event.target.value,
                              fingerprintConfirmed: false,
                            })
                          }
                        />
                      </Field>
                      <Demands
                        value={part}
                        onChange={(patch) => updatePart(index, patch)}
                        part
                      />
                      <div className="planner-part-actions">
                        <button
                          type="button"
                          className="stress-map-button stress-map-button--ghost"
                          disabled={index === 0}
                          onClick={() => {
                            const parts = [...session.components]
                            ;[parts[index - 1], parts[index]] = [
                              parts[index],
                              parts[index - 1],
                            ]
                            updateParts(parts)
                          }}
                          aria-label={`Move part ${index + 1} earlier`}
                        >
                          Move earlier
                        </button>
                        <button
                          type="button"
                          className="stress-map-button stress-map-button--ghost"
                          disabled={index === session.components.length - 1}
                          onClick={() => {
                            const parts = [...session.components]
                            ;[parts[index], parts[index + 1]] = [
                              parts[index + 1],
                              parts[index],
                            ]
                            updateParts(parts)
                          }}
                          aria-label={`Move part ${index + 1} later`}
                        >
                          Move later
                        </button>
                        <button
                          type="button"
                          className="stress-map-button stress-map-button--ghost"
                          disabled={session.components.length === 1}
                          onClick={() =>
                            updateParts(
                              session.components.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                          aria-label={`Remove part ${index + 1}`}
                        >
                          Remove part
                        </button>
                      </div>
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="stress-map-button stress-map-button--ghost"
                    onClick={() =>
                      updateParts([...session.components, newPart()])
                    }
                  >
                    Add another part
                  </button>
                  {errors.booking ? (
                    <p
                      className="stress-map-field__error"
                      role="alert"
                      tabIndex="-1"
                      aria-invalid="true"
                    >
                      {errors.booking}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <div className="planner-booking-summary" aria-live="polite">
                <strong>
                  {Number.isFinite(duration) ? duration : 0} minutes in total
                </strong>
                {finish ? (
                  <span>
                    Finishes at {finish}
                    {finishNextDay ? ' the following day' : ''}
                  </span>
                ) : null}
                {finishError && (
                  <span className="stress-map-field__error">{finishError}</span>
                )}
              </div>

              <details className="stress-map-details" ref={optionalRef}>
                <summary>Optional: progression and session review</summary>
                <Field
                  label="Do you repeat an exercise or session so you can compare performance?"
                  hint="For example, repeating the same squat sets to compare weights and reps, or running the same 5 km route to compare your time."
                >
                  <select
                    value={session.progression || ''}
                    onChange={(event) =>
                      update({ progression: event.target.value })
                    }
                  >
                    <option value="">Not recorded</option>
                    <option value="yes">
                      Yes, with a plan for how it progresses
                    </option>
                    <option value="partly">
                      I do the same sessions &amp; exercises but am not sure how
                      they progress
                    </option>
                    <option value="no">No, the sessions vary</option>
                  </select>
                </Field>
                <Field
                  label="Expected session effort score"
                  hint="Optional. Rate overall effort from 1 (very easy) to 10 (maximal)."
                  error={errors.plannedRpe}
                >
                  <input
                    type="number"
                    min="1"
                    max="10"
                    inputMode="decimal"
                    value={session.plannedRpe ?? ''}
                    onChange={(event) =>
                      update({ plannedRpe: event.target.value })
                    }
                    aria-invalid={Boolean(errors.plannedRpe)}
                  />
                </Field>
                {getSessionType(session.type).running ||
                session.runDistance ||
                session.longestRun30 ? (
                  <div className="stress-map-field-grid">
                    <Field
                      label="Planned run distance"
                      hint="Use the same unit for both distances"
                      error={errors.runDistance}
                    >
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={session.runDistance ?? ''}
                        onChange={(event) =>
                          update({ runDistance: event.target.value })
                        }
                        aria-invalid={Boolean(errors.runDistance)}
                      />
                    </Field>
                    <Field
                      label="Longest run in the previous 30 days"
                      error={errors.longestRun30}
                    >
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={session.longestRun30 ?? ''}
                        onChange={(event) =>
                          update({ longestRun30: event.target.value })
                        }
                        aria-invalid={Boolean(errors.longestRun30)}
                      />
                    </Field>
                  </div>
                ) : null}
                <h3>After the session</h3>
                <div className="stress-map-field-grid">
                  <Field
                    label="Completed duration"
                    hint="Minutes"
                    error={errors.actualDuration}
                  >
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      inputMode="numeric"
                      value={session.actualDuration ?? ''}
                      onChange={(event) =>
                        update({ actualDuration: event.target.value })
                      }
                      aria-invalid={Boolean(errors.actualDuration)}
                    />
                  </Field>
                  <Field
                    label="Completed session effort score"
                    hint="1 to 10"
                    error={errors.actualRpe}
                  >
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={session.actualRpe ?? ''}
                      onChange={(event) =>
                        update({ actualRpe: event.target.value })
                      }
                      aria-invalid={Boolean(errors.actualRpe)}
                    />
                  </Field>
                </div>
                <Field label="Performance compared with your target">
                  <select
                    value={session.review?.performance || ''}
                    onChange={(event) =>
                      update({
                        review: {
                          ...session.review,
                          performance: event.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Not recorded</option>
                    <option value="better">Better</option>
                    <option value="expected">As expected</option>
                    <option value="worse">Worse</option>
                  </select>
                </Field>
              </details>
              <Field label="Notes" hint="Optional">
                <textarea
                  rows="3"
                  value={session.notes || ''}
                  onChange={(event) => update({ notes: event.target.value })}
                />
              </Field>
            </div>
            <footer className="stress-map-editor__footer">
              <button
                type="button"
                className="stress-map-button stress-map-button--ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="stress-map-button stress-map-button--signal"
                onClick={save}
              >
                Save session
              </button>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
