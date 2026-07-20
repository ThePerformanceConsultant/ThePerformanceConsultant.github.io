import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { methodSteps } from '../data/content.js'
import { SectionLabel } from './MotionPrimitives.jsx'

function useDesktopRail() {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)')
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return desktop
}

export function Method() {
  const sectionRef = useRef(null)
  const desktop = useDesktopRail()
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], ['0vw', '-280vw'])
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section className="method" id="method" ref={sectionRef}>
      <div className="method__sticky">
        <motion.div className="method__progress" style={{ scaleX: progress }} />
        <motion.div className="method__rail" style={desktop && !reduceMotion ? { x } : undefined}>
          <article className="method__intro">
            <SectionLabel index="01" light>How coaching works</SectionLabel>
            <h2>Decisions made from <em>context.</em></h2>
            <p>
              My coaching process is structured, yet flexible and dynamic. While each phase has a clear purpose, every adjustment must be supported by the available evidence and, most importantly, be compatible with your lifestyle and capabilities.
            </p>
            <span className="method__scroll-cue">Scroll to examine the process</span>
          </article>

          {methodSteps.map((step, index) => (
            <article className="method-card" key={step.index}>
              <div className="method-card__top">
                <span>{step.index}</span>
                <span>0{methodSteps.length}</span>
              </div>
              <div className="method-card__body">
                <p>{step.signal}</p>
                <h3>{step.title}</h3>
                <div className="method-card__rule"><i /></div>
                <p>{step.copy}</p>
              </div>
              <span className="method-card__ghost" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
