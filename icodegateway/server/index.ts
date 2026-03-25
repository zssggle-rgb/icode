import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import { join } from 'path'
import apiRoutes from './routes/api'
import adminRoutes from './routes/admin'
import openaiRoutes from './routes/openai'

const app = new Hono()

app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors())

// Serve static files from dist/
app.use('/assets/*', serveStatic({ root: './dist/', rewriteRequestPath: (p) => p }))
app.use('/dashboard/*', serveStatic({ root: './dist/', rewriteRequestPath: (p) => p.replace(/^\/dashboard/, '') }))

// Mount Routes FIRST (before catch-all)
app.route('/api/v1', apiRoutes)
app.route('/api/v1/admin', adminRoutes)
app.route('/v1', openaiRoutes)

// Serve index.html for client-side routing (catch-all after API)
app.get('/*', (c) => {
  try {
    const indexPath = join('./dist', 'index.html')
    return c.html(readFileSync(indexPath, 'utf-8'), 200)
  } catch {
    return c.html('<html><body><h1>Dashboard not built</h1><p>Run: cd src/dashboard && npm run build</p></body></html>', 200)
  }
})

console.log('iCode Gateway running on port 18081')

serve({
  fetch: app.fetch,
  port: 18081
})
