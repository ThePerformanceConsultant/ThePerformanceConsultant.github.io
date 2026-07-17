import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const outputFile = path.resolve(directory, '../src/generated/content.json')
const endpoint = 'https://stkjtr6l.apicdn.sanity.io/v2026-07-17/data/query/production'

const imageProjection = `{
  "url": asset->url,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "aspectRatio": asset->metadata.dimensions.aspectRatio,
  alt,
  caption,
  credit,
  hotspot,
  crop
}`

const articleCardProjection = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  updatedAt,
  "estimatedReadingTime": round(length(pt::text(body)) / 1200 + 0.5),
  "coverImage": coverImage${imageProjection},
  "author": author->{
    _id,
    name,
    role,
    "slug": slug.current,
    biography,
    "image": photograph${imageProjection}
  },
  "categories": categories[]->{_id, title, "slug": slug.current, description},
  "tags": tags[]->{_id, title, "slug": slug.current}
`

const articleBodyProjection = `body[]{
  ...,
  markDefs[]{
    ...,
    _type == "internalArticle" => {
      ...,
      "article": article->{"slug": slug.current, title}
    }
  },
  _type == "figure" => {..., "image": image${imageProjection}},
  _type == "gallery" => {..., "images": images[]{..., "image": image${imageProjection}}},
  _type == "videoEmbed" => {..., "poster": poster${imageProjection}}
}`

const query = `{
  "settings": *[_type == "blogSettings"][0]{
    mastheadEyebrow,
    mastheadTitle,
    mastheadIntroduction,
    "seo": seo{..., "socialImage": socialImage${imageProjection}},
    "featuredArticles": featuredArticles[]->{${articleCardProjection}}
  },
  "articles": *[
    _type == "article" && defined(slug.current) && defined(publishedAt)
  ] | order(publishedAt desc){
    ${articleCardProjection},
    "seo": seo{..., "socialImage": socialImage${imageProjection}},
    ${articleBodyProjection}
  },
  "categories": *[_type == "category" && defined(slug.current)] | order(title asc){
    _id, title, "slug": slug.current, description,
    "articleCount": count(*[_type == "article" && references(^._id) && defined(publishedAt)])
  },
  "tags": *[_type == "tag" && defined(slug.current)] | order(title asc){
    _id, title, "slug": slug.current,
    "articleCount": count(*[_type == "article" && references(^._id) && defined(publishedAt)])
  }
}`

const search = new URLSearchParams({
  query,
  perspective: 'published',
  returnQuery: 'false',
})
const response = await fetch(`${endpoint}?${search}`, {
  headers: { Accept: 'application/json' },
})

if (!response.ok) {
  const detail = await response.text()
  throw new Error(`Sanity content export failed with HTTP ${response.status}: ${detail.slice(0, 400)}`)
}

const payload = await response.json()
if (payload.error || !payload.result) {
  throw new Error(payload.error?.description || payload.error?.message || 'Sanity returned no publication content.')
}

const content = {
  generatedAt: new Date().toISOString(),
  settings: payload.result.settings || null,
  articles: (payload.result.articles || []).filter((article) => article?.slug && article?.title),
  categories: (payload.result.categories || []).filter((category) => category?.slug && category?.title),
  tags: (payload.result.tags || []).filter((tag) => tag?.slug && tag?.title),
}

if (!content.articles.length) {
  throw new Error('No published Sanity articles were returned. The build has been stopped to avoid publishing an empty journal.')
}

await mkdir(path.dirname(outputFile), { recursive: true })
await writeFile(outputFile, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
console.log(`Embedded ${content.articles.length} published article${content.articles.length === 1 ? '' : 's'} from Sanity.`)
