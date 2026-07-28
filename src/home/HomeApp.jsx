'use client'

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { About } from './components/About.jsx'
import { ApplicationWizard } from './components/ApplicationWizard.jsx'
import { Faq } from './components/Faq.jsx'
import { Header } from './components/Header.jsx'
import { Hero } from './components/Hero.jsx'
import { Method } from './components/Method.jsx'
import { Plans } from './components/Plans.jsx'
import { SiteFooter } from './components/SiteFooter.jsx'
import { Testimonials } from './components/Testimonials.jsx'
import { MagneticButton, Reveal, SectionLabel } from './components/MotionPrimitives.jsx'

function OpeningSequence({ visible }) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="opening"
          initial={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: '-100%' }}
          transition={{ duration: reduceMotion ? 0.15 : 0.82, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="opening__brand">
            <motion.img
              src="/brand/logo-mark.png"
              alt=""
              initial={reduceMotion ? false : { opacity: 0, scale: 0.82, rotate: -9 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
              The Performance Consultant
            </motion.p>
          </div>
          <div className="opening__load" aria-hidden="true">
            <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }} />
          </div>
          <span className="opening__note">Performance · Nutrition · Recovery</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SignalBand() {
  const signals = ['Training', 'Nutrition', 'Strength', 'Recovery', 'Fitness', 'Hybrid', 'Feedback', 'Progression',]
  return (
    <div className="signal-band" aria-hidden="true">
      <div className="signal-band__track">
        {[0, 1, 2, 3, 4, 5].map((group) => (
          <div className="signal-band__group" key={group}>
            {signals.map((signal) => <span key={`${group}-${signal}`}>{signal}<i /></span>)}
          </div>
        ))}
      </div>
    </div>
  )
}

function Proposition() {
  const sectionRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const firstX = useTransform(scrollYProgress, [0, 1], ['-7%', '7%'])
  const secondX = useTransform(scrollYProgress, [0, 1], ['8%', '-8%'])

  return (
    <section className="proposition" ref={sectionRef}>
      <Reveal><SectionLabel index="00">The premise</SectionLabel></Reveal>
      <div className="proposition__statement">
        <motion.span style={reduceMotion ? undefined : { x: firstX }}>Training and nutrition</motion.span>
        <motion.span className="proposition__serif" style={reduceMotion ? undefined : { x: secondX }}>reviewed as one system.</motion.span>
      </div>
      <div className="proposition__detail">
        <Reveal as="p">
          Too many put their work ethic to waste thinking "more = better", either with output (training) or discipline (diet). Real coaching coordinates training, food, recovery and lifestyle seamlessly, instead of continually demanding you to give more.
        </Reveal>
        <div className="proposition__facts">
          <Reveal delay={0.05}><strong>4–6</strong><span>training sessions<br />per week</span></Reveal>
          <Reveal delay={0.12}><strong>01</strong><span>coordinated<br />coaching plan</span></Reveal>
          <Reveal delay={0.19}><strong>7d</strong><span>review and<br />adjustment cycle</span></Reveal>
        </div>
      </div>
    </section>
  )
}

function AthleteFit() {
  return (
    <section className="athlete-fit">
      <div className="athlete-fit__title">
        <Reveal><SectionLabel index="Fit" light>Who this is for</SectionLabel></Reveal>
        <Reveal as="h2" delay={0.08}>Consistent athletes with <em>full lives.</em></Reveal>
      </div>
      <div className="athlete-fit__list">
        {[
          'You train regularly and want a plan that works with your lifestyle.',
          'You value evidence, direct feedback, clear explanations and want to learn while you achieve.',
          'You report honestly, do the work and take responsibility for the work.',
          'You want to be strong, fit, healthy, feel good and look great.',
        ].map((item, index) => (
          <Reveal key={item} delay={index * 0.06}>
            <span>0{index + 1}</span><p>{item}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function FinalCta({ onApply }) {
  return (
    <section className="final-cta">
      <div className="final-cta__rings" aria-hidden="true"><i /><i /><i /></div>
      <Reveal><p>Applications are reviewed for fit</p></Reveal>
      <Reveal as="h2" delay={0.08}>Ready to give your effort a <em>clear direction?</em></Reveal>
      <Reveal delay={0.16}>
        <MagneticButton onClick={onApply} tone="gold">Start the questionnaire</MagneticButton>
      </Reveal>
      <span className="final-cta__micro">Approximately four minutes · No payment · No commitment</span>
    </section>
  )
}

export default function App() {
  const [opening, setOpening] = useState(true)
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [applicationInitialPlan, setApplicationInitialPlan] = useState('')
  const pointerFrame = useRef(null)
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 110, damping: 24, mass: 0.35 })

  useEffect(() => {
    const timer = window.setTimeout(() => setOpening(false), 1550)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const move = (event) => {
      if (pointerFrame.current) return
      pointerFrame.current = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`)
        document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`)
        pointerFrame.current = null
      })
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      if (pointerFrame.current) window.cancelAnimationFrame(pointerFrame.current)
    }
  }, [])

  const openApplication = useCallback((selection) => {
    setApplicationInitialPlan(typeof selection === 'string' ? selection : '')
    setApplicationOpen(true)
  }, [])
  const closeApplication = useCallback(() => setApplicationOpen(false), [])

  return (
    <div className="site" id="top">
      <OpeningSequence visible={opening} />
      <motion.div className="page-progress" style={{ scaleX: smoothProgress }} aria-hidden="true" />
      <div className="pointer-light" aria-hidden="true" />
      <Header onApply={openApplication} />
      <main>
        <Hero onApply={openApplication} />
        <SignalBand />
        <Proposition />
        <Method />
        <AthleteFit />
        <Testimonials />
        <Plans onApply={openApplication} />
        <About />
        <Faq />
        <FinalCta onApply={openApplication} />
      </main>
      <SiteFooter />
      <ApplicationWizard
        initialPlan={applicationInitialPlan}
        open={applicationOpen}
        onClose={closeApplication}
      />
    </div>
  )
}
