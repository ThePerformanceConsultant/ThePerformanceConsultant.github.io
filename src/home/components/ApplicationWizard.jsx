import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ArrowIcon, CloseIcon } from './Icons.jsx'

const steps = ['Contact', 'Context', 'Focus', 'Confirm']
const APPLICATION_ENDPOINT = 'https://performance-consultant-studio.vercel.app/api/applications'

const initialValues = {
  fullName: '',
  email: '',
  timezone: '',
  adult: false,
  goal: '',
  sessions: '',
  trainingHistory: '',
  nutritionHistory: '',
  desiredOutcome: '',
  plan: '',
  start: '',
  weeklyReview: '',
  whyNow: '',
  investment: false,
  privacy: false,
  accuracy: false,
  website: '',
}

function Field({ label, children, hint }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

function SelectField({ label, name, value, onChange, children }) {
  return (
    <Field label={label}>
      <select name={name} value={value} onChange={onChange} required>
        <option value="" disabled>Select one</option>
        {children}
      </select>
    </Field>
  )
}

export function ApplicationWizard({ open, onClose, initialPlan = '' }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [values, setValues] = useState(initialValues)
  const [submitState, setSubmitState] = useState('idle')
  const [message, setMessage] = useState('')
  const formRef = useRef(null)
  const titleRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return undefined
    document.body.classList.add('application-open')
    const onKey = (event) => {
      if (event.key === 'Escape' && submitState !== 'submitting') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('application-open')
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, submitState])

  useEffect(() => {
    if (open) window.setTimeout(() => titleRef.current?.focus(), 80)
  }, [open, step])

  useEffect(() => {
    if (open) {
      setValues((current) => ({ ...current, plan: initialPlan }))
    }
  }, [open, initialPlan])

  const change = (event) => {
    const { name, type, checked, value } = event.target
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const goBack = () => {
    setDirection(-1)
    setMessage('')
    setStep((current) => Math.max(0, current - 1))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formRef.current?.reportValidity()) return

    if (step < steps.length - 1) {
      setDirection(1)
      setMessage('')
      setStep((current) => current + 1)
      return
    }

    setSubmitState('submitting')
    setMessage('')

    try {
      const response = await fetch(APPLICATION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'The application service is not available yet.')
      }

      setSubmitState('success')
    } catch (error) {
      setSubmitState('error')
      setMessage(`${error.message} Your answers have not been reported as submitted. Please contact will@theperformanceconsultant.net.`)
    }
  }

  const resetAndClose = () => {
    setStep(0)
    setDirection(1)
    setValues(initialValues)
    setSubmitState('idle')
    setMessage('')
    onClose()
  }

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <p className="application__step-kicker">01 / Contact and eligibility</p>
          <h2 className="application__step-title" id="application-title" ref={titleRef} tabIndex="-1">First, the essentials.</h2>
          <p className="application__step-copy">This takes approximately four minutes. Completing it does not commit you to coaching.</p>
          <div className="application__fields application__fields--two">
            <Field label="Full name">
              <input name="fullName" value={values.fullName} onChange={change} autoComplete="name" required />
            </Field>
            <Field label="Email address">
              <input type="email" name="email" value={values.email} onChange={change} autoComplete="email" required />
            </Field>
          </div>
          <Field label="Country and time zone" hint="For example: United Kingdom, GMT/BST">
            <input name="timezone" value={values.timezone} onChange={change} autoComplete="country-name" required />
          </Field>
          <label className="check-field">
            <input type="checkbox" name="adult" checked={values.adult} onChange={change} required />
            <span>I confirm that I am 18 years of age or older.</span>
          </label>
          <label className="application__honeypot" aria-hidden="true">
            Website<input name="website" value={values.website} onChange={change} tabIndex="-1" autoComplete="off" />
          </label>
        </>
      )
    }

    if (step === 1) {
      return (
        <>
          <p className="application__step-kicker">02 / Goals and current context</p>
          <h2 className="application__step-title" id="application-title" ref={titleRef} tabIndex="-1">What needs to change?</h2>
          <p className="application__step-copy">Specific answers make the initial review more useful. There is no need to provide medical information here.</p>
          <div className="application__fields application__fields--two">
            <SelectField label="Primary goal" name="goal" value={values.goal} onChange={change}>
              <option>Strength or performance</option>
              <option>Muscle gain</option>
              <option>Fat loss or body composition</option>
              <option>Competition preparation</option>
              <option>Return to consistent training</option>
              <option>Other</option>
            </SelectField>
            <SelectField label="Current weekly training" name="sessions" value={values.sessions} onChange={change}>
              <option>Not currently training</option>
              <option>1 to 2 sessions</option>
              <option>3 sessions</option>
              <option>4 sessions</option>
              <option>5 sessions</option>
              <option>6 sessions</option>
              <option>7 or more sessions</option>
            </SelectField>
          </div>
          <Field label="Current training structure and experience">
            <textarea name="trainingHistory" value={values.trainingHistory} onChange={change} rows="4" maxLength="1200" required placeholder="What do you train, how is the week organised, and how long have you trained consistently?" />
          </Field>
          <Field label="Current nutrition structure and tracking experience">
            <textarea name="nutritionHistory" value={values.nutritionHistory} onChange={change} rows="4" maxLength="1200" required placeholder="How do you currently organise your food intake, and what have you tracked or changed previously?" />
          </Field>
          <Field label="What outcome would make coaching worthwhile?">
            <textarea name="desiredOutcome" value={values.desiredOutcome} onChange={change} rows="4" maxLength="1200" required placeholder="Describe the result you want and any useful time frame." />
          </Field>
        </>
      )
    }

    if (step === 2) {
      return (
        <>
          <p className="application__step-kicker">03 / Coaching focus</p>
          <h2 className="application__step-title" id="application-title" ref={titleRef} tabIndex="-1">Choose the coaching focus.</h2>
          <p className="application__step-copy">If you are unsure, select guidance. The appropriate service can be discussed after review.</p>
          <div className="application__fields application__fields--two">
            <SelectField label="Preferred service" name="plan" value={values.plan} onChange={change}>
              <option>Rx - Nutrition Focus, £149 per month</option>
              <option>Rx - Training Focus, £149 per month</option>
              <option>Rx+ - Integrated Training and Nutrition, £249 per month</option>
              <option>Unsure, I would like guidance</option>
            </SelectField>
            <SelectField label="Preferred start" name="start" value={values.start} onChange={change}>
              <option>As soon as possible</option>
              <option>Within 2 to 4 weeks</option>
              <option>Within 1 to 3 months</option>
              <option>I am researching for now</option>
            </SelectField>
          </div>
          <SelectField label="Can you complete a weekly review and provide honest feedback?" name="weeklyReview" value={values.weeklyReview} onChange={change}>
            <option>Yes</option>
            <option>I would like to discuss what this involves</option>
            <option>Not currently</option>
          </SelectField>
          <Field label="Why are you looking for coaching now?">
            <textarea name="whyNow" value={values.whyNow} onChange={change} rows="4" maxLength="1200" required />
          </Field>
        </>
      )
    }

    return (
      <>
        <p className="application__step-kicker">04 / Review and consent</p>
        <h2 className="application__step-title" id="application-title" ref={titleRef} tabIndex="-1">Confirm and send.</h2>
        <p className="application__step-copy">Your application will be reviewed for coaching suitability. Submission does not create a coaching relationship.</p>
        <div className="application__summary">
          <div><span>Name</span><strong>{values.fullName}</strong></div>
          <div><span>Goal</span><strong>{values.goal}</strong></div>
          <div><span>Service</span><strong>{values.plan}</strong></div>
          <div><span>Start</span><strong>{values.start}</strong></div>
        </div>
        <div className="application__consents">
          <label className="check-field">
            <input type="checkbox" name="investment" checked={values.investment} onChange={change} required />
            <span>I understand that Rx - Nutrition Focus and Rx - Training Focus each cost £149 per month, and Rx+ costs £250 per month.</span>
          </label>
          <label className="check-field">
            <input type="checkbox" name="privacy" checked={values.privacy} onChange={change} required />
            <span>I consent to my answers being used to assess and respond to this coaching enquiry.</span>
          </label>
          <label className="check-field">
            <input type="checkbox" name="accuracy" checked={values.accuracy} onChange={change} required />
            <span>I confirm that the information provided is accurate to the best of my knowledge.</span>
          </label>
        </div>
        <div className="application__privacy-note">
          <strong>Privacy note</strong>
          <p>Do not submit detailed medical information through this form. Contact Will to request access to or deletion of your application. A complete public privacy notice and retention period must be confirmed before launch.</p>
        </div>
      </>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="application"
          role="dialog"
          aria-modal="true"
          aria-labelledby="application-title"
          initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(100% 0 0 0)' }}
          animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0% 0 0 0)' }}
          exit={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.72, ease: [0.76, 0, 0.24, 1] }}
        >
          <aside className="application__aside">
            <img src="/brand/logo-lockup-light.png" alt="The Performance Consultant" />
            <div className="application__meter" aria-label={`Step ${step + 1} of ${steps.length}`}>
              {steps.map((label, index) => (
                <div className={index <= step ? 'is-active' : ''} key={label}>
                  <span>0{index + 1}</span><i /><p>{label}</p>
                </div>
              ))}
            </div>
            <p className="application__aside-note">Pre-qualification questionnaire</p>
          </aside>

          <main className="application__main">
            <button className="application__close" type="button" onClick={onClose} aria-label="Close application">
              <CloseIcon />
            </button>

            {submitState === 'success' ? (
              <motion.div className="application__success" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>
                <p>Application received</p>
                <h2 id="application-title">Thank you, {values.fullName.split(' ')[0]}.</h2>
                <p>Your application has been accepted by the submission service for review. This form is not monitored for urgent medical concerns.</p>
                <button type="button" onClick={resetAndClose}>Return to the site <ArrowIcon /></button>
              </motion.div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    className="application__step"
                    key={step}
                    custom={direction}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? 72 : -72 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -72 : 72 }}
                    transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>

                {message && <p className="application__message" role="alert">{message}</p>}

                <footer className="application__controls">
                  {step > 0 ? <button type="button" onClick={goBack}>Back</button> : <span />}
                  <button className="application__next" type="submit" disabled={submitState === 'submitting'}>
                    {submitState === 'submitting' ? 'Sending…' : step === steps.length - 1 ? 'Submit application' : 'Continue'}
                    <ArrowIcon />
                  </button>
                </footer>
              </form>
            )}
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
