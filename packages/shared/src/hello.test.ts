import { describe, it, expect } from 'vitest';
import { greet } from './index.js';

describe('greet hello-world smoke', () => {
  it('greets sof', () => {
    expect(greet('sof')).toBe('hello, sof');
  });
});
