import { ArticleCard } from './ArticleCard.jsx'

export function RelatedArticles({ articles = [], heading = 'Continue reading' }) {
  const related = articles.filter((article) => article?.title).slice(0, 3)
  if (!related.length) return null

  return (
    <section className="journal-related" aria-labelledby="related-heading">
      <div className="journal-section-heading journal-section-heading--dark">
        <span>Next</span>
        <i aria-hidden="true" />
        <h2 id="related-heading">{heading}</h2>
      </div>
      <div className="journal-related__grid">
        {related.map((article, index) => (
          <ArticleCard
            key={article._id || article.slug?.current || article.slug}
            article={article}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}
