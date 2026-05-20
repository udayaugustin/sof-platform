// ModelClient is the narrow contract the run loop talks to.
// The default implementation wraps the Anthropic SDK and converts its
// response shape into ModelResponse. Tests inject a deterministic mock so
// the loop is exercised without network or API-key dependency.

export interface ModelMessage {
  role: 'user' | 'assistant' | 'tool';
  // content is intentionally permissive — assistant turns may carry text +
  // tool_use blocks; tool turns carry tool_result blocks; user turns carry text.
  content: ModelContentBlock[];
}

export type ModelContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ModelRequest {
  model: string;
  messages: ModelMessage[];
  tools: ToolDescriptor[];
  maxOutputTokens: number;
}

export interface ModelUsage {
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';

export interface ModelResponse {
  content: ModelContentBlock[];
  usage: ModelUsage;
  stop_reason: StopReason;
}

export interface ModelClient {
  complete(req: ModelRequest): Promise<ModelResponse>;
}

// Anthropic SDK adapter is wired lazily so this package can be type-checked
// and tested without the SDK installed. Importers that want the real client
// can install @anthropic-ai/sdk and call createAnthropicModelClient() with a
// key from env. Until the API key is provisioned (SOF-8 wake comment), the
// default code path uses the injected ModelClient and never reaches here.
export const createAnthropicModelClient = (_opts: { apiKey: string }): ModelClient => {
  // Intentionally a placeholder: the real wiring lands when ANTHROPIC_API_KEY
  // is provisioned. Throwing here keeps the call site honest — callers must
  // provide a ModelClient (mock or real) at run start.
  throw new Error(
    'Anthropic SDK adapter is not wired yet. Provision ANTHROPIC_API_KEY (SOF-8) and install @anthropic-ai/sdk, then implement createAnthropicModelClient.',
  );
};
