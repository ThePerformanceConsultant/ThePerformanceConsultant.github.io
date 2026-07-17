import { PortableText } from '@portabletext/react'
import { stegaClean } from '@sanity/client/stega'
import { Fragment } from 'react'
import Link from 'next/link'
import { EditorialImage } from './EditorialImage.jsx'
import { VideoEmbed } from './VideoEmbed.jsx'
import {
  buildArticleHeadings,
  normaliseSlug,
  plainTextFromBlock,
  safeExternalHref,
  slugifyHeading,
} from './blogUtils.js'

function preparePortableText(blocks = []) {
  const state = {
    blockSequence: 0,
    referenceSequence: 0,
    notes: [],
    notesByDefinition: new Map(),
  }

  function prepareBlock(block) {
    const blockSequence = state.blockSequence
    state.blockSequence += 1

    const definitions = new Map(
      (block.markDefs || [])
        .filter((definition) => definition?._key)
        .map((definition) => [definition._key, definition]),
    )
    const plainDefinitions = (block.markDefs || []).filter((definition) => definition?._type !== 'footnote')
    const occurrenceDefinitions = []
    const activeOccurrences = new Map()
    const scope = `${block._key || 'block'}-${blockSequence}`

    const children = (block.children || []).map((child) => {
      if (child?._type !== 'span') {
        activeOccurrences.clear()
        return child
      }

      const marks = child.marks || []
      const currentFootnotes = new Set(
        marks.filter((mark) => definitions.get(mark)?._type === 'footnote'),
      )

      activeOccurrences.forEach((_, mark) => {
        if (!currentFootnotes.has(mark)) activeOccurrences.delete(mark)
      })

      const preparedMarks = marks.map((mark) => {
        const definition = definitions.get(mark)
        if (definition?._type !== 'footnote') return mark

        let occurrence = activeOccurrences.get(mark)
        if (!occurrence) {
          const definitionIdentity = `${scope}-${mark}`
          let note = state.notesByDefinition.get(definitionIdentity)

          if (!note) {
            note = {
              ...definition,
              __footnoteIndex: state.notes.length + 1,
              __referenceIds: [],
            }
            state.notesByDefinition.set(definitionIdentity, note)
            state.notes.push(note)
          }

          state.referenceSequence += 1
          const referenceNumber = note.__referenceIds.length + 1
          const referenceId = `footnote-reference-${note.__footnoteIndex}-${referenceNumber}`
          const occurrenceKey = `${mark}-reference-${state.referenceSequence}`
          note.__referenceIds.push(referenceId)

          occurrence = {
            key: occurrenceKey,
            definition: {
              ...definition,
              _key: occurrenceKey,
              __footnoteIndex: note.__footnoteIndex,
              __referenceId: referenceId,
            },
          }
          activeOccurrences.set(mark, occurrence)
          occurrenceDefinitions.push(occurrence.definition)
        }

        return occurrence.key
      })

      return {...child, marks: preparedMarks}
    })

    return {
      ...block,
      children,
      markDefs: [...plainDefinitions, ...occurrenceDefinitions],
    }
  }

  function prepareSequence(sequence) {
    return sequence.map((block) => {
      if (block?._type === 'block') return prepareBlock(block)
      if (block?._type === 'evidenceCallout' && Array.isArray(block.body)) {
        return {...block, body: prepareSequence(block.body)}
      }
      return block
    })
  }

  return {body: prepareSequence(blocks), notes: state.notes}
}

