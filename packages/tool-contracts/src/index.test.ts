import { describe, it, expect } from 'vitest';
import { runJobSchema } from './index.js';

describe('tool-contracts smoke', () => {
  it('runJobSchema has required fields', () => {
    expect(runJobSchema.required).toContain('tool');
    expect(runJobSchema.required).toContain('input');
  });
});
