import { motion, useReducedMotion } from 'motion/react'
import { plans } from '../data/content.js'
import { TickIcon } from './Icons.jsx'
import { MagneticButton, Reveal, SectionLabel } from './MotionPrimitives.jsx'

function PlanPrice({ price }) {
  return (
    <div className="plan-card__price" aria-label={`£${price} per month`}>
      <span aria-hidden="true">£</span>
      <strong aria-hidden="true">{price}</strong>
      <span aria-hidden="true">per month</span>
    </div>
  )
}

function FeatureList({ features }) {
  return (
    <ul>
      {features.map((feature) => (
        <li key={feature}><TickIcon /><span>{feature}</span></li>
      ))}
    </ul>
  )
}

function RxFocus({ focus, onApply }) {
  const headingId = `plan-${focus.id}-heading`

  return (
    <section className="plan-focus" aria-labelledby={headingId}>
      <header className="plan-focus__header">
        <span>Rx</span>
        <h4 id={headingId}>{focus.name}</h4>
        <p>{focus.intro}</p>
      </header>

      <div className="plan-focus__group">
        <h5>Core coaching</h5>
        <FeatureList features={focus.coreFeatures} />
      </div>

      <div className="plan-focus__group plan-focus__group--additional">
        <h5>Additional support</h5>
        <FeatureList features={focus.additionalFeatures} />
      </div>

      <MagneticButton onClick={() => onApply(focus.applicationValue)} tone="dark">
        Apply for {focus.name}
      </MagneticButton>
    </section>
  )
}

export function Plans({ onApply }) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="plans" id="coaching">
      <div className="plans__heading">
        <Reveal><SectionLabel index="03">Coaching options</SectionLabel></Reveal>
        <Reveal as="h2" delay={0.08}>Choose the level of <em>oversight</em> your goal requires.</Reveal>
        <Reveal as="p" delay={0.14}>
          Rx applies detailed coaching to one primary discipline. Rx+ integrates training and nutrition in full, with closer access, detailed review and broader performance management.
        </Reveal>
      </div>

      <div className="plans__stack">
        {plans.map((plan) => (
          <motion.article
            className={`plan-card plan-card--${plan.tone} plan-card--${plan.layout}`}
            key={plan.id}
            initial={reduceMotion ? false : { opacity: 0, y: 70 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.95, delay: plan.layout === 'integrated' ? 0.12 : 0, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="plan-card__header">
              <div className="plan-card__identity">
                <span>{plan.label}</span>
                <h3>{plan.name}</h3>
              </div>
              <PlanPrice price={plan.price} />
              {plan.intro && <p>{plan.intro}</p>}
            </header>

            {plan.layout === 'focuses' ? (
              <div className="plan-focuses">
                {plan.focuses.map((focus) => (
                  <RxFocus focus={focus} key={focus.id} onApply={onApply} />
                ))}
              </div>
            ) : (
              <div className="plan-card__integrated-body">
                <div className="plan-focus__group">
                  <h4>Integrated coaching</h4>
                  <FeatureList features={plan.features} />
                </div>
                <MagneticButton onClick={() => onApply(plan.applicationValue)} tone="gold">
                  Apply for {plan.name}
                </MagneticButton>
              </div>
            )}

            <span className="plan-card__watermark" aria-hidden="true">{plan.name}</span>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
