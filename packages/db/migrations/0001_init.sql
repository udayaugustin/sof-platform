-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Initial tenant-scoped table (tenant_region is required per ADR-001)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tenant_region TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
