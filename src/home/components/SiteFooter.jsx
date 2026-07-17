'use client'

import { usePathname } from 'next/navigation'

const footerLinks = [
  ['Method', '#method'],
  ['Results', '#results'],
  ['Coaching', '#coaching'],
  ['About', '#about'],
]

export function SiteFooter() {
  const pathname = usePathname()
  const sectionHref = (hash) => pathname === '/' ? hash : `/${hash}`

  return (
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
        {footerLinks.map(([label, hash]) => (
          <a href={sectionHref(hash)} key={hash}>{label}</a>
        ))}
        <a href="#top">Top ↑</a>
      </nav>
      <div className="footer__bottom">
        <span>© {new Date().getFullYear()} The Performance Consultant</span>
        <span>Coaching applications are reviewed personally.</span>
      </div>
    </footer>
  )
}
