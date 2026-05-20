// RecordSink is the narrow contract for persisting per-call accounting and
// run-state transitions. The Postgres implementation writes to the
// runs/model_calls/tool_calls tables defined in @sof/db. Tests use the
// InMemoryRecordSink so the run loop can be exercised offline while still
// asserting the exact row shape required by SOF-8.

import type { ModelUsage } from './modelClient.js';

export interface ModelCallRecord {
  run_id: string;
  tenant_id: string;
  tenant_region: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  latency_ms: number;
}

export interface ToolCallRecord {
  run_id: string;
  tenant_id: string;
  tenant_region: string;
  tool_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number;
}

export type RunStatus = 'pending' | 'in_progress' | 'succeeded' | 'failed';

export interface RunStateUpdate {
  status?: RunStatus;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cached_tokens?: number;
  failure_reason?: string | null;
  started_at?: Date | null;
  finished_at?: Date | null;
}

export interface RecordSink {
  recordModelCall(row: ModelCallRecord): Promise<void>;
  recordToolCall(row: ToolCallRecord): Promise<void>;
  updateRun(run_id: string, patch: RunStateUpdate): Promise<void>;
}

// Used in tests and by the smoke harness. Production code points to a
// Postgres-backed sink that inserts the same rows.
export class InMemoryRecordSink implements RecordSink {
  readonly modelCalls: ModelCallRecord[] = [];
  readonly toolCalls: ToolCallRecord[] = [];
  readonly runPatches: Array<{ run_id: string; patch: RunStateUpdate }> = [];

  async recordModelCall(row: ModelCallRecord): Promise<void> {
    this.modelCalls.push(row);
  }

  async recordToolCall(row: ToolCallRecord): Promise<void> {
    this.toolCalls.push(row);
  }

  async updateRun(run_id: string, patch: RunStateUpdate): Promise<void> {
    this.runPatches.push({ run_id, patch });
  }
}

export const totalsFromUsage = (
  usage: ModelUsage,
): Pick<ModelCallRecord, 'input_tokens' | 'output_tokens' | 'cached_tokens'> => ({
  input_tokens: usage.input_tokens,
  output_tokens: usage.output_tokens,
  cached_tokens: usage.cached_tokens,
});
