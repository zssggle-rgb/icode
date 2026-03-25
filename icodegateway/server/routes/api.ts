import { Hono, type Context } from 'hono'
import { db } from '../db'
import { users, devices, sessions, auditLogs } from '../db/schema'
import { eq, desc, and, gte, sql } from 'drizzle-orm'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { GitLabAuthService } from '../services/gitlab-auth'
import { PolicyService } from '../services/policy'
import { ModelConfigService } from '../services/model-config'
import { AuditService } from '../services/audit'
import { AlertService } from '../services/alert'
import { AdoptionService } from '../services/adoption'

const api = new Hono()

// Session file path
const SESSION_FILE = path.join(process.env.HOME || '/root', '.icode', 'session')

function ensureSessionDir() {
  const dir = path.dirname(SESSION_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function saveSessionToFile(sessionData: any) {
  ensureSessionDir()
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2))
}

// BE-1: Session Init - POST /api/v1/session/init
api.post('/session/init', async (c: Context) => {
  const body = await c.req.json()
  console.log('[Session Init]:', body)

  const { user_id, device_fingerprint, gitlab_token, project_id, repo_id } = body

  if (!user_id || !device_fingerprint) {
    return c.json({ code: 400, message: '缺少 user_id 或 device_fingerprint' }, 400)
  }

  let gitlabUser: any = null

  // Authenticate via GitLab Token if provided
  if (gitlab_token) {
    const result = await GitLabAuthService.validateToken(gitlab_token)
    if (!result.valid) {
      return c.json({ code: 401, message: result.error || 'GitLab Token 无效' }, 401)
    }
    gitlabUser = result.user
    console.log('[Session Init] GitLab user:', gitlabUser?.username)
  }

  // Upsert Device
  let device = await db.select().from(devices).where(eq(devices.fingerprint, device_fingerprint)).get()

  if (!device) {
    try {
      await db.insert(devices).values({
        id: device_fingerprint,
        fingerprint: device_fingerprint,
        status: 'active',
        last_seen_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('[Session] Device insert error:', e)
    }
    device = await db.select().from(devices).where(eq(devices.fingerprint, device_fingerprint)).get()
  } else {
    await db.update(devices)
      .set({ last_seen_at: new Date().toISOString() })
      .where(eq(devices.id, device.id))
  }

  // Upsert User (use GitLab username if available)
  const username = gitlabUser?.username || user_id
  let user = await db.select().from(users).where(eq(users.username, username)).get()

  if (!user) {
    try {
      await db.insert(users).values({
        id: username,
        username: username,
        password_hash: gitlab_token ? 'gitlab-managed' : 'unknown',
        role: 'developer'
      })
    } catch (e) {
      console.error('[Session] User insert error:', e)
    }
    user = await db.select().from(users).where(eq(users.username, username)).get()
  }

  if (!user) {
    return c.json({ code: 500, message: '创建用户失败' }, 500)
  }
  if (!device) {
    return c.json({ code: 500, message: '创建设备失败' }, 500)
  }

  // Create session
  const sessionId = crypto.randomUUID()
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: sessionId,
    token: token,
    user_id: user.id,
    device_id: device.id,
    project_id: project_id || null,
    repo_id: repo_id || null,
    expires_at: expiresAt
  })

  // Save session to local file (~/.icode/session) per API Contract API-1
  const sessionData = {
    session_id: sessionId,
    token: token,
    user_id: user.id,
    device_fingerprint: device_fingerprint,
    expires_at: expiresAt.toISOString()
  }
  saveSessionToFile(sessionData)

  const modelProvider = ModelConfigService.getActiveProvider()

  return c.json({
    code: 0,
    message: 'success',
    data: {
      session_id: sessionId,
      token: token,
      policy_version: '1.0.0',
      model: {
        provider: modelProvider.type,
        model: modelProvider.model
      }
    }
  })
})

// BE-12: Stats - GET /api/v1/stats
api.get('/stats', async (c: Context) => {
  const period = c.req.query('period') || 'today'

  const now = new Date()
  let startDate: Date

  if (period === '7d') {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === '30d') {
    startDate = new Date(now)
    startDate.setMonth(startDate.getMonth() - 1)
  } else {
    // today
    startDate = new Date(now)
    startDate.setHours(0, 0, 0, 0)
  }

  const startStr = startDate.toISOString()

  const allLogs = await db.select().from(auditLogs).all()
  const recentLogs = allLogs.filter(l => l.created_at && l.created_at >= startStr)

  const totalRequests = recentLogs.length
  const activeDevicesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(devices)
    .where(eq(devices.status, 'active'))
    .get()
  const riskEvents = recentLogs.filter(l => l.risk_level === 'medium' || l.risk_level === 'high').length

  // Trend data (last 7 days)
  const trend: Array<{ time: string; requests: number; risk_events: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    const dayLogs = allLogs.filter(l => (l.created_at || '').startsWith(dateStr))
    const riskCount = dayLogs.filter(l => l.risk_level === 'medium' || l.risk_level === 'high').length

    trend.push({ time: dateStr, requests: dayLogs.length, risk_events: riskCount })
  }

  // Top users
  const userCounts = new Map<string, number>()
  for (const log of recentLogs) {
    const uid = log.user_id || 'unknown'
    userCounts.set(uid, (userCounts.get(uid) || 0) + 1)
  }
  const topUsers = Array.from(userCounts.entries())
    .map(([user_id, requests]) => ({ user_id, requests, change: 0 }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5)

  // Risk distribution
  const lowCount = recentLogs.filter(l => l.risk_level === 'low').length
  const mediumCount = recentLogs.filter(l => l.risk_level === 'medium').length
  const highCount = recentLogs.filter(l => l.risk_level === 'high').length

  return c.json({
    code: 0,
    message: 'success',
    data: {
      total_requests: totalRequests,
      active_devices: activeDevicesResult?.count || 0,
      risk_events: riskEvents,
      total_tokens: totalRequests * 100,
      trend,
      top_users: topUsers,
      risk_distribution: {
        low: lowCount,
        medium: mediumCount,
        high: highCount
      }
    }
  })
})

// BE-13: Audit Logs with pagination - GET /api/v1/admin/audit-logs
api.get('/admin/audit-logs', async (c: Context) => {
  const page = parseInt(c.req.query('page') || '1')
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '50'), 100)
  const userId = c.req.query('user_id') || undefined
  const riskLevel = c.req.query('risk_level') || undefined
  const startTime = c.req.query('start_time') || undefined
  const endTime = c.req.query('end_time') || undefined

  const result = await AuditService.query({ page, pageSize, userId, riskLevel, startTime, endTime })

  // Transform to API contract format
  const logs = result.logs.map(log => ({
    id: log.id,
    request_id: log.request_id,
    user_id: log.user_id,
    device_id: log.device_id,
    action: log.action,
    prompt_summary: log.prompt_summary,
    response_summary: log.response_summary,
    risk_level: log.risk_level,
    cross_project_attempt: log.cross_project_attempt === 1,
    model: log.model_name,
    provider: log.provider,
    duration_ms: log.duration_ms,
    metadata: (() => {
      try {
        return log.metadata ? JSON.parse(log.metadata as string) : {}
      } catch {
        return {}
      }
    })(),
    created_at: log.created_at
  }))

  return c.json({
    code: 0,
    message: 'success',
    data: {
      logs,
      pagination: result.pagination
    }
  })
})

