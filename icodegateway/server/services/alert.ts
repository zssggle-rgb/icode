import { db } from '../db'
import { alerts } from '../db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import crypto from 'crypto'

export type AlertType = 'cross_project_attempt' | 'high_risk_keyword' | 'high_risk_leakage'
export type AlertStatus = 'pending' | 'resolved'

export interface AlertDetail {
  prompt_summary?: string
  target_repo?: string
  user_permission?: string
  keyword?: string
  risk_level?: string
  response_summary?: string
  [key: string]: any
}

export interface Alert {
  id: string
  type: AlertType
  user_id: string
  device_id?: string
  status: AlertStatus
  detail: AlertDetail
  created_at: string
  resolved_by?: string
  resolved_at?: string
  note?: string
}

export interface CreateAlertParams {
  type: AlertType
  user_id: string
  device_id?: string
  detail: AlertDetail
}

export interface AlertQuery {
  status?: AlertStatus
  page?: number
  pageSize?: number
}

export interface PaginatedAlerts {
  alerts: Alert[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

export const AlertService = {
  async create(params: CreateAlertParams): Promise<string> {
    const id = crypto.randomUUID()

    await db.insert(alerts).values({
      id,
      type: params.type,
      user_id: params.user_id,
      device_id: params.device_id || null,
      status: 'pending',
      detail: JSON.stringify(params.detail)
    })

    return id
  },

  async resolve(alertId: string, resolvedBy: string, note?: string) {
    const now = new Date().toISOString()

    await db.update(alerts)
      .set({
        status: 'resolved',
        resolved_by: resolvedBy,
        resolved_at: now,
        note: note || null
      })
      .where(eq(alerts.id, alertId))
  },

  async query(params: AlertQuery = {}): Promise<PaginatedAlerts> {
    const page = params.page || 1
    const pageSize = Math.min(params.pageSize || 50, 100)

    const conditions = []
    if (params.status) {
      conditions.push(eq(alerts.status, params.status))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(whereClause)
      .get()

    const total = totalResult?.count || 0
    const totalPages = Math.ceil(total / pageSize)

    const offset = (page - 1) * pageSize
    const rows = await db
      .select()
      .from(alerts)
      .where(whereClause)
      .orderBy(desc(alerts.created_at))
      .limit(pageSize)
      .offset(offset)
      .all()

    // Parse detail JSON
    const parsedAlerts: Alert[] = rows.map(row => ({
      ...row,
      detail: (() => {
        try {
          return JSON.parse(row.detail as string)
        } catch {
          return {}
        }
      })()
    }))

    return {
      alerts: parsedAlerts,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages
      }
    }
  }
}
