import runJobSchema from '../schemas/run-job.json' assert { type: 'json' };

export { runJobSchema };

export interface ToolContract {
  tool: string;
  input: Record<string, unknown>;
  tenant_region?: string;
}
