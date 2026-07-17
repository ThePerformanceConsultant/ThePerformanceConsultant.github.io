'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRightIcon, ClockIcon } from './BlogIcons.jsx'
import {
  articleReadingTime,
  formatArticleDate,
  imageData,
  taxonomyName,
  taxonomySlug,
} from './blogUtils.js'

export function ArticleHero({ article, priority = false }) {
  const reduceMotion = useReducedMotion()
  const cover = imageData(article?.coverImage)
  const authorImage = imageData(article?.author?.image)
  const category = article?.categories?.[0]
  const categoryName = taxonomyName(category)
  const categorySlug = taxonomySlug(category)
  const published = formatArticleDate(article?.publishedAt)
  const updated = article?.updatedAt && article.updatedAt !== article.publishedAt
    ? formatArticleDate(article.updatedAt)
    : ''
  const readingTime = articleReadingTime(article)
  const reveal = (delay = 0, y = 24) => ({
    initial: reduceMotion ? false : { opacity: 0, y },
    animate: reduceMotion ? undefined : { opacity: 1, y: 0 },
    transition: { duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] },
  })

  return (
    <header className="journal-article-hero">
      <motion.div className="journal-article-hero__back" {...reveal(0.02, 12)}>
        <Link href="/blog"><ArrowUpRightIcon /> Back to blog</Link>
      </motion.div>

      <div className="journal-article-hero__grid">
        <div className="journal-article-hero__main">
          <motion.div className="journal-article-hero__meta" {...reveal(0.08, 16)}>
            {categoryName && categorySlug && (
              <Link href={`/blog/category/${categorySlug}`}>{categoryName}</Link>
            )}
            {published && <time dateTime={article.publishedAt}>{published}</time>}
            <span><ClockIcon /> {readingTime} min read</span>
          </motion.div>
          <motion.h1 {...reveal(0.14, 34)}>{article?.title}</motion.h1>
          {article?.excerpt && (
            <motion.p className="journal-article-hero__excerpt" {...reveal(0.22, 24)}>
              {article.excerpt}
            </motion.p>
          )}
          {article?.tags?.length > 0 && (
            <motion.nav className="journal-article-hero__tags" aria-label="Article tags" {...reveal(0.26, 16)}>
              {article.tags.map((tag) => {
                const slug = taxonomySlug(tag)
                const name = taxonomyName(tag)
                if (!slug || !name) return null
                return <Link key={tag._id || slug} href={`/blog/tag/${slug}`}>{name}</Link>
              })}
            </motion.nav>
          )}
        </div>

        {article?.author?.name && (
          <motion.div className="journal-article-hero__byline" {...reveal(0.28, 18)}>
            {authorImage && (
              <Image
                src={authorImage.url}
                alt={authorImage.alt || ''}
                width={96}
                height={96}
                sizes="48px"
              />
            )}
            <div>
              <span>Written by</span>
              <strong>{article.author.name}</strong>
              {article.author.role && <p>{article.author.role}</p>}
              {updated && <small>Updated {updated}</small>}
            </div>
          </motion.div>
        )}
      </div>

      {cover && (
        <motion.figure
          className="journal-article-hero__media"
          initial={reduceMotion ? false : { clipPath: 'inset(0 0 100% 0)' }}
          animate={reduceMotion ? undefined : { clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 1.1, delay: 0.24, ease: [0.76, 0, 0.24, 1] }}
        >
          <Image
            src={cover.url}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            sizes="100vw"
            priority={priority}
          />
          {(cover.caption || cover.credit) && (
            <figcaption>
              {cover.caption && <span>{cover.caption}</span>}
              {cover.credit && <cite>{cover.credit}</cite>}
            </figcaption>
          )}
        </motion.figure>
      )}
    </header>
  )
}
