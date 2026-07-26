import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const directory = path.dirname(fileURLToPath(import.meta.url))
const publicOrigin = 'https://theperformanceconsultant.github.io'
const stressMapRoute = 'tools/hybrid-training-week-stress-map'
const stressMapTitle = 'The Hybrid Training Week Stress Map | The Performance Consultant'
const stressMapDescription = 'Map session load, stress fingerprints, goal alignment, progression and recovery context across a hybrid training week.'

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function createStressMapHtml(indexHtml) {
  const canonical = `${publicOrigin}/${stressMapRoute}`
  const meta = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeHtml(stressMapTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(stressMapDescription)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${canonical}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escapeHtml(stressMapTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(stressMapDescription)}" />`,
  ].join('\n    ')

  return indexHtml
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${escapeHtml(stressMapDescription)}" />`,
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(stressMapTitle)}</title>\n    ${meta}`)
}

function createSitemap(routes) {
  const uniqueRoutes = ['/', ...routes.map((route) => `/${route}`)]
  const entries = uniqueRoutes
    .map((route) => `  <url><loc>${publicOrigin}${route}</loc></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'publication-pages-fallback',
      async closeBundle() {
        const indexPath = path.resolve(directory, 'dist/index.html')
        const content = JSON.parse(
          await fs.readFile(path.resolve(directory, 'src/generated/content.json'), 'utf8'),
        )
        const routes = [
          'blog',
          stressMapRoute,
          ...(content.articles || []).map(({slug}) => `blog/${slug}`),
          ...(content.categories || []).map(({slug}) => `blog/category/${slug}`),
          ...(content.tags || []).map(({slug}) => `blog/tag/${slug}`),
        ]

        await fs.copyFile(indexPath, path.resolve(directory, 'dist/404.html'))
        for (const route of routes) {
          const routeDirectory = path.resolve(directory, 'dist', route)
          await fs.mkdir(routeDirectory, {recursive: true})
          const routeHtml = route === stressMapRoute ? createStressMapHtml(await fs.readFile(indexPath, 'utf8')) : null
          if (routeHtml) {
            await fs.writeFile(path.join(routeDirectory, 'index.html'), routeHtml, 'utf8')
          } else {
            await fs.copyFile(indexPath, path.join(routeDirectory, 'index.html'))
          }
        }
        await fs.writeFile(path.resolve(directory, 'dist/sitemap.xml'), createSitemap(routes), 'utf8')
        await fs.writeFile(
          path.resolve(directory, 'dist/robots.txt'),
          `User-agent: *\nAllow: /\nSitemap: ${publicOrigin}/sitemap.xml\n`,
          'utf8',
        )
        await fs.writeFile(path.resolve(directory, 'dist/.nojekyll'), '', 'utf8')
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(directory, 'node_modules/react'),
      'react-dom': path.resolve(directory, 'node_modules/react-dom'),
      'next/link': path.resolve(directory, 'src/compat/Link.jsx'),
      'next/image': path.resolve(directory, 'src/compat/Image.jsx'),
      'next/navigation': path.resolve(directory, 'src/compat/navigation.jsx'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
