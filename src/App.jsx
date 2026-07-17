import { useEffect, useMemo, useState } from 'react'
import { ArticleBody } from './components/blog/ArticleBody.jsx'
import { ArticleGrid } from './components/blog/ArticleGrid.jsx'
import { ArticleHero } from './components/blog/ArticleHero.jsx'
import { BlogMasthead } from './components/blog/BlogMasthead.jsx'
import { BlogPagination } from './components/blog/BlogPagination.jsx'
import { BlogSearchFilter } from './components/blog/BlogSearchFilter.jsx'
import { FeaturedArticles } from './components/blog/FeaturedArticles.jsx'
import { ReadingProgress } from './components/blog/ReadingProgress.jsx'
import { RelatedArticles } from './components/blog/RelatedArticles.jsx'
import { ShareButton } from './components/blog/ShareButton.jsx'
import { TableOfContents } from './components/blog/TableOfContents.jsx'
import { normaliseSlug } from './components/blog/blogUtils.js'
import { Shell } from './Shell.jsx'
import { updateMetadata } from './metadata.js'
import { loadPublicationIndex, loadPublishedArticle } from './sanity.js'

const PAGE_SIZE = 9

function useLocation() {
  const read = () => ({
    pathname: window.location.pathname,
    search: window.location.search,
  })
  const [location, setLocation] = useState(read)

  useEffect(() => {
    const update = () => {
      setLocation(read())
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('popstate', update)
    window.addEventListener('publication:navigate', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('publication:navigate', update)
    }
  }, [])

  return location
}

function splitMastheadTitle(value) {
  const title = value?.trim()
  if (!title) return ['Training and nutrition,', 'examined properly.']
  const words = title.split(/\s+/)
  if (words.length === 1) return ['From the journal', words[0]]
  return [words.slice(0, -1).join(' '), words.at(-1)]
}

function LoadingState({ label = 'Loading the journal' }) {
  return (
    <div className="publication-state publication-state--loading" role="status" aria-live="polite">
      <span className="publication-state__pulse" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="publication-state publication-state--error" role="alert">
      <span aria-hidden="true">!</span>
      <div>
        <h1>The journal could not be loaded.</h1>
        <p>{message || 'The publication service did not return a usable response.'}</p>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>
    </div>
  )
}

function MissingPage() {
  useEffect(() => updateMetadata({
    title: 'Article not found',
    description: 'The requested article could not be found.',
    path: window.location.pathname,
  }), [])

  return (
    <div className="publication-state publication-state--missing">
      <span aria-hidden="true">404</span>
      <div>
        <h1>This page is not in the journal.</h1>
        <p>The article may have moved or may no longer be published.</p>
        <a href="/blog" onClick={(event) => {
          event.preventDefault()
          window.history.pushState({}, '', '/blog')
          window.dispatchEvent(new Event('publication:navigate'))
        }}>Return to the blog</a>
      </div>
    </div>
  )
}

function usePublicationIndex() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const load = (fresh = false) => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    loadPublicationIndex({ fresh })
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error) => setState({ status: 'error', data: null, error }))
  }
  useEffect(() => load(), [])
  return { ...state, retry: () => load(true) }
}

function matchesSearch(article, value) {
  if (!value) return true
  const text = [
    article.title,
    article.excerpt,
    article.author?.name,
    ...(article.categories || []).map((item) => item.title),
    ...(article.tags || []).map((item) => item.title),
  ].filter(Boolean).join(' ').toLocaleLowerCase('en-GB')
  return text.includes(value.toLocaleLowerCase('en-GB'))
}

