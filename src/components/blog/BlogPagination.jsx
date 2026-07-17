import { Fragment } from 'react'
import Link from 'next/link'
import { ChevronIcon } from './BlogIcons.jsx'

function pageHref(basePath, page, query) {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (query) params.set('q', query)
  const suffix = params.toString()
  return suffix ? `${basePath}?${suffix}` : basePath
}

export function BlogPagination({ currentPage = 1, totalPages = 1, basePath = '/blog', query = '' }) {
  const current = Math.max(1, Number(currentPage) || 1)
  const total = Math.max(1, Number(totalPages) || 1)
  if (total <= 1) return null

  const pages = Array.from({ length: total }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === total || Math.abs(page - current) <= 1)

  return (
    <nav className="journal-pagination" aria-label="Article pages">
      {current > 1 ? (
        <Link className="journal-pagination__arrow journal-pagination__arrow--previous" href={pageHref(basePath, current - 1, query)}>
          <ChevronIcon /> <span>Previous</span>
        </Link>
      ) : <span />}

      <ol>
        {pages.map((page, index) => {
          const previousPage = pages[index - 1]
          return (
            <Fragment key={page}>
              {previousPage && page - previousPage > 1 && <li aria-hidden="true">…</li>}
              <li>
                <Link
                  href={pageHref(basePath, page, query)}
                  className={page === current ? 'is-active' : ''}
                  aria-current={page === current ? 'page' : undefined}
                  aria-label={`Page ${page}`}
                >
                  {String(page).padStart(2, '0')}
                </Link>
              </li>
            </Fragment>
          )
        })}
      </ol>

      {current < total ? (
        <Link className="journal-pagination__arrow journal-pagination__arrow--next" href={pageHref(basePath, current + 1, query)}>
          <span>Next</span> <ChevronIcon />
        </Link>
      ) : <span />}
    </nav>
  )
}
