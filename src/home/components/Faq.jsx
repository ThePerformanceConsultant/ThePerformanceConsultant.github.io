import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { faqs } from '../data/content.js'
import { PlusIcon } from './Icons.jsx'
import { Reveal, SectionLabel } from './MotionPrimitives.jsx'

export function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <section className="faq" id="questions">
      <div className="faq__heading">
        <Reveal><SectionLabel index="05">Before you apply</SectionLabel></Reveal>
        <Reveal as="h2" delay={0.08}>Frequently asked questions.</Reveal>
      </div>
      <Reveal className="faq__list" delay={0.12}>
        {faqs.map((item, index) => {
          const isOpen = open === index
          return (
            <article className={`faq-item ${isOpen ? 'faq-item--open' : ''}`} key={item.question}>
              <button type="button" onClick={() => setOpen(isOpen ? -1 : index)} aria-expanded={isOpen}>
                <span>0{index + 1}</span>
                <strong>{item.question}</strong>
                <motion.i animate={{ rotate: isOpen ? 45 : 0 }}><PlusIcon /></motion.i>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className="faq-item__answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.38, ease: [0.76, 0, 0.24, 1] }}
                  >
                    <p>{item.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          )
        })}
      </Reveal>
    </section>
  )
}
