const SITE_NAME = 'The Performance Consultant'

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
}

export function updateMetadata({
  title = 'Blog',
  description = 'Evidence-led articles on performance training, nutrition and recovery.',
  path = '/blog',
  image = '',
  type = 'website',
  author = '',
  publishedAt = '',
  robots = 'index, follow',
} = {}) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const canonical = `${window.location.origin}${path}`
  document.title = fullTitle
  document.documentElement.lang = 'en-GB'

  setMeta('meta[name="description"]', { name: 'description', content: description })
  setMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle })
  setMeta('meta[property="og:description"]', { property: 'og:description', content: description })
  setMeta('meta[property="og:type"]', { property: 'og:type', content: type })
  setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' })
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle })
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
  setMeta('meta[name="robots"]', { name: 'robots', content: robots })

  if (image) {
    setMeta('meta[property="og:image"]', { property: 'og:image', content: image })
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
  } else {
    document.head.querySelector('meta[property="og:image"]')?.remove()
    document.head.querySelector('meta[name="twitter:image"]')?.remove()
  }

  document.head.querySelector('meta[name="author"]')?.remove()
  document.head.querySelector('meta[property="article:published_time"]')?.remove()
  if (author) setMeta('meta[name="author"]', { name: 'author', content: author })
  if (publishedAt) {
    setMeta('meta[property="article:published_time"]', {
      property: 'article:published_time',
      content: publishedAt,
    })
  }

  let canonicalElement = document.head.querySelector('link[rel="canonical"]')
  if (!canonicalElement) {
    canonicalElement = document.createElement('link')
    canonicalElement.rel = 'canonical'
    document.head.appendChild(canonicalElement)
  }
  canonicalElement.href = canonical
}
