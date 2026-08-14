import { useEffect, useMemo } from 'react'
import { marked } from 'marked'
import { updateMetadata } from '../metadata.js'
import BonusWorkCalculator from './BonusWorkCalculator.jsx'
import guidanceSource from './guidance.md?raw'

const calculatorMarker = '<span color="pink">\\[</span><span color="pink" underline="true">**website calculator**</span><span color="pink">\\]</span>'

const navigation = [
  ['01', 'Start Here', 'start-here'],
  ['02', 'Main, Baseline, Comp Ready and Return', 'programme-tracks'],
  ['03', 'Training Rules', 'training-rules'],
  ['04', 'Choosing Your Bonus Work', 'bonus-work'],
  ['05', 'Rearranging/Missing Sessions & Extra Work', 'session-changes'],
  ['06', 'Comp Ready', 'comp-ready'],
  ['07', 'Return Week (After Competition)', 'return-week'],
  ['08', 'FAQ', 'faq'],
  ['09', 'Free Week 1 and paid programme links', 'programme-links'],
  ['A', 'Detailed Training Guidance & Examples', 'appendix-a'],
  ['B', 'Sources', 'appendix-b'],
]

const anchors = [
  ['# 1. Start Here', 'start-here'],
  ['# 2. Main, Baseline, Comp Ready and Return', 'programme-tracks'],
  ['# 3. Training Rules', 'training-rules'],
  ['# 4. Choosing Your Bonus Work', 'bonus-work'],
  ['# 5. Rearranging/Missing Sessions & Extra Work', 'session-changes'],
  ['# 6. Comp Ready', 'comp-ready'],
  ['# 7. Return Week (After Competition)', 'return-week'],
  ['# 8. FAQ', 'faq'],
  ['# 9. Free Week 1 and paid programme links', 'programme-links'],
  ['# Appendix A. Detailed Training Guidance & Examples', 'appendix-a'],
  ['# Appendix B: Sources', 'appendix-b'],
]

function prepareNotionMarkdown(source) {
  let value = source.trim()
  value = value.replace(/^# ATHX Performance Programming\n+/, '')
  value = value.replace(/<table_of_contents\/>/g, '')
  value = value.replace(/<empty-block\/>/g, '')
  value = value.replace(
    '- **Lite paid programme:** link added when the programme is released',
    '- [**Lite paid programme:**](https://app.fitr.training/p/athx-performance-programming-lite)',
  )
  value = value.replace(
    '- **Intermediate paid programme:** link added when the programme is released',
    '- [**Intermediate paid programme:**](https://app.fitr.training/p/athx-performance-programming-intermediate)',
  )
  value = value.replace(
    '- **Pro paid programme:** link added when the programme is released',
    '- [**Pro paid programme:**](https://app.fitr.training/p/433727)',
  )

  const callouts = []
  value = value.replace(/<callout[^>]*>\n([\s\S]*?)\n<\/callout>/g, (_, content) => {
    const token = `NOTIONCALLOUT${callouts.length}TOKEN`
    callouts.push(
      content
        .split('\n')
        .map((line) => '> ' + line.replace(/^\t+/, ''))
        .join('\n'),
    )
    return token
  })

  const tables = []
  value = value.replace(/<table header-row="true">([\s\S]*?)<\/table>/g, (_, body) => {
    const withHeader = body.replace(/<tr>([\s\S]*?)<\/tr>/, (_, row) => (
      '<tr>' + row.replaceAll('<td>', '<th>').replaceAll('</td>', '</th>') + '</tr>'
    ))
    const renderedCells = withHeader.replace(/<(td|th)>([\s\S]*?)<\/\1>/g, (_, tag, cell) => (
      '<' + tag + '>' + marked.parseInline(cell) + '</' + tag + '>'
    ))
    const token = `NOTIONTABLE${tables.length}TOKEN`
    tables.push('<div class="athx-table-shell"><table>' + renderedCells + '</table></div>')
    return token
  })

  value = value.replace(/^(\t+)(?=[-*+] )/gm, (tabs) => '    '.repeat(tabs.length))
  value = value.replace(/^\t+/gm, '')

  anchors.forEach(([heading, id]) => {
    value = value.replace(heading, '<span class="athx-anchor" id="' + id + '"></span>\n' + heading)
  })

  // Notion permits emphasis markers to close after a trailing space. Standard
  // Markdown parsers do not, so translate that formatting without touching the text.
  value = value.replace(/(?<![\p{L}\p{N}])\*\*([^\s*][^*\n]*?)([ \u00a0])\*\*/gu, '<strong>$1$2</strong>')
  value = value.replaceAll('** COMPETING**', '<strong> COMPETING</strong>')
  value = value.replace(/(?<![\p{L}\p{N}*])\*([^\s*][^*\n]*?)([ \u00a0])\*(?!\*)/gu, '<em>$1$2</em>')
  value = value.replace(/(?<!\*)\*([ \u00a0])\*(?!\*)/g, '$1')

  value = value.replace(/<span([^>]*)>/g, (_, attributes) => {
    const classes = ['athx-inline']
    const colour = attributes.match(/color="([^"]+)"/)?.[1]
    if (colour) classes.push('athx-inline--' + colour)
    if (/underline="true"/.test(attributes)) classes.push('athx-inline--underline')
    return '<span class="' + classes.join(' ') + '">'
  })

  value = value
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n\n')

  callouts.forEach((callout, index) => {
    value = value.replace(`NOTIONCALLOUT${index}TOKEN`, callout)
  })

  tables.forEach((table, index) => {
    value = value.replace(`NOTIONTABLE${index}TOKEN`, table)
  })

  const html = marked.parse(value, { gfm: true })
  return html.replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=')
}

export default function AthxGuidance() {
  const html = useMemo(() => {
    const [beforeCalculator, afterCalculator] = guidanceSource.split(calculatorMarker)
    return {
      beforeCalculator: prepareNotionMarkdown(beforeCalculator),
      afterCalculator: prepareNotionMarkdown(afterCalculator),
    }
  }, [])

  useEffect(() => {
    updateMetadata({
      title: 'ATHX Performance Programming Guidance',
      description: 'ATHX performance programming guidance for programme selection, testing, competition preparation and return to training.',
      path: '/athx/guidance',
      robots: 'noindex, nofollow',
    })
  }, [])

  return (
    <div className="athx-page">
      <header className="athx-hero">
        <div className="athx-hero__grid" aria-hidden="true" />
        <div className="athx-hero__eyebrow"><span>ATHX</span><i /><p>Guidance Document</p></div>
        <div className="athx-hero__content">
          <p>Performance programming</p>
          <h1>ATHX Performance Programming</h1>
        </div>
      </header>

      <div className="athx-document">
        <aside className="athx-toc" aria-label="Guidance contents">
          <p>On this page</p>
          <nav>
            {navigation.map(([number, label, id]) => (
              <a href={'#' + id} key={id}><span>{number}</span>{label}</a>
            ))}
          </nav>
        </aside>

        <article className="athx-richtext">
          <div dangerouslySetInnerHTML={{ __html: html.beforeCalculator }} />
          <BonusWorkCalculator />
          <div dangerouslySetInnerHTML={{ __html: html.afterCalculator }} />
        </article>
      </div>
    </div>
  )
}
