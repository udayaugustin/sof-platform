// MCP-style tool contract used by agent-runner and downstream toolbelt (SOF-15).
// Tools register a name, JSON-schema input, and a handler that returns either
// a typed output or a structured error. The contract is intentionally narrow:
// downstream code should not invent its own tool shape.

export interface JsonSchema {
  type: string;
  required?: readonly string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean;
  description?: string;
  [key: string]: unknown;
}

export interface ToolDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (input: I) => Promise<O>;
}

export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ToolCallResult<O = unknown> = { ok: true; output: O } | { ok: false; error: ToolError };

export const toolError = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ToolError => ({
  code,
  message,
  ...(details ? { details } : {}),
});
