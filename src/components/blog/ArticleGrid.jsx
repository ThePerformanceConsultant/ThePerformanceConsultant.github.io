import { ArticleCard } from './ArticleCard.jsx'

export function ArticleGrid({
  articles = [],
  heading = 'Latest articles',
  sectionIndex = '02',
  emptyTitle = 'No articles published yet.',
  emptyMessage = 'New work will appear here once it has passed editorial review.',
}) {
  const validArticles = articles.filter((article) => article?.title)

  return (
    <section id="articles" className="journal-index" aria-labelledby="article-index-heading">
      <div className="journal-section-heading">
        <span>{sectionIndex}</span>
        <i aria-hidden="true" />
        <h2 id="article-index-heading">{heading}</h2>
      </div>

      {validArticles.length ? (
        <div className="journal-index__grid">
          {validArticles.map((article, index) => (
            <ArticleCard
              key={article._id || article.slug?.current || article.slug}
              article={article}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="journal-empty" role="status">
          <span aria-hidden="true">00</span>
          <div>
            <h3>{emptyTitle}</h3>
            <p>{emptyMessage}</p>
          </div>
        </div>
      )}
    </section>
  )
}
