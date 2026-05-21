import { describe, it, expect } from 'vitest';
import { echoTool } from '@sof/tool-contracts';
import {
  InMemoryRecordSink,
  ToolRegistry,
  runAgent,
  type AgentRun,
  type ModelClient,
  type ModelRequest,
  type ModelResponse,
} from './index.js';

// Deterministic 2-turn transcript:
//   turn 1 — assistant requests echo({message:"hello"}), stop_reason=tool_use
//   turn 2 — assistant returns text("done"), stop_reason=end_turn
const twoTurnEchoClient = (): ModelClient => {
  let turn = 0;
  return {
    async complete(_req: ModelRequest): Promise<ModelResponse> {
      turn++;
      if (turn === 1) {
        return {
          content: [{ type: 'tool_use', id: 'toolu_1', name: 'echo', input: { message: 'hello' } }],
          usage: { input_tokens: 100, output_tokens: 50, cached_tokens: 0 },
          stop_reason: 'tool_use',
        };
      }
      return {
        content: [{ type: 'text', text: 'done' }],
        usage: { input_tokens: 120, output_tokens: 10, cached_tokens: 0 },
        stop_reason: 'end_turn',
      };
    },
  };
};

const makeRun = (overrides: Partial<AgentRun> = {}): AgentRun => ({
  id: '11111111-1111-1111-1111-111111111111',
  tenant_id: '22222222-2222-2222-2222-222222222222',
  tenant_region: 'us-east-1',
  model_id: 'claude-opus-4-7',
  token_budget: 10_000,
  input_messages: [{ role: 'user', content: [{ type: 'text', text: 'echo "hello"' }] }],
  ...overrides,
});

const newRegistry = (): ToolRegistry => {
  const r = new ToolRegistry();
  r.register(echoTool);
  return r;
};

describe('agent-runner smoke — 2-turn echo run', () => {
  it('completes a 2-turn run and produces the expected accounting rows', async () => {
    const sink = new InMemoryRecordSink();
    const run = makeRun();

    let t = 1_000_000;
    const result = await runAgent({
      run,
      modelClient: twoTurnEchoClient(),
      tools: newRegistry(),
      sink,
      now: () => (t += 25),
    });

    // Run outcome
    expect(result.status).toBe('succeeded');
    expect(result.failure_reason).toBeNull();
    expect(result.turns).toBe(2);
    expect(result.total_input_tokens).toBe(220);
    expect(result.total_output_tokens).toBe(60);

    // One model_call row per turn, with ADR-001 tenant_region carried through.
    expect(sink.modelCalls).toHaveLength(2);
    for (const m of sink.modelCalls) {
      expect(m.run_id).toBe(run.id);
      expect(m.tenant_id).toBe(run.tenant_id);
      expect(m.tenant_region).toBe('us-east-1');
      expect(m.model_id).toBe('claude-opus-4-7');
      expect(typeof m.latency_ms).toBe('number');
      expect(m.latency_ms).toBeGreaterThanOrEqual(0);
    }
    expect(sink.modelCalls[0]).toMatchObject({
      input_tokens: 100,
      output_tokens: 50,
      cached_tokens: 0,
    });
    expect(sink.modelCalls[1]).toMatchObject({
      input_tokens: 120,
      output_tokens: 10,
      cached_tokens: 0,
    });

    // Exactly one tool_call row for the echo dispatch, with structured input/output.
    expect(sink.toolCalls).toHaveLength(1);
    expect(sink.toolCalls[0]).toMatchObject({
      run_id: run.id,
      tenant_id: run.tenant_id,
      tenant_region: 'us-east-1',
      tool_name: 'echo',
      input: { message: 'hello' },
      output: { echoed: 'hello' },
      error_code: null,
      error_message: null,
    });

    // Run state transitioned through in_progress → succeeded with totals captured.
    const statuses = sink.runPatches.map((p) => p.patch.status).filter(Boolean);
    expect(statuses).toContain('in_progress');
    expect(statuses).toContain('succeeded');
    const final = sink.runPatches[sink.runPatches.length - 1].patch;
    expect(final.status).toBe('succeeded');
    expect(final.finished_at).toBeInstanceOf(Date);
  });

  it('stops with budget_exceeded when the first model call blows the budget', async () => {
    const sink = new InMemoryRecordSink();
    const run = makeRun({ token_budget: 100 }); // first turn returns 150 tokens

    const result = await runAgent({
      run,
      modelClient: twoTurnEchoClient(),
      tools: newRegistry(),
      sink,
    });

    expect(result.status).toBe('failed');
    expect(result.failure_reason).toBe('budget_exceeded');
    expect(result.turns).toBe(1);
    expect(sink.modelCalls).toHaveLength(1);
    expect(sink.toolCalls).toHaveLength(0); // never reached tool dispatch
    const finalPatch = sink.runPatches[sink.runPatches.length - 1].patch;
    expect(finalPatch.status).toBe('failed');
    expect(finalPatch.failure_reason).toBe('budget_exceeded');
  });

  it('records an unknown_tool error when the model requests a tool that is not registered', async () => {
    const sink = new InMemoryRecordSink();
    const run = makeRun();

    const client: ModelClient = {
      async complete() {
        return {
          content: [{ type: 'tool_use', id: 'toolu_x', name: 'not_real', input: { foo: 'bar' } }],
          usage: { input_tokens: 5, output_tokens: 5, cached_tokens: 0 },
          stop_reason: 'tool_use',
        };
      },
    };

    const result = await runAgent({ run, modelClient: client, tools: newRegistry(), sink });

    expect(result.status).toBe('failed');
    expect(result.failure_reason).toBe('unknown_tool');
    expect(sink.toolCalls).toHaveLength(1);
    expect(sink.toolCalls[0]).toMatchObject({
      tool_name: 'not_real',
      error_code: 'unknown_tool',
      output: null,
    });
    expect(sink.toolCalls[0].error_message).toContain('not_real');
  });
});
