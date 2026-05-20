import { describe, it, expect } from 'vitest';
import { startWorker } from './index.js';

describe('worker smoke', () => {
  it('startWorker is callable', () => {
    expect(() => startWorker()).not.toThrow();
  });
});
