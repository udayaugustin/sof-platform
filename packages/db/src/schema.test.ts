import { describe, it, expect } from 'vitest';
import { tenants, runs, model_calls, tool_calls } from './schema.js';

describe('db schema', () => {
  it('every tenant-scoped table carries tenant_region (ADR-001)', () => {
    expect(tenants.tenant_region).toBeDefined();
    expect(runs.tenant_region).toBeDefined();
    expect(model_calls.tenant_region).toBeDefined();
    expect(tool_calls.tenant_region).toBeDefined();
  });

  it('model_calls captures the per-call token accounting columns from SOF-8', () => {
    expect(model_calls.input_tokens).toBeDefined();
    expect(model_calls.output_tokens).toBeDefined();
    expect(model_calls.cached_tokens).toBeDefined();
    expect(model_calls.latency_ms).toBeDefined();
    expect(model_calls.model_id).toBeDefined();
    expect(model_calls.run_id).toBeDefined();
    expect(model_calls.tenant_id).toBeDefined();
  });

  it('tool_calls captures structured input/output + error shape', () => {
    expect(tool_calls.input).toBeDefined();
    expect(tool_calls.output).toBeDefined();
    expect(tool_calls.error_code).toBeDefined();
    expect(tool_calls.error_message).toBeDefined();
  });

  it('runs carries the budget + totals needed for budget enforcement', () => {
    expect(runs.token_budget).toBeDefined();
    expect(runs.total_input_tokens).toBeDefined();
    expect(runs.total_output_tokens).toBeDefined();
    expect(runs.failure_reason).toBeDefined();
  });
});