// BE-10: Alert List - GET /api/v1/alerts
api.get('/alerts', async (c: Context) => {
  const status = c.req.query('status') as 'pending' | 'resolved' | undefined
  const page = parseInt(c.req.query('page') || '1')
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '50'), 100)

  const result = await AlertService.query({ status, page, pageSize })

  return c.json({
    code: 0,
    message: 'success',
    data: {
      alerts: result.alerts,
      pagination: result.pagination
    }
  })
})

// BE-11: Alert Resolve - POST /api/v1/alerts/:id/resolve
api.post('/alerts/:id/resolve', async (c: Context) => {
  const alertId = c.req.param('id')
  const { note } = await c.req.json().catch(() => ({}))

  await AlertService.resolve(alertId, 'admin', note)

  return c.json({ code: 0, message: 'success' })
})

// BE-14: Device List - GET /api/v1/admin/devices
api.get('/admin/devices', async (c: Context) => {
  const deviceList = await db.select().from(devices).orderBy(desc(devices.created_at)).all()

  return c.json({
    code: 0,
    message: 'success',
    data: {
      devices: deviceList.map(d => ({
        id: d.id,
        user_id: d.user_id,
        status: d.status,
        last_seen_at: d.last_seen_at,
        created_at: d.created_at
      })),
      total: deviceList.length
    }
  })
})

// BE-14: Device Status Update - POST /api/v1/admin/devices/:id/status
api.post('/admin/devices/:id/status', async (c: Context) => {
  const deviceId = c.req.param('id')
  const { status } = await c.req.json().catch(() => ({}))

  if (!deviceId) {
    return c.json({ code: 400, message: '缺少设备 ID' }, 400)
  }

  await db.update(devices)
    .set({ status })
    .where(eq(devices.id, deviceId))

  return c.json({ code: 0, message: 'success' })
})

// BE-15: Policy Query - GET /api/v1/admin/policy
api.get('/admin/policy', async (c: Context) => {
  const policy = PolicyService.get()
  return c.json({ code: 0, message: 'success', data: policy })
})

// BE-15: Policy Save - POST /api/v1/admin/policy
api.post('/admin/policy', async (c: Context) => {
  const body = await c.req.json()
  const oldPolicy = PolicyService.get()

  PolicyService.update(body)

  // Log policy change
  await AuditService.logPolicyChange('admin', 'update', oldPolicy, body)

  return c.json({ code: 0, message: 'success', data: PolicyService.get() })
})

// Policy reload - POST /api/v1/admin/policy/reload
api.post('/admin/policy/reload', async (c: Context) => {
  const oldPolicy = PolicyService.get()
  PolicyService.reload()
  await AuditService.logPolicyChange('admin', 'reload', oldPolicy, PolicyService.get())

  return c.json({ code: 0, message: 'success' })
})

// BE-16: My Usage - GET /api/v1/my-usage
api.get('/my-usage', async (c: Context) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  let userId = 'anonymous'
  if (token) {
    const session = await db.select().from(sessions).where(eq(sessions.token, token)).get()
    if (session) {
      userId = session.user_id
    }
  }

  const period = (c.req.query('period') || 'month') as 'week' | 'month'

  const usage = await AdoptionService.getMyUsage({ userId, period })

  return c.json({
    code: 0,
    message: 'success',
    data: usage
  })
})

// BE-17: Adoption Report - POST /api/v1/adoption
api.post('/adoption', async (c: Context) => {
  const body = await c.req.json().catch(() => ({}))
  const { request_id, status } = body

  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  let userId = 'anonymous'
  if (token) {
    const session = await db.select().from(sessions).where(eq(sessions.token, token)).get()
    if (session) {
      userId = session.user_id
    }
  }

  if (!request_id || !status) {
    return c.json({ code: 400, message: '缺少 request_id 或 status' }, 400)
  }

  await AdoptionService.report({ request_id, status, user_id: userId })

  return c.json({ code: 0, message: 'success' })
})

export default api
