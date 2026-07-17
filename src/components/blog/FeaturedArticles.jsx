import { ArticleCard } from './ArticleCard.jsx'

export function FeaturedArticles({ articles = [], heading = 'Selected reading' }) {
  const featured = articles.filter(Boolean).slice(0, 3)
  if (!featured.length) return null

  return (
    <section className="journal-featured" aria-labelledby="featured-heading">
      <div className="journal-section-heading journal-section-heading--dark">
        <span>01</span>
        <i aria-hidden="true" />
        <h2 id="featured-heading">{heading}</h2>
      </div>
      <div className={`journal-featured__layout journal-featured__layout--${featured.length}`}>
        <ArticleCard article={featured[0]} variant="lead" index={0} priority />
        {featured.length > 1 && (
          <div className="journal-featured__supporting">
            {featured.slice(1).map((article, index) => (
              <ArticleCard
                key={article._id || article.slug?.current || article.slug}
                article={article}
                variant="supporting"
                index={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
