import { Hono, type Context } from 'hono'
import { db } from '../db'
import { users, devices, sessions, auditLogs, agentIdentities, agentToolCalls } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { RiskService } from '../services/risk'
import { LeakageService, LeakageResult } from '../services/leakage'
import { ModelConfigService } from '../services/model-config'
import { CrossProjectService } from '../services/cross-project'
import { AuditService } from '../services/audit'
import { AlertService } from '../services/alert'

const openai = new Hono()

// BE-2: OpenAI-compatible Chat Completions - POST /v1/chat/completions
// This is the SINGLE entry point for all AI chat completions per CQ3
openai.post('/chat/completions', async (c: Context) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body = await c.req.json()
    const authHeader = c.req.header('Authorization')
    const deviceFingerprint = c.req.header('X-Device-ID')

    const { model, messages, stream } = body
    const lastMsg = messages?.[messages.length - 1]
    const prompt = lastMsg?.role === 'user' ? lastMsg.content : ''

    console.log(`[OpenAI] Request ${requestId}: model=${model}, stream=${stream}`)

    // 1. Authenticate via session token
    const token = authHeader?.replace('Bearer ', '')
    let userId = 'anonymous'
    let deviceId = deviceFingerprint || 'unknown'
    let gitlabToken: string | undefined

    if (token) {
      const session = await db.select().from(sessions).where(eq(sessions.token, token)).get()
      if (session) {
        userId = session.user_id
        deviceId = session.device_id || deviceFingerprint || 'unknown'
        // In production, store gitlab token in session
        gitlabToken = (session as any).gitlab_token
      }
    }

    // Ensure user/device exist
    let user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      try {
        await db.insert(users).values({
          id: userId,
          username: userId,
          password_hash: 'token-managed',
          role: 'developer'
        })
        user = await db.select().from(users).where(eq(users.id, userId)).get()
      } catch (e) {}
    }

    let device = await db.select().from(devices).where(eq(devices.id, deviceId)).get()
    if (!device) {
      try {
        await db.insert(devices).values({
          id: deviceId,
          fingerprint: deviceId,
          status: 'active'
        })
        device = await db.select().from(devices).where(eq(devices.id, deviceId)).get()
      } catch (e) {}
    }

    // Ensure Agent Identity exists
    const agentId = 'icode-cli-agent'
    let agent = await db.select().from(agentIdentities).where(eq(agentIdentities.id, agentId)).get()
    if (!agent) {
      try {
        await db.insert(agentIdentities).values({
          id: agentId,
          name: 'iCode CLI',
          type: 'AI Agent',
          description: 'Developer Coding Assistant',
          status: 'online',
          last_active: new Date().toISOString()
        })
      } catch (e) {}
    } else {
      await db.update(agentIdentities)
        .set({ last_active: new Date().toISOString() })
        .where(eq(agentIdentities.id, agentId))
    }

    // 2. Risk Evaluation (log-only per CQ1)
    const riskResult = RiskService.evaluate(prompt)
    console.log(`[OpenAI] Risk: ${riskResult.riskLevel} - ${riskResult.reason || 'ok'}`)

    // 3. Cross-project detection (log-only)
    let crossProjectDetected = false
    let crossProjectDetail: any = {}
    if (gitlabToken && prompt.length > 10) {
      const crossResult = await CrossProjectService.detect(prompt, gitlabToken)
      if (crossResult.detected) {
        crossProjectDetected = true
        crossProjectDetail = crossResult
        console.warn(`[OpenAI] Cross-project attempt: ${crossResult.target_repo}`)

        // Create alert
        await AlertService.create({
          type: 'cross_project_attempt',
          user_id: userId,
          device_id: deviceId,
          detail: {
            prompt_summary: prompt.substring(0, 200),
            target_repo: crossResult.target_repo,
            user_permission: crossResult.user_permission
          }
        })
      }
    }

    // Create alert for high risk keywords
    if (riskResult.riskLevel === 'high' && riskResult.matchedKeyword) {
      await AlertService.create({
        type: 'high_risk_keyword',
        user_id: userId,
        device_id: deviceId,
        detail: {
          prompt_summary: prompt.substring(0, 200),
          keyword: riskResult.matchedKeyword,
          risk_level: 'high'
        }
      })
    }

    // 4. Determine model and provider
    const modelName = model || ModelConfigService.getDefaultModel()
    const provider = ModelConfigService.getProviderForModel(modelName)
    const upstreamUrl = ModelConfigService.getUpstreamUrlForModel(modelName)

    // 5. Log audit BEFORE calling upstream (per CQ3)
    const logId = await AuditService.create({
      user_id: userId,
      device_id: deviceId,
      action: 'chat_completion',
      prompt: prompt,
      riskLevel: riskResult.riskLevel,
      crossProjectAttempt: crossProjectDetected,
      modelName: modelName,
      provider: provider.type,
      durationMs: 0,
      metadata: {
        stream,
        request_id: requestId
      }
    })

    // 6. Forward to upstream LLM
    // Build upstream request body
    const upstreamBody = {
      ...body,
      model: provider.type === 'zhipu' ? provider.model : (body.model || provider.model),
      stream: false // Always non-stream for security check (leakage detection needs full content)
    }

    console.log(`[OpenAI] Forwarding to ${provider.type}: ${upstreamUrl}`)

    let upstreamResponse: any
    try {
      const resp = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...ModelConfigService.getAuthHeader(provider, authHeader)
        },
        body: JSON.stringify(upstreamBody)
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        console.error(`[OpenAI] Upstream error ${resp.status}:`, errorText)
        return c.json({
          error: {
            message: `上游服务错误: ${resp.status}`,
            type: 'upstream_error',
            code: resp.status
          }
        }, resp.status as any)
      }

      upstreamResponse = await resp.json()
    } catch (e: any) {
      console.error(`[OpenAI] Upstream fetch failed:`, e.message)
      return c.json({
        error: {
          message: `网关无法连接上游服务: ${e.message}`,
          type: 'gateway_error',
          code: 502
        }
      }, 502)
    }

    const content = upstreamResponse.choices?.[0]?.message?.content || ''
    const responseToolCalls = upstreamResponse.choices?.[0]?.message?.tool_calls || []
    const usage = upstreamResponse.usage || {}

    const durationMs = Date.now() - startTime

    // 7. Leakage detection on response (log-only per CQ1)
    const leakageResult: LeakageResult = LeakageService.check(content, userId)

    if (leakageResult.detected) {
      console.warn(`[OpenAI] Leakage detected: ${leakageResult.reason}`)

      await AlertService.create({
        type: 'high_risk_leakage',
        user_id: userId,
        device_id: deviceId,
        detail: {
          response_summary: content.substring(0, 200),
          keyword: leakageResult.source
        }
      })
    }

    // 8. Update audit log with response summary and duration
    const responseSummary = LeakageService.summarizeResponse(content)
    await AuditService.updateResponseSummary(logId, content)

    // Update duration in metadata
    const log = await db.select().from(auditLogs).where(eq(auditLogs.id, logId)).get()
    if (log) {
      let metadata: any = {}
      try {
        metadata = log.metadata ? JSON.parse(log.metadata as string) : {}
      } catch (e) {}
      metadata.duration_ms = durationMs
      metadata.leakage_detected = leakageResult.detected
      metadata.leakage_reason = leakageResult.reason

      await db.update(auditLogs)
        .set({
          response_summary: responseSummary,
          duration_ms: durationMs,
          risk_level: leakageResult.detected && leakageResult.riskLevel === 'high'
            ? 'high'
            : (riskResult.riskLevel as 'low' | 'medium' | 'high'),
          metadata: JSON.stringify(metadata)
        })
        .where(eq(auditLogs.id, logId))
    }

    // Log tool calls if any
    if (responseToolCalls.length > 0) {
      for (const tc of responseToolCalls) {
        let targetResource = 'unknown'
        let actionType = 'Execute'

        try {
          const args = JSON.parse(tc.function.arguments)
          if (tc.function.name === 'Read' || tc.function.name === 'Write' || tc.function.name === 'SearchReplace') {
            targetResource = args.file_path || 'unknown'
            actionType = tc.function.name === 'Read' ? 'Read' : 'Write'
          } else if (tc.function.name === 'RunCommand' || tc.function.name === 'bash') {
            targetResource = 'Terminal'
            actionType = 'Execute Command'
          } else if (tc.function.name === 'SearchCodebase' || tc.function.name === 'str_replace_editor') {
            targetResource = 'Workspace'
            actionType = 'Search'
          } else {
            targetResource = tc.function.name
            actionType = 'Tool Call'
          }
        } catch (e) {}

        await db.insert(agentToolCalls).values({
          id: crypto.randomUUID(),
          agent_id: agentId,
          request_id: requestId,
          tool_name: tc.function.name,
          target_resource: targetResource,
          action_type: actionType,
          duration_ms: 0
        })
      }
    }

    // 9. Handle streaming response
    if (stream) {
      const streamId = crypto.randomUUID()
      const streamRes = new ReadableStream({
        start(controller) {
          const chunk: any = {
            id: streamId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: modelName,
            choices: [{
              delta: { content: content },
              index: 0,
              finish_reason: responseToolCalls.length > 0 ? 'tool_calls' : 'stop'
            }]
          }
          if (responseToolCalls.length > 0) {
            chunk.choices[0].delta.tool_calls = responseToolCalls
          }
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`))
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        }
      })
      return new Response(streamRes, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Request-ID': requestId
        }
      })
    }

    // 10. Return normal response
    return c.json({
      ...upstreamResponse,
      id: upstreamResponse.id || `chatcmpl-${requestId}`,
      request_id: requestId
    })

  } catch (e: any) {
    console.error(`[OpenAI] Internal error on ${requestId}:`, e)
    return c.json({
      error: {
        message: `网关内部错误: ${e.message}`,
        type: 'internal_error',
        code: 500
      }
    }, 500)
  }
})

export default openai
