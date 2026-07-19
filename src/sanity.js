import { articleBySlugQuery, normalisePublication, publicationIndexQuery } from './publicationQuery.js'

const endpoint = 'https://stkjtr6l.api.sanity.io/v2026-07-17/data/query/production'

async function querySanity(query, parameters = {}) {
  const search = new URLSearchParams({
    query,
    perspective: 'published',
    returnQuery: 'false',
  })
  Object.entries(parameters).forEach(([key, value]) => {
    search.set(`$${key}`, JSON.stringify(value))
  })

  const response = await fetch(`${endpoint}?${search}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`The publication service returned HTTP ${response.status}.`)

  const payload = await response.json()
  if (payload.error) {
    throw new Error(payload.error.description || payload.error.message || 'The publication query failed.')
  }
  return payload.result
}

let publicationRequest

export async function loadPublicationIndex({ fresh = false } = {}) {
  if (!fresh && publicationRequest) return publicationRequest

  const request = querySanity(publicationIndexQuery)
    .then((result) => normalisePublication(result))

  publicationRequest = request
  request.catch(() => {
    if (publicationRequest === request) publicationRequest = undefined
  })
  return request
}

export async function loadPublishedArticle(slug) {
  return querySanity(articleBySlugQuery, { slug })
}
