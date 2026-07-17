import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const directory = path.dirname(fileURLToPath(import.meta.url))

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
          ...(content.articles || []).map(({slug}) => `blog/${slug}`),
          ...(content.categories || []).map(({slug}) => `blog/category/${slug}`),
          ...(content.tags || []).map(({slug}) => `blog/tag/${slug}`),
        ]

        await fs.copyFile(indexPath, path.resolve(directory, 'dist/404.html'))
        for (const route of routes) {
          const routeDirectory = path.resolve(directory, 'dist', route)
          await fs.mkdir(routeDirectory, {recursive: true})
          await fs.copyFile(indexPath, path.join(routeDirectory, 'index.html'))
        }
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
