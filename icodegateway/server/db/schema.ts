
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

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  request_id: text('request_id').notNull(),
  user_id: text('user_id').references(() => users.id),
  device_id: text('device_id').references(() => devices.id),
  action: text('action').notNull(), // chat_completion, adoption_report
  prompt_summary: text('prompt_summary'),
  risk_level: text('risk_level').default('low'), // low, medium, high
  metadata: text('metadata'), // JSON string
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
