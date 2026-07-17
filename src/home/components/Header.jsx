'use client'

import { AnimatePresence, motion, useReducedMotion, useScroll, useMotionValueEvent } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowIcon, CloseIcon } from './Icons.jsx'

const links = [
  ['Method', '#method'],
  ['Results', '#results'],
  ['Coaching', '#coaching'],
  ['About', '#about'],
  ['Questions', '#questions'],
  ['Blog', '/blog'],
]

export function Header({ onApply }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [condensed, setCondensed] = useState(false)
  const menuButtonRef = useRef(null)
  const menuPanelRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (value) => setCondensed(value > 44))

  useEffect(() => {
    document.body.classList.toggle('menu-visible', menuOpen)
    return () => document.body.classList.remove('menu-visible')
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined

    const panel = menuPanelRef.current
    const menuButton = menuButtonRef.current
    const panelControls = Array.from(panel?.querySelectorAll('a[href], button:not([disabled])') || [])
    const controls = [menuButton, ...panelControls].filter(Boolean)
    panelControls[0]?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        requestAnimationFrame(() => menuButton?.focus())
        return
      }

      if (event.key !== 'Tab' || controls.length < 2) return

      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  useEffect(() => {
    if (typeof onApply !== 'function') return

    const url = new URL(window.location.href)
    if (url.searchParams.get('apply') !== '1') return

    onApply()
    url.searchParams.delete('apply')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [onApply])

  const close = () => setMenuOpen(false)
  const resolveHref = (href) => href.startsWith('#') && pathname !== '/' ? `/${href}` : href
  const handleApply = () => {
    close()
    if (typeof onApply === 'function') {
      onApply()
      return
    }
    window.location.assign('/?apply=1')
  }

  return (
    <>
      <header className={`header ${condensed ? 'header--condensed' : ''}`}>
        <a className="header__brand" href={pathname === '/' ? '#top' : '/#top'} aria-label="The Performance Consultant home" onClick={close}>
          <img src="/brand/logo-lockup-light.png" alt="The Performance Consultant" />
        </a>
        <nav className="header__nav" aria-label="Primary navigation">
          {links.map(([label, href]) => {
            const active = href === '/blog' && pathname.startsWith('/blog')
            return (
              <a
                key={href}
                href={resolveHref(href)}
                className={active ? 'is-active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </a>
            )
          })}
        </nav>
        <button className="header__apply" type="button" onClick={handleApply}>
          <span>Apply</span><ArrowIcon />
        </button>
        <button
          ref={menuButtonRef}
          className="header__menu"
          type="button"
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <CloseIcon /> : <><span /><span /></>}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuPanelRef}
            id="mobile-navigation"
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={reduceMotion ? false : { clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Mobile navigation">
              {links.map(([label, href], index) => (
                <motion.a
                  key={href}
                  href={resolveHref(href)}
                  onClick={close}
                  aria-current={href === '/blog' && pathname.startsWith('/blog') ? 'page' : undefined}
                  initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: 0.18 + index * 0.07 }}
                >
                  <span>0{index + 1}</span>{label}
                </motion.a>
              ))}
            </nav>
            <button type="button" onClick={handleApply}>
              Start an application <ArrowIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
