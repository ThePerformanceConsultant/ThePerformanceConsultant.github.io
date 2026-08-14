import { useEffect, useState } from 'react'

const MAIN_SITE = ''
const navigation = [
  ['Method', `${MAIN_SITE}/#method`],
  ['Results', `${MAIN_SITE}/#results`],
  ['Coaching', `${MAIN_SITE}/#coaching`],
  ['About', `${MAIN_SITE}/#about`],
  ['Questions', `${MAIN_SITE}/#questions`],
  ['Blog', '/blog'],
]

function BlogLink({ href, children, ...props }) {
  const navigate = (event) => {
    if (href !== '/blog' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.history.pushState({}, '', href)
    window.dispatchEvent(new Event('publication:navigate'))
  }
  return <a href={href} onClick={navigate} {...props}>{children}</a>
}

export function Shell({ children, activeSection = 'Blog' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [condensed, setCondensed] = useState(false)

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 44)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('menu-visible', menuOpen)
    return () => document.body.classList.remove('menu-visible')
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined
    const close = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [menuOpen])

  return (
    <div className="site blog-site" id="top">
      <header className={`header publication-header ${condensed ? 'header--condensed' : ''}`}>
        <a className="header__brand" href={`${MAIN_SITE}/#top`} aria-label="The Performance Consultant home">
          <img src="/brand/logo-lockup-light.png" alt="The Performance Consultant" />
        </a>
        <nav className="header__nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <BlogLink key={href} href={href} className={label === activeSection ? 'is-active' : undefined} aria-current={label === activeSection ? 'page' : undefined}>
              {label}
            </BlogLink>
          ))}
        </nav>
        <a className="header__apply publication-header__apply" href={`${MAIN_SITE}/?apply=1`}>
          <span>Apply</span><span aria-hidden="true">↗</span>
        </a>
        <button
          className="header__menu"
          type="button"
          aria-controls="publication-mobile-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span /><span />
        </button>
      </header>

      {menuOpen && (
        <div id="publication-mobile-navigation" className="publication-mobile-menu" role="dialog" aria-modal="true" aria-label="Site navigation">
          <nav>
            {navigation.map(([label, href], index) => (
              <BlogLink key={href} href={href} onClick={() => setMenuOpen(false)}>
                <span>{String(index + 1).padStart(2, '0')}</span>{label}
              </BlogLink>
            ))}
          </nav>
          <a href={`${MAIN_SITE}/?apply=1`}>Start an application <span aria-hidden="true">↗</span></a>
        </div>
      )}

      <main className="blog-main" id="main-content">{children}</main>

      <footer className="footer">
        <div className="footer__brand">
          <img src="/brand/logo-lockup-light.png" alt="The Performance Consultant" />
          <p>Evidence-led online performance and nutrition coaching.</p>
        </div>
        <div className="footer__contact">
          <span>Enquiries</span>
          <a href="mailto:will@theperformanceconsultant.net">will@theperformanceconsultant.net</a>
        </div>
        <nav aria-label="Footer navigation">
          <a href={`${MAIN_SITE}/#method`}>Method</a>
          <a href={`${MAIN_SITE}/#results`}>Results</a>
          <a href={`${MAIN_SITE}/#coaching`}>Coaching</a>
          <a href={`${MAIN_SITE}/#about`}>About</a>
          <BlogLink href="/blog">Blog</BlogLink>
          <a href="#top">Top ↑</a>
        </nav>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} The Performance Consultant</span>
          <span>Performance and nutrition coaching for the everyday athlete.</span>
        </div>
      </footer>
    </div>
  )
}
