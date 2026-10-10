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

// Models in a provider's list that can't chat (embeddings, rerankers, safety filters, speech, images).
const NOT_CHAT = /embed|rerank|reward|guard|safety|moderation|clip|whisper|parakeet|canary|tts|asr|speech|audio|ocr|retriever|nv-?embed|bge-|e5-|sdxl|stable-diffusion|flux|image-gen|dall-e/i;

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
    const all = await listModels({ ...conn, model: "" }, signal);
    const chat = all.filter((id) => !NOT_CHAT.test(id));
    return { ok: true, models: chat.length ? chat : all };
  } catch (e) {
    if (e instanceof ProviderError) return { ok: false, reason: e.reason, detail: e.message };
    if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") return { ok: false, reason: "no-network", detail: "No answer within 15 seconds." };
    return { ok: false, reason: "bad-response", detail: String((e as Error).message ?? e) };
  }
}

export type ModelCheck = { ok: true } | { ok: false; reason: FailureReason; detail: string };

/**
 * Before saving a model: one tiny request with a tool attached. Catches models that this key
 * can't use, and models that can't use tools (the agent needs them). Never throws.
 */
export async function checkModel(conn: ModelConnection, timeoutMs = 30000): Promise<ModelCheck> {
  const signal = AbortSignal.timeout(timeoutMs);
  const tool = { name: "say_ok", description: "Reply OK.", parameters: { type: "object", properties: {} } };
  try {
    for await (const ev of streamChat(conn, { messages: [{ role: "user", content: "Reply with the word OK." }], tools: [tool], maxTokens: 16 }, signal)) {
      if (ev.type === "done") break;
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof ProviderError) return { ok: false, reason: e.reason, detail: e.message };
    if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") return { ok: false, reason: "no-network", detail: "No answer within 30 seconds." };
    return { ok: false, reason: "bad-response", detail: String((e as Error).message ?? e) };
  }
}
