import { describe, it, expect } from 'vitest';
import { runJobSchema, echoTool } from './index.js';

describe('tool-contracts', () => {
  it('runJobSchema has required fields', () => {
    expect(runJobSchema.required).toContain('tool');
    expect(runJobSchema.required).toContain('input');
  });

  it('echo tool returns the input message', async () => {
    const result = await echoTool.handler({ message: 'hello' });
    expect(result).toEqual({ echoed: 'hello' });
  });

  it('echo tool input schema rejects extra props by contract', () => {
    expect(echoTool.inputSchema.additionalProperties).toBe(false);
    expect(echoTool.inputSchema.required).toContain('message');
  });
});
