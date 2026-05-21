// Public surface of the agent-runner. The run loop is the only contract
// downstream services (SOF-15 MCP toolbelt, SOF-17 PR cost telemetry,
// SOF-11 demo) should depend on.

export { runAgent } from './runLoop.js';
export type { AgentRun, RunLoopOptions, RunLoopResult } from './runLoop.js';
export { ToolRegistry } from './tools.js';
export { InMemoryRecordSink, totalsFromUsage } from './sink.js';
export type {
  RecordSink,
  ModelCallRecord,
  ToolCallRecord,
  RunStatus,
  RunStateUpdate,
} from './sink.js';
export type {
  ModelClient,
  ModelRequest,
  ModelResponse,
  ModelMessage,
  ModelContentBlock,
  ModelUsage,
  ToolDescriptor,
  StopReason,
} from './modelClient.js';
export { createAnthropicModelClient } from './modelClient.js';

// Convenience for the smoke binary / future CLI. Left as a stub until the
// Postgres-backed sink + Anthropic key wiring lands in a follow-up; the run
// loop itself is fully exercised by the smoke test.
export const main = (): void => {
  console.warn('agent-runner: invoke runAgent() with a ModelClient + RecordSink.');
};
