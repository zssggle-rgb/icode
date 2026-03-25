import { db } from '../db'
import { auditLogs, policyAudit } from '../db/schema'
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import crypto from 'crypto'

export interface CreateAuditLogParams {
  user_id: string
  device_id?: string
  action: string
  prompt: string
  response?: string
  riskLevel: 'low' | 'medium' | 'high'
  crossProjectAttempt?: boolean
  modelName?: string
  provider?: string
  durationMs?: number
  metadata?: Record<string, any>
}

export interface AuditLogQuery {
  page?: number
  pageSize?: number
  userId?: string
  riskLevel?: string
  startTime?: string
  endTime?: string
}

export interface PaginatedAuditLogs {
  logs: any[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

export const AuditService = {
  async create(params: CreateAuditLogParams): Promise<string> {
    const id = crypto.randomUUID()
    const requestId = crypto.randomUUID()

    const promptSummary = params.prompt.substring(0, 200)
    const responseSummary = params.response
      ? params.response.substring(0, 500) // 500 char limit per API Contract API-2
      : null

    const metadata = {
      ...params.metadata,
      risk_reason: params.metadata?.risk_reason
    }

    await db.insert(auditLogs).values({
      id,
      request_id: requestId,
      user_id: params.user_id,
      device_id: params.device_id || null,
      action: params.action,
      prompt_summary: promptSummary,
      response_summary: responseSummary,
      risk_level: params.riskLevel,
      cross_project_attempt: params.crossProjectAttempt ? 1 : 0,
      model_name: params.modelName || null,
      provider: params.provider || null,
      duration_ms: params.durationMs || null,
      metadata: JSON.stringify(metadata)
    })

    return id
  },

  async updateResponseSummary(logId: string, response: string) {
    const summary = response.substring(0, 500)
    try {
      await db.update(auditLogs)
        .set({ response_summary: summary })
        .where(eq(auditLogs.id, logId))
    } catch (e) {
      console.error('[AuditService] Failed to update response_summary:', e)
    }
  },

  async query(params: AuditLogQuery = {}): Promise<PaginatedAuditLogs> {
    const page = params.page || 1
    const pageSize = Math.min(params.pageSize || 50, 100) // max 100 per page

    const conditions = []

    if (params.userId) {
      conditions.push(eq(auditLogs.user_id, params.userId))
    }
    if (params.riskLevel) {
      conditions.push(eq(auditLogs.risk_level, params.riskLevel))
    }
    if (params.startTime) {
      conditions.push(gte(auditLogs.created_at, params.startTime))
    }
    if (params.endTime) {
      conditions.push(lte(auditLogs.created_at, params.endTime))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause)
      .get()

    const total = totalResult?.count || 0
    const totalPages = Math.ceil(total / pageSize)

    // Get paginated results
    const offset = (page - 1) * pageSize
    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.created_at))
      .limit(pageSize)
      .offset(offset)
      .all()

    return {
      logs,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages
      }
    }
  },

  // Policy audit logging
  async logPolicyChange(adminUserId: string, action: 'update' | 'reload', oldPolicy: any, newPolicy: any) {
    const id = crypto.randomUUID()

    await db.insert(policyAudit).values({
      id,
      admin_user_id: adminUserId,
      action,
      old_policy: oldPolicy ? JSON.stringify(oldPolicy) : null,
      new_policy: newPolicy ? JSON.stringify(newPolicy) : null
    })
  }
}
