import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import apiRoutes from './routes/api'
import adminRoutes from './routes/admin'

const app = new Hono()

app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors())

// Mount Routes
app.route('/api/v1', apiRoutes)
app.route('/api/v1/admin', adminRoutes)

console.log('iCode Gateway running on port 18081')

serve({
  fetch: app.fetch,
  port: 18081
})
