import { Hono, type Context } from 'hono'
import { db } from '../db'
import { devices, agentIdentities, agentToolCalls, auditLogs } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

const admin = new Hono()

// Legacy stats route (also available at /api/v1/stats)
admin.get('/stats', async (c: Context) => {
  const totalRequests = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).get()
  const blockedRequests = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.risk_level, 'high')).get()
  const activeDevices = await db.select({ count: sql<number>`count(*)` }).from(devices).where(eq(devices.status, 'active')).get()

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

// Legacy audit-logs route (also available at /api/v1/admin/audit-logs)
admin.get('/audit-logs', async (c: Context) => {
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.created_at)).limit(100).all()
  return c.json({ code: 0, message: 'success', data: logs })
})

// Legacy devices route (also available at /api/v1/admin/devices)
admin.get('/devices', async (c: Context) => {
  const deviceList = await db.select().from(devices).orderBy(desc(devices.created_at)).all()
  return c.json({ code: 0, message: 'success', data: deviceList })
})

admin.post('/devices/:id/status', async (c: Context) => {
  const id = c.req.param('id')
  if (!id) return c.json({ code: 400, message: '缺少设备 ID' })

  const { status } = await c.req.json().catch(() => ({}))

  await db.update(devices).set({ status }).where(eq(devices.id, id))
  return c.json({ code: 0, message: 'success' })
})

// Agent Monitor Endpoints
admin.get('/agents', async (c: Context) => {
  const agents = await db.select().from(agentIdentities).all()
  return c.json({ code: 0, message: 'success', data: agents })
})

admin.get('/agents/topology', async (c: Context) => {
  const toolCalls = await db.select().from(agentToolCalls).all()
  const agents = await db.select().from(agentIdentities).all()

  const nodesMap = new Map<string, any>()
  const edges: any[] = []

  agents.forEach((agent) => {
    nodesMap.set(agent.id, {
      id: agent.id,
      name: `${agent.name}\n(${agent.type})`,
      category: 0,
      symbolSize: 60,
      itemStyle: { color: (agent.risk_score ?? 0) > 0 ? '#ef4444' : '#10b981' }
    })
  })

  toolCalls.forEach(tc => {
    if (!tc.target_resource || tc.target_resource === 'unknown') return

    const resId = `res_${tc.target_resource}`
    if (!nodesMap.has(resId)) {
      nodesMap.set(resId, {
        id: resId,
        name: `${tc.target_resource.split('/').pop()}\n(${tc.target_resource.includes('/') ? 'File' : 'Resource'})`,
        category: 1,
        symbolSize: 50,
        itemStyle: { color: '#3b82f6' }
      })
    }

    edges.push({
      source: tc.agent_id,
      target: resId,
      label: { show: true, formatter: tc.action_type || 'Unknown' },
      lineStyle: { color: tc.action_type === 'Execute Command' ? '#ef4444' : '#94a3b8', width: 2, curveness: 0.2 }
    })
  })

  return c.json({
    code: 0,
    message: 'success',
    data: {
      nodes: Array.from(nodesMap.values()),
      edges: edges
    }
  })
})

admin.get('/agents/tool-calls', async (c: Context) => {
  const calls = await db.select().from(agentToolCalls).orderBy(desc(agentToolCalls.created_at)).limit(50).all()
  return c.json({ code: 0, message: 'success', data: calls })
})

export default admin