function ArticleTable({ value }) {
  const rows = value?.rows || []
  if (!rows.length) return null

  const [header, ...bodyRows] = rows
  const displayRows = value.hasHeaderRow ? bodyRows : rows

  return (
    <figure className="journal-table">
      <div className="journal-table__scroll" tabIndex="0" role="region" aria-label={value.caption || 'Data table'}>
        <table>
          {value.hasHeaderRow && (
            <thead><tr>{(header.cells || []).map((cell, index) => <th key={index} scope="col">{cell}</th>)}</tr></thead>
          )}
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={row._key || rowIndex}>
                {(row.cells || []).map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {value.caption && <figcaption>{value.caption}</figcaption>}
    </figure>
  )
}

function ArticleGallery({ value }) {
  const images = (value?.images || []).filter((image) => image?.image || image?.url)
  if (!images.length) return null
  const layout = ['grid', 'twoColumn', 'carousel'].includes(value.layout) ? value.layout : 'grid'

  return (
    <div
      className={`journal-gallery journal-gallery--${layout}`}
      role={layout === 'carousel' ? 'region' : undefined}
      aria-label={layout === 'carousel' ? 'Image gallery. Scroll horizontally to view all images.' : undefined}
      tabIndex={layout === 'carousel' ? 0 : undefined}
    >
      {images.map((image, index) => (
        <EditorialImage
          key={image._key || index}
          image={image}
          sizes={layout === 'twoColumn' ? '(max-width: 700px) 100vw, 42vw' : '(max-width: 700px) 88vw, 60vw'}
        />
      ))}
    </div>
  )
}

const CALLOUT_LABELS = {
  evidence: 'Evidence note',
  caution: 'Interpretation note',
  practical: 'Practical application',
}

function EvidenceCallout({ value, components }) {
  const requestedTone = stegaClean(value.tone)
  const tone = CALLOUT_LABELS[requestedTone] ? requestedTone : 'evidence'
  return (
    <aside className={`journal-callout journal-callout--${tone}`}>
      <span>{value.label || CALLOUT_LABELS[tone]}</span>
      {value.heading && <h3>{value.heading}</h3>}
      {value.body?.length && (
        <div>
          <PortableText value={value.body} components={components} onMissingComponent={false} />
        </div>
      )}
    </aside>
  )
}

function renderReferenceLink(entry) {
  const href = safeExternalHref(entry.url || (entry.doi ? `https://doi.org/${entry.doi}` : ''))
  if (!href) return null
  return <a href={href} target="_blank" rel="noreferrer">View source</a>
}

export function ArticleReferences({ entries = [], heading = 'References', id = 'article-references' }) {
  const valid = entries.filter((entry) => entry?.title || entry?.authors)
  if (!valid.length) return null

  return (
    <section className="journal-references" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{heading}</h2>
      <ol>
        {valid.map((entry, index) => (
          <li key={entry._key || index} id={`reference-${index + 1}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>
              {entry.authors && <strong>{entry.authors}. </strong>}
              {entry.title && <cite>{entry.title}. </cite>}
              {[entry.publication, entry.year, entry.volume && `vol. ${entry.volume}`, entry.issue && `no. ${entry.issue}`, entry.pages]
                .filter(Boolean)
                .join(', ')}
              {(entry.publication || entry.year || entry.volume || entry.issue || entry.pages) && '. '}
              {renderReferenceLink(entry)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function createPortableTextComponents(headingIds) {
  let components

  const heading = (Tag) => function Heading({ children, value }) {
    const id = headingIds.get(value._key) || slugifyHeading(plainTextFromBlock(value))
    return <Tag id={id}>{children}</Tag>
  }

  const listItem = ({ children, value }) => (
    <li className={(value.level || 1) > 1 ? 'is-nested' : undefined}>{children}</li>
  )

  components = {
    block: {
      normal: ({ children }) => <p>{children}</p>,
      h2: heading('h2'),
      h3: heading('h3'),
      h4: heading('h4'),
      blockquote: ({ children }) => <blockquote>{children}</blockquote>,
      lead: ({ children }) => <p className="journal-rich__lead">{children}</p>,
      small: ({ children }) => <p className="journal-rich__small">{children}</p>,
    },
    list: {
      bullet: ({ children }) => <ul className="journal-rich__list">{children}</ul>,
      number: ({ children }) => <ol className="journal-rich__list">{children}</ol>,
    },
    listItem: {
      bullet: listItem,
      number: listItem,
    },
    marks: {
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      underline: ({ children }) => <u>{children}</u>,
      'strike-through': ({ children }) => <s>{children}</s>,
      code: ({ children }) => <code>{children}</code>,
      externalLink: ({ children, value }) => {
        const href = safeExternalHref(value.href)
        if (!href) return children
        const newTab = value.openInNewTab !== false
        return (
          <a
            href={href}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        )
      },
      internalArticle: ({ children, value }) => {
        const slug = normaliseSlug(value.article?.slug || value.slug)
        return slug ? <Link href={`/blog/${slug}`}>{children}</Link> : children
      },
      footnote: ({ children, value }) => {
        const index = Number(value.__footnoteIndex)
        const referenceId = value.__referenceId
        if (!index || !referenceId) return children

        return (
          <Fragment>
            {children}
            <sup className="journal-rich__footnote-ref">
              <a href={`#footnote-${index}`} id={referenceId} aria-label={`Footnote ${index}`}>
                {index}
              </a>
            </sup>
          </Fragment>
        )
      },
    },
    types: {
      figure: ({ value }) => <EditorialImage image={value} sizes="(max-width: 900px) 100vw, 920px" />,
      gallery: ({ value }) => <ArticleGallery value={value} />,
      videoEmbed: ({ value }) => <VideoEmbed value={value} />,
      table: ({ value }) => <ArticleTable value={value} />,
      evidenceCallout: ({ value }) => <EvidenceCallout value={value} components={components} />,
      pullQuote: ({ value }) => (
        <figure className="journal-pullquote">
          <blockquote>{value.quote}</blockquote>
          {value.attribution && <figcaption>{value.attribution}</figcaption>}
        </figure>
      ),
      references: ({ value }) => (
        <ArticleReferences
          entries={value.entries}
          heading={value.heading}
          id={`references-${value._key || 'article'}`}
        />
      ),
    },
    hardBreak: () => <br />,
    unknownMark: ({ children }) => children,
    unknownType: () => null,
    unknownBlockStyle: ({ children }) => <p>{children}</p>,
    unknownList: ({ children }) => <ul className="journal-rich__list">{children}</ul>,
    unknownListItem: ({ children }) => <li>{children}</li>,
  }

  return components
}

function Footnotes({ notes }) {
  if (!notes.length) return null

  return (
    <section className="journal-footnotes" aria-labelledby="footnotes-heading">
      <h2 id="footnotes-heading">Notes</h2>
      <ol>
        {notes.map((note, index) => {
          const source = safeExternalHref(note.sourceUrl)
          return (
            <li key={`${note._key || 'note'}-${index}`} id={`footnote-${index + 1}`}>
              <span>{index + 1}</span>
              <p>
                {note.content}
                {source && <> <a href={source} target="_blank" rel="noreferrer">Source</a></>}
                {note.__referenceIds.map((referenceId, referenceIndex) => (
                  <Fragment key={referenceId}>
                    {' '}
                    <a
                      className="journal-footnotes__return"
                      href={`#${referenceId}`}
                      aria-label={`Return to footnote ${index + 1}, reference ${referenceIndex + 1}`}
                    >
                      ↩
                    </a>
                  </Fragment>
                ))}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function ArticleBody({ body = [], references = [] }) {
  if (!body.length) {
    return <div className="journal-rich journal-rich--empty" role="status">Article content is not available.</div>
  }

  const headings = buildArticleHeadings(body)
  const headingIds = new Map(headings.map((heading) => [heading.key, heading.id]))
  const prepared = preparePortableText(body)
  const components = createPortableTextComponents(headingIds)
  const includesReferences = body.some((block) => block?._type === 'references')

  return (
    <div className="journal-rich">
      <PortableText value={prepared.body} components={components} onMissingComponent={false} />
      <Footnotes notes={prepared.notes} />
      {!includesReferences && <ArticleReferences entries={references} />}
    </div>
  )
}
