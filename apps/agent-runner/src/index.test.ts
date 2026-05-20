import { describe, it, expect } from 'vitest';

describe('agent-runner smoke', () => {
  it('module loads without error', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
  });
});
