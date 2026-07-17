'use client'

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { useState } from 'react'

export function ReadingProgress({ label = 'Article reading progress' }) {
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(0)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.22,
  })

  useMotionValueEvent(scrollYProgress, 'change', (latest) => setValue(Math.round(latest * 100)))

  if (reduceMotion) return null

  return (
    <div
      className="journal-reading-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={value}
    >
      <motion.span style={{ scaleX }} />
    </div>
  )
}
