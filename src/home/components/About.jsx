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
        <Reveal as="h2" delay={0.08}>PhD level knowledge, applied to <em>easy to action coaching.</em></Reveal>
        <Reveal as="p" delay={0.14}>
          15 years coaching, 10 years as a molecular biologist, and experience from thousands of clients from 20+ countries inform my practice. The difference is not only is my mission to empower you with scientific precision without the headache... but whoever you are and whatever your goal, if you give me 100%, I'll back you with an extra 20%. Each recommendation is moulded around and adapted to you, your goals and lifestyle demands as they evolve, not the other way around. My ultimate goal is for you to feel like the driver in your story, guided by me.
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
