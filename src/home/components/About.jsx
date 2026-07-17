import { motion, useReducedMotion } from 'motion/react'
import { qualifications } from '../data/content.js'
import { ArrowIcon } from './Icons.jsx'
import { Reveal, SectionLabel } from './MotionPrimitives.jsx'

// Fine-tuning controls for the curved orbit copy.
// A smaller radius creates a tighter curve. A larger radius creates a flatter curve.
const ORBIT_TEXT_RADIUS = 172
const ORBIT_TEXT_START_OFFSET = '6%'

function createOrbitPath(radius) {
  const centre = 200
  const top = centre - radius
  const bottom = centre + radius
  return `M ${centre} ${top} A ${radius} ${radius} 0 1 1 ${centre} ${bottom} A ${radius} ${radius} 0 1 1 ${centre} ${top}`
}

export function About() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="about" id="about">
      <div className="about__identity">
        <Reveal><SectionLabel index="04" light>Your consultant</SectionLabel></Reveal>
        <Reveal as="h2" delay={0.08}>Formal study, applied to <em>real coaching decisions.</em></Reveal>
        <Reveal as="p" delay={0.14}>
          Academic training in molecular biology, biosciences and performance nutrition informs the process. Each recommendation is then shaped around the athlete, the goal and the demands of the week in front of them.
        </Reveal>
        <Reveal delay={0.2}>
          <a className="about__email" href="mailto:will@theperformanceconsultant.net">
            will@theperformanceconsultant.net <ArrowIcon />
          </a>
        </Reveal>
        <motion.div
          className="about__mark"
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0, rotate: -18, scale: 0.72 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, rotate: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src="/brand/logo-mark.png" alt="" />
          <svg className="about__orbit" viewBox="0 0 400 400" role="presentation">
            <defs>
              <path id="about-orbit-path" d={createOrbitPath(ORBIT_TEXT_RADIUS)} />
            </defs>
            <text>
              <textPath href="#about-orbit-path" startOffset={ORBIT_TEXT_START_OFFSET}>
                EVIDENCE · APPLICATION · REVIEW ·
              </textPath>
            </text>
          </svg>
        </motion.div>
      </div>

      <div className="qualifications" aria-label="Qualifications">
        {qualifications.map((qualification, index) => (
          <motion.div
            key={qualification}
            initial={reduceMotion ? false : { opacity: 0, x: 42 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.72, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{qualification}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
