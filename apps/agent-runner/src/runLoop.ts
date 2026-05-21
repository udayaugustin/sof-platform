// Run loop: drives the model + tool dialogue and writes per-call accounting.
//
// Contract:
//   - Each model call emits one model_call row (input_tokens, output_tokens,
//     cached_tokens, latency_ms, model_id, run_id, tenant_id, tenant_region).
//   - Each tool call emits one tool_call row with structured input/output and
//     a typed error shape (error_code + error_message) when the tool throws.
//   - A hard per-run token budget is enforced after every model call. If the
//     running total exceeds run.token_budget the run is marked failed with
//     failure_reason = 'budget_exceeded' and the loop exits without calling
//     the model again.
//   - Other terminal reasons: 'max_turns', 'unknown_tool', or whatever the
//     model reports as stop_reason on a successful end_turn.

import type { ModelClient, ModelContentBlock, ModelMessage, ModelResponse } from './modelClient.js';
import type { RecordSink, RunStatus } from './sink.js';
import type { ToolRegistry } from './tools.js';

export interface AgentRun {
  id: string;
  tenant_id: string;
  tenant_region: string;
  model_id: string;
  token_budget: number;
  // Initial user message(s). The loop appends assistant + tool turns.
  input_messages: ModelMessage[];
}

export interface RunLoopOptions {
  run: AgentRun;
  modelClient: ModelClient;
  tools: ToolRegistry;
  sink: RecordSink;
  maxTurns?: number;
  maxOutputTokens?: number;
  now?: () => number; // injectable clock for deterministic tests
}

export interface RunLoopResult {
  status: Exclude<RunStatus, 'pending' | 'in_progress'>;
  failure_reason: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
  turns: number;
}

const DEFAULT_MAX_TURNS = 8;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

export const runAgent = async (opts: RunLoopOptions): Promise<RunLoopResult> => {
  const { run, modelClient, tools, sink } = opts;
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  const maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  const now = opts.now ?? Date.now;

  const messages: ModelMessage[] = [...run.input_messages];
  let total_input_tokens = 0;
  let total_output_tokens = 0;
  let total_cached_tokens = 0;
  let turns = 0;

  await sink.updateRun(run.id, { status: 'in_progress', started_at: new Date(now()) });

  for (turns = 1; turns <= maxTurns; turns++) {
    const started = now();
    let response: ModelResponse;
    try {
      response = await modelClient.complete({
        model: run.model_id,
        messages,
        tools: tools.describe(),
        maxOutputTokens,
      });
    } catch (err) {
      const finished = now();
      await sink.updateRun(run.id, {
        status: 'failed',
        failure_reason: 'model_error',
        finished_at: new Date(finished),
        total_input_tokens,
        total_output_tokens,
        total_cached_tokens,
      });
      return failure(
        'model_error',
        total_input_tokens,
        total_output_tokens,
        total_cached_tokens,
        turns,
        err,
      );
    }
    const finished = now();

    await sink.recordModelCall({
      run_id: run.id,
      tenant_id: run.tenant_id,
      tenant_region: run.tenant_region,
      model_id: run.model_id,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cached_tokens: response.usage.cached_tokens,
      latency_ms: finished - started,
    });

    total_input_tokens += response.usage.input_tokens;
    total_output_tokens += response.usage.output_tokens;
    total_cached_tokens += response.usage.cached_tokens;

    // Persist running totals so the row reflects partial progress even if
    // the process dies mid-loop.
    await sink.updateRun(run.id, {
      total_input_tokens,
      total_output_tokens,
      total_cached_tokens,
    });

    // Hard budget check — runs the moment the model returns, before any
    // further tool work or another model call.
    if (total_input_tokens + total_output_tokens > run.token_budget) {
      await sink.updateRun(run.id, {
        status: 'failed',
        failure_reason: 'budget_exceeded',
        finished_at: new Date(finished),
      });
      return failure(
        'budget_exceeded',
        total_input_tokens,
        total_output_tokens,
        total_cached_tokens,
        turns,
      );
    }

    // Append the assistant turn so the next model call sees the same history.
    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter(
      (b): b is Extract<ModelContentBlock, { type: 'tool_use' }> => b.type === 'tool_use',
    );

    if (response.stop_reason === 'end_turn' || toolUses.length === 0) {
      await sink.updateRun(run.id, {
        status: 'succeeded',
        failure_reason: null,
        finished_at: new Date(finished),
      });
      return {
        status: 'succeeded',
        failure_reason: null,
        total_input_tokens,
        total_output_tokens,
        total_cached_tokens,
        turns,
      };
    }

    // Dispatch every tool_use block from this turn and reply with one tool_result each.
    const toolResults: ModelContentBlock[] = [];
    for (const toolUse of toolUses) {
      const tool = tools.get(toolUse.name);
      const toolStarted = now();

      if (!tool) {
        const toolFinished = now();
        await sink.recordToolCall({
          run_id: run.id,
          tenant_id: run.tenant_id,
          tenant_region: run.tenant_region,
          tool_name: toolUse.name,
          input: toolUse.input,
          output: null,
          error_code: 'unknown_tool',
          error_message: `No tool registered with name "${toolUse.name}"`,
          latency_ms: toolFinished - toolStarted,
        });
        await sink.updateRun(run.id, {
          status: 'failed',
          failure_reason: 'unknown_tool',
          finished_at: new Date(toolFinished),
        });
        return failure(
          'unknown_tool',
          total_input_tokens,
          total_output_tokens,
          total_cached_tokens,
          turns,
        );
      }

      let output: Record<string, unknown> | null = null;
      let error_code: string | null = null;
      let error_message: string | null = null;
      try {
        output = (await tool.handler(toolUse.input)) as Record<string, unknown>;
      } catch (err) {
        error_code = 'tool_error';
        error_message = err instanceof Error ? err.message : String(err);
      }
      const toolFinished = now();

      await sink.recordToolCall({
        run_id: run.id,
        tenant_id: run.tenant_id,
        tenant_region: run.tenant_region,
        tool_name: toolUse.name,
        input: toolUse.input,
        output,
        error_code,
        error_message,
        latency_ms: toolFinished - toolStarted,
      });

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(
          error_code ? { error: { code: error_code, message: error_message } } : output,
        ),
        ...(error_code ? { is_error: true } : {}),
      });
    }

    messages.push({ role: 'tool', content: toolResults });
  }

  // Hit max turns without an end_turn.
  await sink.updateRun(run.id, {
    status: 'failed',
    failure_reason: 'max_turns',
    finished_at: new Date(now()),
  });
  return failure(
    'max_turns',
    total_input_tokens,
    total_output_tokens,
    total_cached_tokens,
    maxTurns,
  );
};

const failure = (
  failure_reason: string,
  total_input_tokens: number,
  total_output_tokens: number,
  total_cached_tokens: number,
  turns: number,
  _cause?: unknown,
): RunLoopResult => ({
  status: 'failed',
  failure_reason,
  total_input_tokens,
  total_output_tokens,
  total_cached_tokens,
  turns,
});
