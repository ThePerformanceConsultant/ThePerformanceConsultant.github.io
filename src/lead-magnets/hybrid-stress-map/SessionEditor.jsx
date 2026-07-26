'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  BODY_AREAS,
  DAYS,
  DOMAIN_DEFINITIONS,
  PROGRESSION_OPTIONS,
  ROLE_OPTIONS,
  RPE_GUIDE,
  SESSION_LIBRARY,
  STRUCTURE_OPTIONS,
  getRole,
  getSessionType,
} from './constants.js'

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

function Toggle({ checked, label, onChange, disabled = false }) {
  return (
    <label className={`stress-map-toggle ${checked ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span aria-hidden="true" />
      <b>{label}</b>
    </label>
  )
}

function validateDraft(session, mode) {
  const errors = {}
  if (!session.name?.trim()) errors.name = 'Name this session.'
  const duration = Number(session.duration)
  if (!Number.isFinite(duration) || duration < 1 || duration > 360) {
    errors.duration = 'Enter 1 to 360 minutes.'
  }
  const rpe = Number(session.plannedRpe)
  if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
    errors.plannedRpe = 'Choose an RPE from 1 to 10.'
  }
  if (!session.role) errors.role = 'Choose the role of this session.'
  if (!session.progression) errors.progression = 'Choose how this session progresses.'
  if (session.type === 'custom' && !session.fingerprintConfirmed) {
    errors.fingerprint = 'Confirm that you have reviewed the custom stress fingerprint.'
  }
  const runDistance = Number(session.runDistance)
  const longest = Number(session.longestRun30)
  const hasRunDistance = session.runDistance !== '' && session.runDistance != null
  const hasLongestRun = session.longestRun30 !== '' && session.longestRun30 != null
  if (hasRunDistance && (!Number.isFinite(runDistance) || runDistance <= 0)) {
    errors.runDistance = 'Enter a positive distance.'
  }
  if (hasLongestRun && (!Number.isFinite(longest) || longest <= 0)) {
    errors.longestRun30 = 'Enter a positive distance.'
  }
  if (mode === 'review') {
    const hasActualDuration = session.actualDuration !== '' && session.actualDuration != null
    const hasActualRpe = session.actualRpe !== '' && session.actualRpe != null
    const actualDuration = Number(session.actualDuration)
    const actualRpe = Number(session.actualRpe)
    if (hasActualDuration && (!Number.isFinite(actualDuration) || actualDuration < 1 || actualDuration > 360)) {
      errors.actualDuration = 'Enter 1 to 360 minutes.'
    }
    if (hasActualRpe && (!Number.isFinite(actualRpe) || actualRpe < 1 || actualRpe > 10)) {
      errors.actualRpe = 'Choose an RPE from 1 to 10.'
    }
    if (hasActualDuration && !hasActualRpe) errors.actualRpe = 'Enter actual session RPE.'
    if (hasActualRpe && !hasActualDuration) errors.actualDuration = 'Enter actual duration.'
    const reviewScores = ['soreness', 'fatigue']
    reviewScores.forEach((field) => {
      const value = session.review?.[field]
      if (value === '' || value == null) return
      const score = Number(value)
      if (!Number.isFinite(score) || score < 0 || score > 10) {
        errors[field] = `Enter ${field} from 0 to 10.`
      }
    })
  }
  return errors
}

export function SessionEditor({ session, mode, onChange, onClose, onSave }) {
  const [errors, setErrors] = useState({})
  const dialogRef = useRef(null)
  const titleRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const reduceMotion = useReducedMotion()
  const type = getSessionType(session?.type)
  const role = getRole(session?.role)
  const isOpen = Boolean(session)
  const isRunning = Boolean(type.running || session?.runDistance)
  const effectiveStress = useMemo(
    () => ({ ...type.stress, ...(session?.stress || {}) }),
    [session?.stress, type.stress],
  )

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return undefined
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const controls = () => Array.from(
      dialog?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || [],
    )
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
      if (event.shiftKey && document.activeElement === first) {
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
  const updateReview = (patch) => update({ review: { ...session.review, ...patch } })
  const updateArray = (key, value, checked) => {
    const current = new Set(session[key] || [])
    if (checked) current.add(value)
    else current.delete(value)
    update({ [key]: [...current] })
  }

  const changeType = (value) => {
    const previousType = getSessionType(session.type)
    const nextType = getSessionType(value)
    const nameWasDefault = !session.name?.trim() || session.name === previousType.label
    update({
      type: value,
      name: nameWasDefault ? nextType.label : session.name,
      stress: { ...nextType.stress },
      fingerprintConfirmed: !nextType.custom,
    })
    setErrors((current) => ({ ...current, fingerprint: undefined }))
  }

  const save = () => {
    const nextErrors = validateDraft(session, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => dialogRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    onSave()
  }

  const loadPreview = useMemo(
    () => Math.max(0, Number(session?.duration) || 0) * Math.max(0, Number(session?.plannedRpe) || 0),
    [session?.duration, session?.plannedRpe],
  )

  return (
    <AnimatePresence>
      {session ? (
        <motion.div
          className="stress-map-editor-backdrop"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
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
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.76, 0, 0.24, 1] }}
          >
            <header className="stress-map-editor__header">
              <div>
                <span>Session details</span>
                <h2 id="stress-map-editor-title" ref={titleRef} tabIndex="-1">
                  {session.name || 'New session'}
                </h2>
              </div>
              <button type="button" className="stress-map-icon-button" onClick={onClose} aria-label="Close session editor">
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className="stress-map-editor__load" aria-label={`Planned session load ${Math.round(loadPreview)} arbitrary units`}>
              <span>Planned load</span>
              <strong>{Math.round(loadPreview).toLocaleString('en-GB')}</strong>
              <small>Duration × session RPE. Used only within your own week.</small>
            </div>

            <div className="stress-map-editor__body">
              <section className="stress-map-form-section">
                <div className="stress-map-form-section__title">
                  <span>01</span>
                  <div>
                    <h3>Place and purpose</h3>
                    <p>What is the session, when does it happen, and which goal does it serve?</p>
                  </div>
                </div>

                <div className="stress-map-field-grid stress-map-field-grid--three">
                  <Field label="Day">
                    <select value={session.day} onChange={(event) => update({ day: Number(event.target.value) })}>
                      {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Start time">
                    <input type="time" value={session.startTime} onChange={(event) => update({ startTime: event.target.value })} />
                  </Field>
                  <Field label="Fixed or movable">
                    <select value={session.mobility} onChange={(event) => update({ mobility: event.target.value })}>
                      <option value="movable">Movable</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </Field>
                </div>

                <Field label="Order when sessions share the same start time" hint="0 runs before 1, then 2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={session.sequenceAtSameTime ?? 0}
                    onChange={(event) => update({ sequenceAtSameTime: event.target.value })}
                  />
                </Field>

                <Field label="Session type">
                  <select value={session.type} onChange={(event) => changeType(event.target.value)}>
                    {SESSION_LIBRARY.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>

                <Field label="Session name" error={errors.name}>
                  <input
                    value={session.name}
                    onChange={(event) => update({ name: event.target.value })}
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>

                <div className="stress-map-field-grid">
                  <Field label="Duration" hint="Minutes" error={errors.duration}>
                    <input
                      type="number"
                      min="1"
                      max="360"
                      inputMode="numeric"
                      value={session.duration}
                      onChange={(event) => update({ duration: event.target.value })}
                      aria-invalid={Boolean(errors.duration)}
                    />
                  </Field>
                  <Field label="Expected session RPE" hint="Overall session, 1 to 10" error={errors.plannedRpe}>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      inputMode="numeric"
                      value={session.plannedRpe}
                      onChange={(event) => update({ plannedRpe: event.target.value })}
                      aria-invalid={Boolean(errors.plannedRpe)}
                    />
                  </Field>
                </div>

                <details className="stress-map-details">
                  <summary>Session-RPE guide</summary>
                  <div className="stress-map-rpe-guide">
                    {RPE_GUIDE.map(([score, label]) => <span key={score}><b>{score}</b>{label}</span>)}
                  </div>
                </details>

                <fieldset className="stress-map-choice-field" aria-invalid={Boolean(errors.role)}>
                  <legend>Goal alignment</legend>
                  <p>One role determines the alignment score. Priority 1 work only scores 3 when it directly develops that outcome.</p>
                  <div className="stress-map-choice-grid">
                    {ROLE_OPTIONS.map((item) => (
                      <label key={item.value} className={session.role === item.value ? 'is-selected' : ''}>
                        <input
                          type="radio"
                          name={`role-${session.id}`}
                          value={item.value}
                          checked={session.role === item.value}
                          onChange={() => update({ role: item.value })}
                        />
                        <span>{item.score}</span>
                        <b>{item.label}</b>
                        <small>{item.description}</small>
                      </label>
                    ))}
                  </div>
                  {errors.role ? <span className="stress-map-field__error">{errors.role}</span> : null}
                </fieldset>

                <div className="stress-map-alignment-readout">
                  <span>Alignment</span>
                  <strong>{role.score}</strong>
                  <p>{role.label}</p>
                </div>

                <fieldset className="stress-map-choice-field" aria-invalid={Boolean(errors.progression)}>
                  <legend>Is progression defined?</legend>
                  <div className="stress-map-choice-grid stress-map-choice-grid--three">
                    {PROGRESSION_OPTIONS.map((item) => (
                      <label key={item.value} className={session.progression === item.value ? 'is-selected' : ''}>
                        <input
                          type="radio"
                          name={`progression-${session.id}`}
                          value={item.value}
                          checked={session.progression === item.value}
                          onChange={() => update({ progression: item.value })}
                        />
                        <b>{item.label}</b>
                        <small>{item.description}</small>
                      </label>
                    ))}
                  </div>
                  {errors.progression ? <span className="stress-map-field__error">{errors.progression}</span> : null}
                </fieldset>
              </section>

              <section className="stress-map-form-section">
                <div className="stress-map-form-section__title">
                  <span>02</span>
                  <div>
                    <h3>Stress fingerprint</h3>
                    <p>The library provides a starting point. Adjust it when the actual session differs.</p>
                  </div>
                </div>

                <div className="stress-map-fingerprint-editor">
                  {DOMAIN_DEFINITIONS.map((domain) => (
                    <label key={domain.key}>
                      <span>
                        <b>{domain.label}</b>
                        <small>{domain.description}</small>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="1"
                        value={effectiveStress[domain.key]}
                        onChange={(event) => update({
                          stress: { ...effectiveStress, [domain.key]: Number(event.target.value) },
                        })}
                        aria-label={`${domain.label} stress score`}
                      />
                      <output>{effectiveStress[domain.key]}</output>
                    </label>
                  ))}
                </div>

                {session.type === 'custom' ? (
                  <div>
                    <Toggle
                      checked={Boolean(session.fingerprintConfirmed)}
                      label="I have reviewed these six scores"
                      onChange={(event) => update({ fingerprintConfirmed: event.target.checked })}
                    />
                    {errors.fingerprint ? <span className="stress-map-field__error">{errors.fingerprint}</span> : null}
                  </div>
                ) : null}

                <Field label="Within-session sequence" hint="Relevant when technical or power work and conditioning share a session">
                  <select value={session.structure} onChange={(event) => update({ structure: event.target.value })}>
                    {STRUCTURE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
              </section>

              <section className="stress-map-form-section">
                <div className="stress-map-form-section__title">
                  <span>03</span>
                  <div>
                    <h3>Exposure and flexibility</h3>
                    <p>These tags help identify repeated local exposure. They do not assign injury probability.</p>
                  </div>
                </div>

                <fieldset className="stress-map-toggle-field">
                  <legend>Body areas substantially exposed</legend>
                  <div className="stress-map-toggle-grid">
                    {BODY_AREAS.map((area) => (
                      <Toggle
                        key={area}
                        checked={(session.bodyAreas || []).includes(area)}
                        label={area}
                        onChange={(event) => updateArray('bodyAreas', area, event.target.checked)}
                      />
                    ))}
                  </div>
                </fieldset>

                {session.mobility === 'movable' ? (
                  <fieldset className="stress-map-toggle-field">
                    <legend>Feasible alternative days</legend>
                    <p>The tool will only suggest a move to a day you mark as feasible.</p>
                    <div className="stress-map-toggle-grid stress-map-toggle-grid--days">
                      {DAYS.map((day) => (
                        <Toggle
                          key={day.value}
                          checked={(session.availableDays || []).includes(day.value)}
                          label={day.short}
                          disabled={Number(session.day) === day.value}
                          onChange={(event) => updateArray('availableDays', day.value, event.target.checked)}
                        />
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {isRunning ? (
                  <div className="stress-map-run-fields">
                    <div className="stress-map-run-fields__intro">
                      <span>Running-distance context</span>
                      <p>The warning is specific to one run and recent distance exposure. It is not a weekly workload ratio.</p>
                    </div>
                    <div className="stress-map-field-grid">
                      <Field label="Planned run distance" hint="Use the same unit for both fields" error={errors.runDistance}>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          inputMode="decimal"
                          value={session.runDistance}
                          onChange={(event) => update({ runDistance: event.target.value })}
                          aria-invalid={Boolean(errors.runDistance)}
                        />
                      </Field>
                      <Field label="Longest run in previous 30 days" error={errors.longestRun30}>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          inputMode="decimal"
                          value={session.longestRun30}
                          onChange={(event) => update({ longestRun30: event.target.value })}
                          aria-invalid={Boolean(errors.longestRun30)}
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </section>

              {mode === 'review' ? (
                <section className="stress-map-form-section stress-map-form-section--review">
                  <div className="stress-map-form-section__title">
                    <span>04</span>
                    <div>
                      <h3>Review the completed session</h3>
                      <p>Record the overall RPE approximately 20 to 30 minutes after the session.</p>
                    </div>
                  </div>

                  <div className="stress-map-field-grid">
                    <Field label="Actual duration" hint="Minutes" error={errors.actualDuration}>
                      <input
                        type="number"
                        min="1"
                        max="360"
                        inputMode="numeric"
                        value={session.actualDuration}
                        onChange={(event) => update({ actualDuration: event.target.value })}
                        aria-invalid={Boolean(errors.actualDuration)}
                      />
                    </Field>
                    <Field label="Actual session RPE" hint="1 to 10" error={errors.actualRpe}>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        inputMode="numeric"
                        value={session.actualRpe}
                        onChange={(event) => update({ actualRpe: event.target.value })}
                        aria-invalid={Boolean(errors.actualRpe)}
                      />
                    </Field>
                  </div>

                  <div className="stress-map-field-grid">
                    <Field label="Completed as planned">
                      <select value={session.review?.completion || ''} onChange={(event) => updateReview({ completion: event.target.value })}>
                        <option value="">Choose</option>
                        <option value="yes">Yes</option>
                        <option value="partly">Partly</option>
                        <option value="no">No</option>
                      </select>
                    </Field>
                    <Field label="Performance relative to target">
                      <select value={session.review?.performance || ''} onChange={(event) => updateReview({ performance: event.target.value })}>
                        <option value="">Choose</option>
                        <option value="better">Better</option>
                        <option value="expected">Expected</option>
                        <option value="worse">Worse</option>
                      </select>
                    </Field>
                  </div>

                  <div className="stress-map-field-grid">
                    <Field label="Local soreness at next session" hint="0 to 10" error={errors.soreness}>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        inputMode="numeric"
                        value={session.review?.soreness ?? ''}
                        onChange={(event) => updateReview({ soreness: event.target.value })}
                        aria-invalid={Boolean(errors.soreness)}
                      />
                    </Field>
                    <Field label="General fatigue at next session" hint="0 to 10" error={errors.fatigue}>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        inputMode="numeric"
                        value={session.review?.fatigue ?? ''}
                        onChange={(event) => updateReview({ fatigue: event.target.value })}
                        aria-invalid={Boolean(errors.fatigue)}
                      />
                    </Field>
                  </div>

                  <Field label="Reason for deviation">
                    <select value={session.review?.deviationReason || ''} onChange={(event) => updateReview({ deviationReason: event.target.value })}>
                      <option value="">No deviation or choose a reason</option>
                      <option value="time">Time</option>
                      <option value="fatigue">Fatigue</option>
                      <option value="pain">Pain</option>
                      <option value="class-content">Class content</option>
                      <option value="motivation">Motivation</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>

                  <Toggle
                    checked={Boolean(session.review?.painChangesMovement)}
                    label="Pain changed how I moved or trained"
                    onChange={(event) => updateReview({ painChangesMovement: event.target.checked })}
                  />
                  {session.review?.painChangesMovement ? (
                    <p className="stress-map-clinical-note">
                      Pain that changes movement, worsens, or includes neurological symptoms requires appropriate assessment rather than a higher spreadsheet score.
                    </p>
                  ) : null}
                </section>
              ) : null}

              <Field label="Notes" hint="Optional">
                <textarea
                  rows="4"
                  value={session.notes || ''}
                  onChange={(event) => update({ notes: event.target.value })}
                  placeholder="Anything important about class content, constraints or progression."
                />
              </Field>
            </div>

            <footer className="stress-map-editor__footer">
              <button type="button" className="stress-map-button stress-map-button--ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="stress-map-button stress-map-button--signal" onClick={save}>Save session</button>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
