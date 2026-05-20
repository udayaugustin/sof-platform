import { pgTable, uuid, text, timestamp, integer, jsonb, bigint } from 'drizzle-orm/pg-core';

// tenant_region is a required schema invariant per ADR-001.
// Every tenant-scoped table MUST carry tenant_region (NOT NULL) and writes must
// match the tenant's region — enforced at the application layer for now.

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tenant_region: text('tenant_region').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// A `run` is one execution of the agent loop on behalf of a tenant. The runner
// claims a row, drives the model + tool loop, and writes per-call accounting
// to model_calls / tool_calls. The token_budget column is the hard cap; if
// total_input_tokens + total_output_tokens exceeds it the run is marked
// failed with failure_reason = 'budget_exceeded'.
export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull(),
  tenant_region: text('tenant_region').notNull(),
  model_id: text('model_id').notNull(),
  status: text('status').notNull(), // pending | in_progress | succeeded | failed
  token_budget: integer('token_budget').notNull(),
  total_input_tokens: integer('total_input_tokens').notNull().default(0),
  total_output_tokens: integer('total_output_tokens').notNull().default(0),
  total_cached_tokens: integer('total_cached_tokens').notNull().default(0),
  failure_reason: text('failure_reason'), // null when succeeded; otherwise a structured code
  input_messages: jsonb('input_messages').notNull(),
  started_at: timestamp('started_at'),
  finished_at: timestamp('finished_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const model_calls = pgTable('model_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  run_id: uuid('run_id').notNull(),
  tenant_id: uuid('tenant_id').notNull(),
  tenant_region: text('tenant_region').notNull(),
  model_id: text('model_id').notNull(),
  input_tokens: integer('input_tokens').notNull(),
  output_tokens: integer('output_tokens').notNull(),
  cached_tokens: integer('cached_tokens').notNull().default(0),
  latency_ms: bigint('latency_ms', { mode: 'number' }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const tool_calls = pgTable('tool_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  run_id: uuid('run_id').notNull(),
  tenant_id: uuid('tenant_id').notNull(),
  tenant_region: text('tenant_region').notNull(),
  tool_name: text('tool_name').notNull(),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  error_code: text('error_code'),
  error_message: text('error_message'),
  latency_ms: bigint('latency_ms', { mode: 'number' }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type ModelCall = typeof model_calls.$inferSelect;
export type NewModelCall = typeof model_calls.$inferInsert;
export type ToolCall = typeof tool_calls.$inferSelect;
export type NewToolCall = typeof tool_calls.$inferInsert;
