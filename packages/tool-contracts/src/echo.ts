import type { ToolDefinition } from './types.js';

export interface EchoInput {
  message: string;
}

export interface EchoOutput {
  echoed: string;
}

export const echoTool: ToolDefinition<EchoInput, EchoOutput> = {
  name: 'echo',
  description:
    'Echoes back the input message verbatim. Useful as a no-op tool for smoke testing the agent run loop.',
  inputSchema: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string', description: 'The string to echo back.' },
    },
    additionalProperties: false,
  },
  handler: async (input) => ({ echoed: input.message }),
};
