import * as openai from "./openai.ts";
import * as anthropic from "./anthropic.ts";
import { ProviderError } from "./types.ts";
import type { ChatRequest, FailureReason, ModelConnection, StreamEvent } from "./types.ts";

export * from "./types.ts";
export * from "./presets.ts";

const adapters = { openai, anthropic };

export function streamChat(conn: ModelConnection, req: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  return adapters[conn.protocol].streamChat(conn, req, signal);
}

export function listModels(conn: ModelConnection, signal?: AbortSignal): Promise<string[]> {
  return adapters[conn.protocol].listModels(conn, signal);
}

export type ConnectionTest =
  | { ok: true; models: string[] }
  | { ok: false; reason: FailureReason; detail: string };

/**
 * "Test" button: can we reach the server with this key, and which models does it offer?
 * Never throws; the UI turns `reason` into a plain sentence.
 */
export async function testConnection(conn: Omit<ModelConnection, "model">, timeoutMs = 15000): Promise<ConnectionTest> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return { ok: true, models: await listModels({ ...conn, model: "" }, signal) };
  } catch (e) {
    if (e instanceof ProviderError) return { ok: false, reason: e.reason, detail: e.message };
    if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") return { ok: false, reason: "no-network", detail: "No answer within 15 seconds." };
    return { ok: false, reason: "bad-response", detail: String((e as Error).message ?? e) };
  }
}
