import runJobSchema from '../schemas/run-job.json' with { type: 'json' };

export { runJobSchema };
export * from './types.js';
export * from './echo.js';

// Run-job envelope used to submit work to the agent-runner. Kept narrow on purpose:
// the contract is what crosses process / service boundaries.
export interface ToolContract {
  tool: string;
  input: Record<string, unknown>;
  tenant_region?: string;
}
