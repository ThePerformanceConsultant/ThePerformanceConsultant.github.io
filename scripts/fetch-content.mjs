import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalisePublication, publicationExportQuery } from '../src/publicationQuery.js'

const directory = path.dirname(fileURLToPath(import.meta.url))
const outputFile = path.resolve(directory, '../src/generated/content.json')
const endpoint = 'https://stkjtr6l.apicdn.sanity.io/v2026-07-17/data/query/production'

const search = new URLSearchParams({
  query: publicationExportQuery,
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

const content = normalisePublication(payload.result)

if (!content.articles.length) {
  throw new Error('No published Sanity articles were returned. The build has been stopped to avoid publishing an empty journal.')
}

await mkdir(path.dirname(outputFile), { recursive: true })
await writeFile(outputFile, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
console.log(`Embedded ${content.articles.length} published article${content.articles.length === 1 ? '' : 's'} from Sanity.`)
