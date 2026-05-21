-- SOF-8: agent-runner skeleton + per-call token accounting.
-- All tenant-scoped tables carry tenant_region per ADR-001.

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tenant_region TEXT NOT NULL,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','in_progress','succeeded','failed')),
  token_budget INTEGER NOT NULL,
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cached_tokens INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  input_messages JSONB NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS runs_tenant_status_idx ON runs (tenant_id, status);
CREATE INDEX IF NOT EXISTS runs_status_created_idx ON runs (status, created_at);

CREATE TABLE IF NOT EXISTS model_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tenant_region TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS model_calls_run_idx ON model_calls (run_id);
CREATE INDEX IF NOT EXISTS model_calls_tenant_created_idx ON model_calls (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tenant_region TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  error_code TEXT,
  error_message TEXT,
  latency_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tool_calls_run_idx ON tool_calls (run_id);
CREATE INDEX IF NOT EXISTS tool_calls_tenant_created_idx ON tool_calls (tenant_id, created_at DESC);
