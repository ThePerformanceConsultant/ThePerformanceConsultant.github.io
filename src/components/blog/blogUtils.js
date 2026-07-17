const WORDS_PER_MINUTE = 220

export function normaliseSlug(value) {
  if (typeof value === 'string') return value
  return value?.current || ''
}

export function articlePath(article) {
  const slug = normaliseSlug(article?.slug)
  return slug ? `/blog/${slug}` : '/blog'
}

export function taxonomyName(item) {
  if (typeof item === 'string') return item
  return item?.title || item?.name || ''
}

export function taxonomySlug(item) {
  if (typeof item === 'string') {
    return item
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  return normaliseSlug(item?.slug)
}

export function formatArticleDate(value, locale = 'en-GB') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(date)
}

export function plainTextFromBlock(block) {
  if (!block) return ''
  if (typeof block === 'string') return block
  if (Array.isArray(block)) return block.map(plainTextFromBlock).join(' ')
  if (block._type === 'block') {
    return (block.children || []).map((child) => child?.text || '').join('')
  }
  return block.quote || block.heading || block.title || block.body || ''
}

export function articleReadingTime(article) {
  const supplied = Number(article?.estimatedReadingTime)
  if (Number.isFinite(supplied) && supplied > 0) return Math.ceil(supplied)

  const words = plainTextFromBlock(article?.body)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

export function slugifyHeading(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'section'
}

export function buildArticleHeadings(body = []) {
  const counts = new Map()

  return body
    .filter((block) => block?._type === 'block' && ['h2', 'h3'].includes(block.style))
    .map((block) => {
      const text = plainTextFromBlock(block)
      const base = slugifyHeading(text)
      const count = counts.get(base) || 0
      counts.set(base, count + 1)

      return {
        id: count ? `${base}-${count + 1}` : base,
        key: block._key || `${base}-${count}`,
        text,
        level: block.style === 'h3' ? 3 : 2,
      }
    })
}

export function safeExternalHref(value) {
  if (!value || typeof value !== 'string') return ''

  try {
    const url = new URL(value, 'https://theperformanceconsultant.net')
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return ''
    return value
  } catch {
    return ''
  }
}

export function imageData(source) {
  if (!source) return null

  const image = source.image || source
  const asset = image.asset || source.asset || {}
  const url = image.url || asset.url || source.url || ''
  if (!url) return null

  const dimensions = asset.metadata?.dimensions || image.dimensions || {}

  return {
    url,
    alt: source.alt || image.alt || '',
    caption: source.caption || image.caption || '',
    credit: source.credit || image.credit || '',
    width: Number(source.width || image.width || dimensions.width) || 1600,
    height: Number(source.height || image.height || dimensions.height) || 1000,
  }
}

export function getVideoEmbed(value) {
  const source = value?.url || value
  if (!source || typeof source !== 'string') return null

  try {
    const url = new URL(source)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
    }

    if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      const id = url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1]
      return id ? { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
    }

    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1]
      return id ? { provider: 'Vimeo', src: `https://player.vimeo.com/video/${id}?dnt=1` } : null
    }

    return null
  } catch {
    return null
  }
}
