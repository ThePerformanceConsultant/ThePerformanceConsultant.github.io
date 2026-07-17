import publication from './generated/content.json'

export async function loadPublicationIndex() {
  return publication
}

export async function loadPublishedArticle(slug) {
  return publication.articles.find((article) => article.slug === slug) || null
}
