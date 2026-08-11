import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { MagneticButton } from './MotionPrimitives.jsx'

const titleLines = ['Effort', 'deserves', 'direction.']

export function Hero({ onApply }) {
  const sectionRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.03, 1.12])
  const typeY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])

  return (
    <section className="hero" id="top" ref={sectionRef}>
      <div className="hero__ambient" aria-hidden="true" />
      <motion.div className="hero__type" style={reduceMotion ? undefined : { y: typeY }}>
        <motion.p
          className="hero__kicker"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.75 }}
        >
          Online performance &amp; nutrition coaching
        </motion.p>

        <h1>
          {titleLines.map((line, index) => (
            <span className={index === 1 ? 'hero__serif' : ''} key={line}>
              <motion.i
                initial={reduceMotion ? false : { y: '112%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1.05, delay: 0.46 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                {line}
              </motion.i>
            </span>
          ))}
        </h1>

        <motion.div
          className="hero__summary"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.92 }}
        >
          <p>
            Individual coaching for everyday athletes who train four to six times per week and want every part of the plan to support the same outcome.
          </p>
          <div className="hero__actions">
            <MagneticButton onClick={onApply} tone="gold">Apply for coaching</MagneticButton>
            <a href="#coaching" className="hero__text-link">Compare coaching options</a>
          </div>
        </motion.div>
      </motion.div>

      <motion.figure
        className="hero__portrait"
        initial={reduceMotion ? false : { clipPath: 'inset(0 0 100% 0 round 999px 999px 0 0)' }}
        animate={{ clipPath: 'inset(0 0 0% 0 round 0 0 0 0)' }}
        transition={{ duration: 1.35, delay: 0.18, ease: [0.76, 0, 0.24, 1] }}
      >
        <motion.img
          src="/images/will-stage.webp"
          alt="Will, The Performance Consultant, competing on stage"
          style={reduceMotion ? undefined : { y: imageY, scale: imageScale }}
        />
        <div className="hero__portrait-wash" aria-hidden="true" />
        <figcaption>
          <span>Will</span>
          <span>Coach · Athlete · Scientist</span>
        </figcaption>
      </motion.figure>

      <motion.div
        className="hero__index"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <span>Train</span><i /><span>Fuel</span><i /><span>Recover</span>
      </motion.div>
    </section>
  )
}
