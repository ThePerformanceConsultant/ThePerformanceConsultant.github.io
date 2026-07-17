'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRightIcon, ClockIcon } from './BlogIcons.jsx'
import {
  articlePath,
  articleReadingTime,
  formatArticleDate,
  imageData,
  taxonomyName,
} from './blogUtils.js'

export function ArticleCard({ article, variant = 'standard', index = 0, priority = false }) {
  const reduceMotion = useReducedMotion()
  const cover = imageData(article?.coverImage)
  const category = taxonomyName(article?.categories?.[0])
  const date = formatArticleDate(article?.publishedAt)
  const readingTime = articleReadingTime(article)
  const href = articlePath(article)

  if (!article?.title) return null

  return (
    <motion.article
      className={`journal-card journal-card--${variant}`}
      initial={reduceMotion ? false : { opacity: 0, y: 30 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.75, delay: Math.min(index, 5) * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={href} className="journal-card__link" aria-label={`Read ${article.title}`}>
        {cover && (
          <div className="journal-card__media">
            <Image
              src={cover.url}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              sizes={variant === 'lead' ? '(max-width: 800px) 100vw, 66vw' : '(max-width: 700px) 100vw, 33vw'}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
            <span className="journal-card__index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        )}

        <div className="journal-card__content">
          <div className="journal-card__meta">
            {category && <span className="journal-card__category">{category}</span>}
            {date && <time dateTime={article.publishedAt}>{date}</time>}
            <span className="journal-card__reading"><ClockIcon />{readingTime} min</span>
          </div>
          <h3>{article.title}</h3>
          {article.excerpt && <p>{article.excerpt}</p>}
          <span className="journal-card__cta" aria-hidden="true">
            Read article <ArrowUpRightIcon />
          </span>
        </div>
      </Link>
    </motion.article>
  )
}
