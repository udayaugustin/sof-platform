import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

// tenant_region is a required schema invariant per ADR-001
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tenant_region: text('tenant_region').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
