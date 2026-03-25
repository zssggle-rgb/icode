import { db } from '../db'
import { adoptionLogs, auditLogs } from '../db/schema'
import { eq, desc, and, gte, sql } from 'drizzle-orm'
import crypto from 'crypto'

export type AdoptionStatus = 'adopted' | 'rejected' | 'modified'

export interface AdoptionReport {
  request_id: string
  status: AdoptionStatus
  user_id: string
}

export interface MyUsageParams {
  userId: string
  period?: 'week' | 'month'
  page?: number
  pageSize?: number
}

export interface MyUsageResult {
  total_requests: number
  quota: number
  requests_today: number
  trend: Array<{ date: string; requests: number }>
  recent_requests: Array<{
    id: string
    prompt_summary: string
    risk_level: string
    status: string
    created_at: string
  }>
}

export const AdoptionService = {
  async report(report: AdoptionReport) {
    const id = crypto.randomUUID()

    // Check if this request_id already has an adoption log
    const existing = await db
      .select()
      .from(adoptionLogs)
      .where(and(
        eq(adoptionLogs.request_id, report.request_id),
        eq(adoptionLogs.user_id, report.user_id)
      ))
      .get()

    if (existing) {
      // Update existing
      await db.update(adoptionLogs)
        .set({ status: report.status })
        .where(eq(adoptionLogs.id, existing.id))
    } else {
      // Insert new
      await db.insert(adoptionLogs).values({
        id,
        user_id: report.user_id,
        request_id: report.request_id,
        status: report.status
      })
    }

    return id
  },

  async getMyUsage(params: MyUsageParams): Promise<MyUsageResult> {
    const { userId, period = 'month' } = params

    // Determine date range
    const now = new Date()
    const startDate = new Date(now)
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7)
    } else {
      startDate.setMonth(startDate.getMonth() - 1)
    }
    const startDateStr = startDate.toISOString().split('T')[0]

    // Total requests in period
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.user_id, userId),
        gte(auditLogs.created_at, startDateStr)
      ))
      .get()

    // Requests today
    const today = now.toISOString().split('T')[0]
    const todayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.user_id, userId),
        gte(auditLogs.created_at, today)
      ))
      .get()

    // Get adoption statuses for recent requests
    const recentLogs = await db
      .select({
        id: auditLogs.id,
        prompt_summary: auditLogs.prompt_summary,
        risk_level: auditLogs.risk_level,
        created_at: auditLogs.created_at
      })
      .from(auditLogs)
      .where(eq(auditLogs.user_id, userId))
      .orderBy(desc(auditLogs.created_at))
      .limit(20)
      .all()

    // Get adoption status for each
    const recentWithStatus = await Promise.all(
      recentLogs.map(async (log) => {
        const adoption = await db
          .select()
          .from(adoptionLogs)
          .where(eq(adoptionLogs.request_id, log.id))
          .get()

        return {
          id: log.id,
          prompt_summary: log.prompt_summary || '',
          risk_level: log.risk_level || 'low',
          status: adoption?.status || 'pending',
          created_at: log.created_at
        }
      })
    )

    // Build trend (group by date)
    const trendMap = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      trendMap.set(key, 0)
    }

    // Aggregate by date (simplified - just count logs per day)
    // In production you'd want a proper GROUP BY query
    const allLogs = await db
      .select({ created_at: auditLogs.created_at })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.user_id, userId),
        gte(auditLogs.created_at, startDateStr)
      ))
      .all()

    for (const log of allLogs) {
      const date = (log.created_at || '').split('T')[0]
      if (trendMap.has(date)) {
        trendMap.set(date, (trendMap.get(date) || 0) + 1)
      }
    }

    const trend = Array.from(trendMap.entries())
      .map(([date, requests]) => ({ date, requests }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14) // Last 14 days

    return {
      total_requests: totalResult?.count || 0,
      quota: 500, // Default quota
      requests_today: todayResult?.count || 0,
      trend,
      recent_requests: recentWithStatus
    }
  }
}
