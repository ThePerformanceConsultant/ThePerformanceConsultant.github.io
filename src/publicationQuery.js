export const imageProjection = `{
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

export const articleCardProjection = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  "updatedAt": coalesce(updatedAt, _updatedAt),
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

export const articleBodyProjection = `body[]{
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

const settingsProjection = `
  mastheadEyebrow,
  mastheadTitle,
  mastheadIntroduction,
  "seo": seo{..., "socialImage": socialImage${imageProjection}},
  "featuredArticles": featuredArticles[]->{${articleCardProjection}}
`

const categoriesProjection = `*[_type == "category" && defined(slug.current)] | order(title asc){
  _id, title, "slug": slug.current, description,
  "articleCount": count(*[_type == "article" && references(^._id) && defined(publishedAt)])
}`

const tagsProjection = `*[_type == "tag" && defined(slug.current)] | order(title asc){
  _id, title, "slug": slug.current,
  "articleCount": count(*[_type == "article" && references(^._id) && defined(publishedAt)])
}`

export const publicationIndexQuery = `{
  "settings": *[_type == "blogSettings"][0]{${settingsProjection}},
  "articles": *[
    _type == "article" && defined(slug.current) && defined(publishedAt)
  ] | order(publishedAt desc){${articleCardProjection}},
  "categories": ${categoriesProjection},
  "tags": ${tagsProjection}
}`

export const publicationExportQuery = `{
  "settings": *[_type == "blogSettings"][0]{${settingsProjection}},
  "articles": *[
    _type == "article" && defined(slug.current) && defined(publishedAt)
  ] | order(publishedAt desc){
    ${articleCardProjection},
    "seo": seo{..., "socialImage": socialImage${imageProjection}},
    ${articleBodyProjection}
  },
  "categories": ${categoriesProjection},
  "tags": ${tagsProjection}
}`

export const articleBySlugQuery = `*[
  _type == "article" && slug.current == $slug && defined(publishedAt)
][0]{
  ${articleCardProjection},
  "seo": seo{..., "socialImage": socialImage${imageProjection}},
  ${articleBodyProjection}
}`

export function normalisePublication(result, generatedAt = new Date().toISOString()) {
  return {
    generatedAt,
    settings: result?.settings || null,
    articles: (result?.articles || []).filter((article) => article?.slug && article?.title),
    categories: (result?.categories || []).filter((category) => category?.slug && category?.title),
    tags: (result?.tags || []).filter((tag) => tag?.slug && tag?.title),
  }
}
