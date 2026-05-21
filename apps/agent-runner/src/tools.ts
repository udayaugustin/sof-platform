import type { ToolDefinition } from '@sof/tool-contracts';
import type { ToolDescriptor } from './modelClient.js';

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register<I, O>(tool: ToolDefinition<I, O>): void {
    this.tools.set(tool.name, tool as ToolDefinition);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  describe(): ToolDescriptor[] {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as unknown as Record<string, unknown>,
    }));
  }
}
