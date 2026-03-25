import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').default('developer').notNull(), // developer, admin
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  fingerprint: text('fingerprint').notNull().unique(),
  user_id: text('user_id').references(() => users.id),
  status: text('status').default('active').notNull(), // active, blocked
  last_seen_at: text('last_seen_at'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  user_id: text('user_id').references(() => users.id).notNull(),
  device_id: text('device_id').references(() => devices.id),
  project_id: text('project_id'),
  repo_id: text('repo_id'),
  expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Enhanced audit_logs with new fields per API Contract
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  request_id: text('request_id').notNull(),
  user_id: text('user_id').references(() => users.id),
  device_id: text('device_id').references(() => devices.id),
  action: text('action').notNull(), // chat_completion, adoption_report, tool_call, policy_change
  prompt_summary: text('prompt_summary'),
  response_summary: text('response_summary'), // NEW: AI response summary, max 500 chars
  risk_level: text('risk_level').default('low'), // low, medium, high
  cross_project_attempt: integer('cross_project_attempt').default(0), // NEW: 0/1 boolean
  model_name: text('model_name'), // NEW: e.g. glm-5
  provider: text('provider'), // NEW: dashscope/ollama/zhipu
  duration_ms: integer('duration_ms'), // NEW: request duration
  metadata: text('metadata'), // JSON string
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const agentIdentities = sqliteTable('agent_identities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'AI Agent', 'Service Account', etc.
  risk_score: integer('risk_score').default(0),
  status: text('status').default('online'), // 'online', 'warning', 'offline'
  description: text('description'),
  last_active: text('last_active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const agentToolCalls = sqliteTable('agent_tool_calls', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id').references(() => agentIdentities.id),
  request_id: text('request_id').notNull(),
  tool_name: text('tool_name').notNull(),
  target_resource: text('target_resource'), // e.g. file path or db name
  action_type: text('action_type'), // e.g. 'Read', 'Write', 'Execute'
  duration_ms: integer('duration_ms'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// NEW: alerts table per API Contract
export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'cross_project_attempt' | 'high_risk_keyword' | 'high_risk_leakage'
  user_id: text('user_id').notNull(),
  device_id: text('device_id'),
  status: text('status').default('pending'), // 'pending' | 'resolved'
  detail: text('detail').notNull(), // JSON string with type-specific fields
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  resolved_by: text('resolved_by'),
  resolved_at: text('resolved_at'),
  note: text('note'),
});

// NEW: policy_audit table per API Contract
export const policyAudit = sqliteTable('policy_audit', {
  id: text('id').primaryKey(),
  admin_user_id: text('admin_user_id').notNull(),
  action: text('action').notNull(), // 'update' | 'reload'
  old_policy: text('old_policy'),
  new_policy: text('new_policy'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// NEW: adoption tracking
export const adoptionLogs = sqliteTable('adoption_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  request_id: text('request_id').notNull(),
  status: text('status').notNull(), // 'adopted' | 'rejected' | 'modified'
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
