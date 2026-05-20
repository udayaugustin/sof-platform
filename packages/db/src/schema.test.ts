import { describe, it, expect } from 'vitest';
import { tenants } from './schema.js';

describe('db schema smoke', () => {
  it('tenants table has tenant_region column', () => {
    expect(tenants.tenant_region).toBeDefined();
  });
});
