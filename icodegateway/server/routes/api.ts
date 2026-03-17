import { Hono, type Context } from 'hono'
import { db } from '../db'
import { users, devices, sessions, auditLogs } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { AuthService } from '../services/auth'
import { PolicyService } from '../services/policy'
import { ProxyService } from '../services/proxy'
import { AnalysisService } from '../services/analysis'
import { RiskService } from '../services/risk'
import { AclService } from '../services/acl'
import { LeakageService } from '../services/leakage'

const api = new Hono()

// Session Init
api.post('/session/init', async (c: Context) => {
  const body = await c.req.json()
  console.log('Session Init:', body)
  
  const { user_id, device_fingerprint, project_id, repo_id, password, svn_password } = body
  
  if (!user_id || !device_fingerprint) {
    return c.json({ code: 400, message: 'Missing user_id or device_fingerprint' }, 400)
  }

  // SVN Authentication & Authorization
  // Use password (from CLI) or svn_password (explicit)
  const authPassword = svn_password || password;

  if (authPassword) {
    if (!AclService.authenticate(user_id, authPassword)) {
      console.warn(`SVN Auth Failed for user: ${user_id}`)
      return c.json({ code: 401, message: 'SVN Authentication Failed' }, 401)
    }
  } else {
    return c.json({ code: 401, message: 'Missing SVN password' }, 401)
  }

  if (repo_id && !AclService.checkPermission(user_id, repo_id)) {
    return c.json({ code: 403, message: `Access Denied to Repo: ${repo_id}` }, 403)
  }

  // Upsert Device
  let [device] = await db.select().from(devices).where(eq(devices.fingerprint, device_fingerprint))

  if (!device) {
    try {
      await db.insert(devices).values({
        id: device_fingerprint,
        fingerprint: device_fingerprint,
        status: 'active',
        last_seen_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('Device insert error:', e)
    }
    // Try fetch again
    const devicesList = await db.select().from(devices).where(eq(devices.fingerprint, device_fingerprint))
    device = devicesList[0]
  } else {
    try {
      await db.update(devices)
        .set({ last_seen_at: new Date().toISOString() })
        .where(eq(devices.id, device.id))
    } catch (e) {
      console.error('Device update error:', e)
    }
  }

  console.log('Device selected:', device)

  // Upsert User
  // Try to find by ID (if user_id is the internal ID) or username
  let [user] = await db.select().from(users).where(eq(users.id, user_id))
  
  if (!user) {
      const usersList = await db.select().from(users).where(eq(users.username, user_id))
      user = usersList[0]
  }
  
  if (!user) {
    try {
      await db.insert(users).values({
        id: user_id,
        username: user_id,
        password_hash: 'svn-managed',
        role: 'developer'
      })
    } catch (e) {
      console.error('User insert error:', e)
    }
    // Try fetch again by username (most reliable)
    const usersList = await db.select().from(users).where(eq(users.username, user_id))
    user = usersList[0]
  }
  
  console.log('User selected:', user)

  if (!user) {
    return c.json({ code: 500, message: 'Failed to create/retrieve user' }, 500)
  }
  if (!device) {
    return c.json({ code: 500, message: 'Failed to create/retrieve device' }, 500)
  }

  const sessionId = crypto.randomUUID()
  const token = crypto.randomUUID() // Simplified token
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: sessionId,
    token: token,
    user_id: user.id,
    device_id: device.id,
    project_id: project_id,
    repo_id: repo_id,
    expires_at: expiresAt
  })

  return c.json({
    code: 0,
    message: 'success',
    data: {
      session_id: sessionId,
      policy_version: '1.0.0',
      project_level: 'standard'
    }
  })
})

// Chat Completions (Proxy to LLM)
api.post('/chat/completions', async (c: Context) => {
  const body = await c.req.json()
  console.log('Chat Request (Proxy):', body)
  
  // Extract mode, default to 'managed' if not specified
  const { session_id, prompt, context, model, upstream_url, mode } = body

  const policy = PolicyService.get()
  const targetUrl = upstream_url || policy.routing.target_url

  if (!targetUrl) {
    return c.json({ code: 400, message: 'Missing upstream_url parameter. Proxy requires a target LLM address.' }, 400)
  }

  const activeMode = mode || policy.routing.default_mode

  const session = await AuthService.validateSession(session_id)
  
  if (!session) {
    return c.json({ code: 401, message: 'Invalid or expired session' }, 401)
  }

  // Get user details for ACL check
  const [user] = await db.select().from(users).where(eq(users.id, session.user_id))
  if (!user) {
    return c.json({ code: 401, message: 'User not found' }, 401)
  }

  // 1. Risk Engine Logic (Sync)
  const { riskLevel, reason } = RiskService.evaluate(prompt)
  
  // In managed mode, block high risk. In passthrough mode, allow but log.
  if (riskLevel === 'high') {
    if (activeMode === 'managed') {
      return c.json({ 
        code: 403, 
        message: `Request blocked by Risk Engine: ${reason}`,
        data: { content: `Error: Request blocked. Reason: ${reason}` }
      })
    } else {
      console.log(`[Passthrough] High risk detected but NOT blocked: ${reason}`)
    }
  }

  // 2. Log Audit (Sync Write)
  const logId = crypto.randomUUID()
  const requestId = crypto.randomUUID()
  
  // Prepare metadata
  const metadata = {
    model: model || 'unknown',
    upstream_url: targetUrl,
    mode: activeMode,
    context_files_count: context?.files?.length || 0,
    risk_reason: reason,
    status: 'pending'
  }

  await db.insert(auditLogs).values({
    id: logId,
    request_id: requestId,
    user_id: session.user_id,
    device_id: session.device_id,
    action: 'chat_completion',
    prompt_summary: prompt.substring(0, 100),
    risk_level: riskLevel,
    metadata: JSON.stringify(metadata)
  })

  // 3. Proxy to Target LLM (Sync/Async based on stream - currently Sync)
  const result = await ProxyService.forward(prompt, context, { 
    model: model, 
    upstreamUrl: targetUrl,
    mode: activeMode as 'managed' | 'passthrough'
  })

  // 4. Leakage Detection (Output Guard)
  // Check if output contains unauthorized code from other repos
  const leakage = LeakageService.check(result.content, user.username)
  if (leakage.detected) {
    // Block high risk leakage
    const blockedReason = `Output blocked by Leakage Detection: ${leakage.reason}`;
    console.warn(blockedReason);

    // Update audit log
    await db.update(auditLogs)
        .set({ 
            risk_level: 'high', 
            metadata: JSON.stringify({ ...metadata, status: 'blocked', blocked_reason: blockedReason }) 
        })
        .where(eq(auditLogs.id, logId));

    return c.json({
        code: 403,
        message: blockedReason,
        data: { content: `[BLOCKED] Content contains unauthorized code from ${leakage.source}` }
    }, 403);
  }

  // 5. Async Analysis via Zhipu GLM-4.7 (Fire and forget)
  AnalysisService.analyze(logId, prompt, result.content).catch(err => {
    console.error('Async Analysis Failed:', err)
  })

  // 6. Update Audit Log Metadata with success status
  const updatedMetadata = {
    ...metadata,
    status: 'success',
    response_preview: result.content.substring(0, 50)
  }

  await db.update(auditLogs)
    .set({ metadata: JSON.stringify(updatedMetadata) })
    .where(eq(auditLogs.id, logId))

  return c.json({
    code: 0,
    message: 'success',
    data: result
  })
})

export default api
