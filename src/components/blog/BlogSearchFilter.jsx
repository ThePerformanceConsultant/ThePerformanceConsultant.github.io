import Link from 'next/link'
import { SearchIcon } from './BlogIcons.jsx'
import { taxonomyName, taxonomySlug } from './blogUtils.js'

export function BlogSearchFilter({
  categories = [],
  activeCategory = '',
  searchValue = '',
  searchAction = '/blog',
  resultCount,
}) {
  const hasQuery = Boolean(searchValue || activeCategory)

  return (
    <div className="journal-controls">
      <nav className="journal-categories" aria-label="Article categories">
        <Link
          href="/blog"
          className={!activeCategory ? 'is-active' : ''}
          aria-current={!activeCategory ? 'page' : undefined}
        >
          All articles
        </Link>
        {categories.map((category) => {
          const slug = taxonomySlug(category)
          const name = taxonomyName(category)
          if (!slug || !name) return null

          return (
            <Link
              key={category._id || slug}
              href={`/blog/category/${slug}`}
              className={activeCategory === slug ? 'is-active' : ''}
              aria-current={activeCategory === slug ? 'page' : undefined}
            >
              {name}
            </Link>
          )
        })}
      </nav>

      <form className="journal-search" role="search" action={searchAction} method="get">
        <label htmlFor="journal-search-input">Search articles</label>
        <div className="journal-search__field">
          <SearchIcon />
          <input
            id="journal-search-input"
            name="q"
            type="search"
            defaultValue={searchValue}
            placeholder="Search by topic or term"
            autoComplete="off"
          />
          <button type="submit">Search</button>
        </div>
      </form>

      {(Number.isFinite(Number(resultCount)) || hasQuery) && (
        <div className="journal-controls__status" aria-live="polite">
          {Number.isFinite(Number(resultCount)) && (
            <p>{resultCount} {Number(resultCount) === 1 ? 'article' : 'articles'}</p>
          )}
          {hasQuery && <Link href="/blog">Clear filters</Link>}
        </div>
      )}
    </div>
  )
}
