import { motion, useReducedMotion } from 'motion/react'
import { plans } from '../data/content.js'
import { TickIcon } from './Icons.jsx'
import { MagneticButton, Reveal, SectionLabel } from './MotionPrimitives.jsx'

export function Plans({ onApply }) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="plans" id="coaching">
      <div className="plans__heading">
        <Reveal><SectionLabel index="03">Coaching options</SectionLabel></Reveal>
        <Reveal as="h2" delay={0.08}>Choose the level of <em>oversight</em> your goal requires.</Reveal>
        <Reveal as="p" delay={0.14}>
          Both services integrate training and nutrition. Rx+ adds closer access, detailed movement review and broader performance management.
        </Reveal>
      </div>

      <div className="plans__grid">
        {plans.map((plan, index) => (
          <motion.article
            className={`plan-card ${index === 1 ? 'plan-card--dark' : ''}`}
            key={plan.name}
            initial={reduceMotion ? false : { opacity: 0, y: 70, rotate: index === 0 ? -1.5 : 1.5 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.95, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <header>
              <span>{plan.label}</span>
              <h3>{plan.name}</h3>
              <p>{plan.intro}</p>
            </header>
            <div className="plan-card__price">
              <span>£</span><strong>{plan.price}</strong><span>per month</span>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}><TickIcon /><span>{feature}</span></li>
              ))}
            </ul>
            <MagneticButton onClick={onApply} tone={index === 1 ? 'gold' : 'dark'}>
              Apply for {plan.name}
            </MagneticButton>
            <span className="plan-card__watermark" aria-hidden="true">{plan.name}</span>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
