import { motion, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import { ArrowIcon } from './Icons.jsx'

export function Reveal({ children, className = '', delay = 0, y = 36, as = 'div' }) {
  const Component = motion[as]
  const reduceMotion = useReducedMotion()

  return (
    <Component
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  )
}

export function MagneticButton({ children, href, onClick, tone = 'light', type = 'button', className = '' }) {
  const innerRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const Component = href ? motion.a : motion.button

  const move = (event) => {
    if (reduceMotion || !innerRef.current) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.14
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.2
    innerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }

  const reset = () => {
    if (innerRef.current) innerRef.current.style.transform = 'translate3d(0, 0, 0)'
  }

  return (
    <Component
      className={`magnetic-button magnetic-button--${tone} ${className}`}
      href={href}
      onClick={onClick}
      type={href ? undefined : type}
      onPointerMove={move}
      onPointerLeave={reset}
      whileTap={{ scale: 0.98 }}
    >
      <span ref={innerRef} className="magnetic-button__inner">
        <span>{children}</span>
        <ArrowIcon />
      </span>
    </Component>
  )
}

export function SectionLabel({ index, children, light = false }) {
  return (
    <div className={`section-label ${light ? 'section-label--light' : ''}`}>
      <span>{index}</span>
      <i aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}
