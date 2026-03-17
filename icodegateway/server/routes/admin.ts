import { Hono, type Context } from 'hono'
import { db } from '../db'
import { users, devices, sessions, auditLogs } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

const admin = new Hono()

admin.get('/stats', async (c: Context) => {
  const totalRequests = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).get()
  const blockedRequests = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.risk_level, 'high')).get()
  const activeDevices = await db.select({ count: sql<number>`count(*)` }).from(devices).where(eq(devices.status, 'active')).get()
  
  // Simple Mock Trend Data (Real implementation needs group by hour query)
  const trendData = [
    { name: '00:00', rpm: 100, block: 5 },
    { name: '04:00', rpm: 50, block: 2 },
    { name: '08:00', rpm: 200, block: 10 },
    { name: '12:00', rpm: 500, block: 25 },
    { name: '16:00', rpm: 450, block: 20 },
    { name: '20:00', rpm: 300, block: 15 },
    { name: '23:59', rpm: 150, block: 8 },
  ]

  return c.json({ 
    code: 0, 
    message: 'success', 
    data: {
      total_requests: totalRequests?.count || 0,
      blocked_requests: blockedRequests?.count || 0,
      active_devices: activeDevices?.count || 0,
      trend: trendData
    } 
  })
})

admin.get('/audit-logs', async (c: Context) => {
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.created_at)).limit(100).all()
  return c.json({ code: 0, message: 'success', data: logs })
})

admin.get('/devices', async (c: Context) => {
  const deviceList = await db.select().from(devices).orderBy(desc(devices.created_at)).all()
  return c.json({ code: 0, message: 'success', data: deviceList })
})

admin.post('/devices/:id/status', async (c: Context) => {
  const id = c.req.param('id')
  if (!id) return c.json({ code: 400, message: 'Missing id' })
  
  const { status } = await c.req.json()
  
  await db.update(devices).set({ status }).where(eq(devices.id, id))
  return c.json({ code: 0, message: 'success' })
})

import { PolicyService } from '../services/policy'

admin.get('/policies', async (c: Context) => {
  return c.json({ code: 0, message: 'success', data: PolicyService.get() })
})

admin.post('/policies', async (c: Context) => {
  const body = await c.req.json()
  PolicyService.update(body)
  return c.json({ code: 0, message: 'success', data: PolicyService.get() })
})

export default admin
