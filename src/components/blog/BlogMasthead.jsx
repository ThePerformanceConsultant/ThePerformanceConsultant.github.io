'use client'

import { motion, useReducedMotion } from 'motion/react'

export function BlogMasthead({
  eyebrow = 'The Performance Consultant Blog',
  title = 'Training and nutrition,',
  emphasis = 'examined properly.',
  introduction = 'Detailed articles for athletes who want their decisions grounded in evidence, context and practical application.',
  articleCount,
}) {
  const reduceMotion = useReducedMotion()
  const reveal = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 32 },
    animate: reduceMotion ? undefined : { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
  })

  return (
    <section className="journal-masthead" aria-labelledby="journal-title">
      <div className="journal-masthead__grid" aria-hidden="true" />
      <motion.div className="journal-masthead__eyebrow" {...reveal(0.05)}>
        <span>Editorial</span>
        <i />
        <p>{eyebrow}</p>
      </motion.div>

      <div className="journal-masthead__title-wrap">
        <motion.h1 id="journal-title" {...reveal(0.12)}>
          <span>{title}</span>
          <em>{emphasis}</em>
        </motion.h1>
        <motion.div
          className="journal-masthead__orbital"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.88, rotate: -18 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.25, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          <span /><span /><span />
          <b>READ • APPLY • REVIEW •</b>
        </motion.div>
      </div>

      <motion.div className="journal-masthead__footer" {...reveal(0.25)}>
        <p>{introduction}</p>
        {Number.isFinite(Number(articleCount)) && (
          <div className="journal-masthead__count">
            <strong>{String(articleCount).padStart(2, '0')}</strong>
            <span>Published<br />articles</span>
          </div>
        )}
      </motion.div>
    </section>
  )
}
