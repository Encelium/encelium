// OpenAI-compatible Chat Completions. Also covers Google Gemini, OpenRouter, DeepSeek,
// Groq, Ollama, LM Studio and — we've asked for it — the Enceladus model.
import { readSse } from "./sse.ts";
import { ProviderError, reasonForStatus } from "./types.ts";
import type { ChatMessage, ChatRequest, ModelConnection, StreamEvent, ToolCall } from "./types.ts";

const trim = (url: string) => url.replace(/\/+$/, "");

function headers(conn: ModelConnection): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (conn.apiKey) h.authorization = `Bearer ${conn.apiKey}`;
  return h;
}

export async function listModels(conn: ModelConnection, signal?: AbortSignal): Promise<string[]> {
  const res = await send(`${trim(conn.baseUrl)}/models`, { headers: headers(conn), signal });
  const body = (await res.json().catch(() => null)) as { data?: { id?: string }[] } | null;
  if (!body || !Array.isArray(body.data)) throw new ProviderError("bad-response", "The server answered, but not with a list of models.");
  return body.data.map((m) => m.id).filter((id): id is string => typeof id === "string").sort();
}

function toWire(messages: ChatMessage[], system?: string) {
  const out: Record<string, unknown>[] = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    if (m.role === "user") {
      out.push({
        role: "user",
        content: typeof m.content === "string" ? m.content : m.content.map((p) =>
          p.type === "text" ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: `data:${p.mediaType};base64,${p.base64}` } }),
      });
    } else if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content || null,
        ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } })) } : {}),
      });
    } else {
      out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    }
  }
  return out;
}

export async function* streamChat(conn: ModelConnection, req: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    model: conn.model,
    messages: toWire(req.messages, req.system),
    stream: true,
  };
  if (req.maxTokens) body.max_tokens = req.maxTokens;
  if (req.tools?.length) body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
  if (conn.usageInStream) body.stream_options = { include_usage: true };

  const res = await send(`${trim(conn.baseUrl)}/chat/completions`, { method: "POST", headers: headers(conn), body: JSON.stringify(body), signal });
  if (!res.body) throw new ProviderError("bad-response", "The server sent an empty response.");

  // Tool calls arrive in pieces, keyed by index; assemble them before handing them on.
  const calls = new Map<number, ToolCall>();
  let finish: string | null = null;
  let usage: { inputTokens?: number; outputTokens?: number } | undefined;

  for await (const msg of readSse(res.body, signal)) {
    if (msg.data === "[DONE]") break;
    let chunk: any;
    try { chunk = JSON.parse(msg.data); } catch { continue; }
    if (chunk.error) throw new ProviderError("server", String(chunk.error.message ?? "The server reported an error."));
    if (chunk.usage) usage = { inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens };
    const choice = chunk.choices?.[0];
    if (!choice) continue;
    const delta = choice.delta ?? {};
    if (typeof delta.content === "string" && delta.content) yield { type: "text", text: delta.content };
    for (const tc of delta.tool_calls ?? []) {
      const index = typeof tc.index === "number" ? tc.index : 0;
      const cur = calls.get(index) ?? { id: "", name: "", arguments: "" };
      if (tc.id) cur.id = tc.id;
      if (tc.function?.name) cur.name += tc.function.name;
      if (tc.function?.arguments) cur.arguments += tc.function.arguments;
      calls.set(index, cur);
    }
    if (choice.finish_reason) finish = choice.finish_reason;
  }

  for (const [i, call] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
    yield { type: "tool-call", call: { ...call, id: call.id || `call_${i}` } };
  }
  const stopReason = calls.size ? "tool-calls" : finish === "stop" ? "end" : finish === "length" ? "max-tokens" : finish === "tool_calls" ? "tool-calls" : "other";
  yield { type: "done", stopReason, usage };
}

/** fetch with errors turned into ProviderError categories. */
export async function send(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ProviderError("no-network", `Couldn't reach ${new URL(url).host}.`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.slice(0, 300);
    try { message = JSON.parse(text)?.error?.message ?? message; } catch { /* not JSON */ }
    throw new ProviderError(reasonForStatus(res.status), message || `HTTP ${res.status}`, res.status);
  }
  return res;
}
