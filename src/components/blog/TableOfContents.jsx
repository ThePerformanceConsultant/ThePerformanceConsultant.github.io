'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildArticleHeadings } from './blogUtils.js'

export function TableOfContents({ body = [], items, heading = 'In this article' }) {
  const headings = useMemo(() => items || buildArticleHeadings(body), [body, items])
  const [activeId, setActiveId] = useState(headings[0]?.id || '')

  useEffect(() => {
    if (!headings.length) return undefined

    const observed = headings
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: [0, 1] },
    )

    observed.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 2) return null

  return (
    <nav className="journal-toc" aria-label="Table of contents">
      <p>{heading}</p>
      <ol>
        {headings.map((item, index) => (
          <li key={item.id} className={item.level === 3 ? 'is-nested' : ''}>
            <a href={`#${item.id}`} className={activeId === item.id ? 'is-active' : ''}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