function JournalIndex({ data, search }) {
  const params = new URLSearchParams(search)
  const query = (params.get('q') || '').trim().slice(0, 120)
  const requestedPage = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)
  const featured = (data.settings?.featuredArticles || []).filter(Boolean)
  const featuredIds = new Set(featured.map((article) => article._id))
  const filtered = data.articles.filter((article) => matchesSearch(article, query))
  const indexArticles = query ? filtered : filtered.filter((article) => !featuredIds.has(article._id))
  const totalPages = Math.max(1, Math.ceil(indexArticles.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const articles = indexArticles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const showFeatured = !query && currentPage === 1 && featured.length > 0
  const [title, emphasis] = splitMastheadTitle(data.settings?.mastheadTitle)

  useEffect(() => updateMetadata({
    title: query ? `Search results for “${query}”` : 'Blog',
    description: data.settings?.seo?.metaDescription || 'Evidence-led articles on performance training, nutrition, recovery and athlete feedback.',
    path: query ? `/blog?q=${encodeURIComponent(query)}` : '/blog',
    image: data.settings?.seo?.socialImage?.url || '',
  }), [data, query])

  return (
    <div className="journal-page">
      <BlogMasthead
        eyebrow={data.settings?.mastheadEyebrow || 'The Performance Consultant Blog'}
        title={title}
        emphasis={emphasis}
        introduction={data.settings?.mastheadIntroduction || 'Detailed articles for athletes who want their decisions grounded in evidence, context and practical application.'}
        articleCount={data.articles.length}
      />
      {showFeatured && <FeaturedArticles articles={featured} />}
      <BlogSearchFilter categories={data.categories} searchValue={query} resultCount={filtered.length} />
      {(query || articles.length > 0 || !showFeatured) && (
        <ArticleGrid
          articles={articles}
          heading={query ? `Results for “${query}”` : 'Latest articles'}
          sectionIndex={showFeatured ? '02' : '01'}
          emptyTitle={query ? 'No matching articles.' : 'No articles published yet.'}
          emptyMessage={query ? 'Try a broader search term or clear the current filters.' : 'Articles are being prepared for publication.'}
        />
      )}
      {totalPages > 1 && (
        <div className="journal-pagination-shell">
          <BlogPagination currentPage={currentPage} totalPages={totalPages} query={query} />
        </div>
      )}
    </div>
  )
}

function Archive({ data, type, slug, search }) {
  const collection = type === 'category' ? data.categories : data.tags
  const taxonomy = collection.find((item) => normaliseSlug(item.slug) === slug)
  const params = new URLSearchParams(search)
  const query = (params.get('q') || '').trim().slice(0, 120)
  const requestedPage = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)

  if (!taxonomy) return <MissingPage />

  const filtered = data.articles.filter((article) => {
    const taxonomies = type === 'category' ? article.categories : article.tags
    return taxonomies?.some((item) => normaliseSlug(item.slug) === slug) && matchesSearch(article, query)
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const articles = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const label = type === 'category' ? 'Category' : 'Topic'
  const basePath = `/blog/${type}/${slug}`

  useEffect(() => updateMetadata({
    title: `${label}: ${taxonomy.title}`,
    description: taxonomy.description || `Published articles organised under ${taxonomy.title}.`,
    path: basePath,
  }), [basePath, label, taxonomy])

  return (
    <div className="journal-page">
      <BlogMasthead
        eyebrow={`${label} archive`}
        title={`${label}:`}
        emphasis={taxonomy.title}
        introduction={taxonomy.description || `Published articles organised under ${taxonomy.title}.`}
        articleCount={filtered.length}
      />
      <BlogSearchFilter
        categories={data.categories}
        activeCategory={type === 'category' ? slug : ''}
        searchValue={query}
        searchAction={basePath}
        resultCount={filtered.length}
      />
      <ArticleGrid
        articles={articles}
        heading={query ? `Results for “${query}”` : taxonomy.title}
        sectionIndex="01"
        emptyTitle="No matching articles."
        emptyMessage={query ? 'Try a broader search term or clear the current filters.' : 'No articles have been assigned here yet.'}
      />
      {totalPages > 1 && (
        <div className="journal-pagination-shell">
          <BlogPagination currentPage={currentPage} totalPages={totalPages} basePath={basePath} query={query} />
        </div>
      )}
    </div>
  )
}

function Article({ slug, indexData }) {
  const [state, setState] = useState({ status: 'loading', article: null, error: null })
  useEffect(() => {
    let active = true
    setState({ status: 'loading', article: null, error: null })
    loadPublishedArticle(slug)
      .then((article) => active && setState({ status: 'ready', article, error: null }))
      .catch((error) => active && setState({ status: 'error', article: null, error }))
    return () => { active = false }
  }, [slug])

  const article = state.article
  const related = useMemo(() => {
    if (!article) return []
    const categories = new Set((article.categories || []).map((item) => item._id))
    const tags = new Set((article.tags || []).map((item) => item._id))
    return indexData.articles
      .filter((candidate) => candidate._id !== article._id)
      .map((candidate) => ({
        ...candidate,
        relevance: (candidate.categories || []).filter((item) => categories.has(item._id)).length * 3
          + (candidate.tags || []).filter((item) => tags.has(item._id)).length,
      }))
      .filter((candidate) => candidate.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3)
  }, [article, indexData.articles])

  useEffect(() => {
    if (!article) return
    updateMetadata({
      title: article.seo?.metaTitle || article.title,
      description: article.seo?.metaDescription || article.excerpt,
      path: `/blog/${slug}`,
      image: article.seo?.socialImage?.url || article.coverImage?.url || '',
      type: 'article',
      author: article.author?.name || '',
      publishedAt: article.publishedAt,
    })
  }, [article, slug])

  if (state.status === 'loading') return <LoadingState label="Loading article" />
  if (state.status === 'error') return <ErrorState message={state.error?.message} onRetry={() => window.location.reload()} />
  if (!article) return <MissingPage />

  const canonical = `${window.location.origin}/blog/${slug}`
  return (
    <article className="journal-article-page">
      <ReadingProgress />
      <ArticleHero article={article} priority />
      <div className="journal-article-layout">
        <aside className="journal-article-layout__aside"><TableOfContents body={article.body} /></aside>
        <ArticleBody body={article.body} />
        <aside className="journal-article-layout__actions"><ShareButton title={article.title} url={canonical} /></aside>
      </div>
      <RelatedArticles articles={related} />
    </article>
  )
}

function Route({ data, location }) {
  const path = location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/') {
    window.history.replaceState({}, '', '/blog')
    return <JournalIndex data={data} search={location.search} />
  }
  if (path === '/blog') return <JournalIndex data={data} search={location.search} />

  const category = path.match(/^\/blog\/category\/([^/]+)$/)
  if (category) return <Archive data={data} type="category" slug={decodeURIComponent(category[1])} search={location.search} />
  const tag = path.match(/^\/blog\/tag\/([^/]+)$/)
  if (tag) return <Archive data={data} type="tag" slug={decodeURIComponent(tag[1])} search={location.search} />
  const article = path.match(/^\/blog\/([^/]+)$/)
  if (article) return <Article slug={decodeURIComponent(article[1])} indexData={data} />
  return <MissingPage />
}

export default function App() {
  const location = useLocation()
  const publication = usePublicationIndex()

  return (
    <Shell>
      {publication.status === 'loading' && <LoadingState />}
      {publication.status === 'error' && <ErrorState message={publication.error?.message} onRetry={publication.retry} />}
      {publication.status === 'ready' && <Route data={publication.data} location={location} />}
    </Shell>
  )
}
