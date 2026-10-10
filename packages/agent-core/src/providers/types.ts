// Provider-neutral shapes. Adapters translate these to each API's format.
// Note: this package runs as TypeScript directly in Node/Electron (type stripping),
// so use only erasable syntax: no enums, namespaces or parameter properties.

/** The wire format a provider speaks. Almost everything speaks "openai". */
export type Protocol = "openai" | "anthropic";

export interface ModelConnection {
  protocol: Protocol;
  /** e.g. https://api.openai.com/v1 (openai) or https://api.anthropic.com (anthropic) */
  baseUrl: string;
  apiKey?: string;
  model: string;
  /** Ask for token usage in the stream (OpenAI-style providers that support it). */
  usageInStream?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the arguments. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON text as produced by the model; parse it (it can be invalid). */
  arguments: string;
}

export type ContentPart = { type: "text"; text: string } | { type: "image"; mediaType: string; base64: string };

export type ChatMessage =
  | { role: "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string; isError?: boolean };

export interface ChatRequest {
  system?: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
}

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool-call"; call: ToolCall }
  /** A tool call still streaming in: its name and the arguments so far (partial JSON). */
  | { type: "tool-progress"; name: string; partial: string }
  | { type: "done"; stopReason: "end" | "tool-calls" | "max-tokens" | "other"; usage?: Usage };

/** Why a connection failed, in categories the UI can explain in plain words. */
export type FailureReason = "no-network" | "bad-key" | "not-found" | "rate-limited" | "server" | "bad-response";

export class ProviderError extends Error {
  readonly reason: FailureReason;
  readonly status?: number;
  constructor(reason: FailureReason, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.reason = reason;
    this.status = status;
  }
}

export function reasonForStatus(status: number): FailureReason {
  if (status === 401 || status === 403) return "bad-key";
  if (status === 404) return "not-found";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server";
  return "bad-response";
}
