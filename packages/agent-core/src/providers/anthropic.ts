// Anthropic Messages API.
import { readSse } from "./sse.ts";
import { send } from "./openai.ts";
import { ProviderError, chatFailure } from "./types.ts";
import type { ChatMessage, ChatRequest, ModelConnection, StreamEvent, ToolCall } from "./types.ts";

const API_VERSION = "2023-06-01";
const trim = (url: string) => url.replace(/\/+$/, "");

function headers(conn: ModelConnection): Record<string, string> {
  return { "content-type": "application/json", "x-api-key": conn.apiKey ?? "", "anthropic-version": API_VERSION };
}

export async function listModels(conn: ModelConnection, signal?: AbortSignal): Promise<string[]> {
  const res = await send(`${trim(conn.baseUrl)}/v1/models?limit=100`, { headers: headers(conn), signal });
  const body = (await res.json().catch(() => null)) as { data?: { id?: string }[] } | null;
  if (!body || !Array.isArray(body.data)) throw new ProviderError("bad-response", "The server answered, but not with a list of models.");
  return body.data.map((m) => m.id).filter((id): id is string => typeof id === "string");
}

function toWire(messages: ChatMessage[]) {
  const out: { role: "user" | "assistant"; content: unknown[] }[] = [];
  const push = (role: "user" | "assistant", block: unknown) => {
    const last = out[out.length - 1];
    if (last && last.role === role) last.content.push(block); // Anthropic needs alternating roles: merge
    else out.push({ role, content: [block] });
  };
  for (const m of messages) {
    if (m.role === "user") {
      const parts = typeof m.content === "string" ? [{ type: "text", text: m.content } as const] : m.content;
      for (const p of parts) push("user", p.type === "text" ? { type: "text", text: p.text } : { type: "image", source: { type: "base64", media_type: p.mediaType, data: p.base64 } });
    } else if (m.role === "assistant") {
      if (m.content) push("assistant", { type: "text", text: m.content });
      for (const c of m.toolCalls ?? []) {
        let input: unknown = {};
        try { input = JSON.parse(c.arguments || "{}"); } catch { /* keep {} — the model sent invalid JSON */ }
        push("assistant", { type: "tool_use", id: c.id, name: c.name, input });
      }
    } else {
      push("user", { type: "tool_result", tool_use_id: m.toolCallId, content: m.content, ...(m.isError ? { is_error: true } : {}) });
    }
  }
  return out;
}

export async function* streamChat(conn: ModelConnection, req: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    model: conn.model,
    max_tokens: req.maxTokens ?? 8192,
    messages: toWire(req.messages),
    stream: true,
  };
  if (req.system) body.system = req.system;
  if (req.tools?.length) body.tools = req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));

  const res = await send(`${trim(conn.baseUrl)}/v1/messages`, { method: "POST", headers: headers(conn), body: JSON.stringify(body), signal }).catch((e) => { throw chatFailure(e); });
  if (!res.body) throw new ProviderError("bad-response", "The server sent an empty response.");

  const blocks = new Map<number, ToolCall>();
  let stop: string | null = null;
  const usage: { inputTokens?: number; outputTokens?: number } = {};

  for await (const msg of readSse(res.body, signal)) {
    let ev: any;
    try { ev = JSON.parse(msg.data); } catch { continue; }
    switch (ev.type) {
      case "message_start":
        usage.inputTokens = ev.message?.usage?.input_tokens;
        break;
      case "content_block_start":
        if (ev.content_block?.type === "tool_use") blocks.set(ev.index, { id: ev.content_block.id, name: ev.content_block.name, arguments: "" });
        break;
      case "content_block_delta":
        if (ev.delta?.type === "text_delta" && ev.delta.text) yield { type: "text", text: ev.delta.text };
        else if (ev.delta?.type === "input_json_delta") {
          const b = blocks.get(ev.index);
          if (b) { b.arguments += ev.delta.partial_json ?? ""; yield { type: "tool-progress", name: b.name, partial: b.arguments }; }
        }
        break;
      case "content_block_stop": {
        const b = blocks.get(ev.index);
        if (b) { yield { type: "tool-call", call: { ...b, arguments: b.arguments || "{}" } }; blocks.delete(ev.index); }
        break;
      }
      case "message_delta":
        if (ev.delta?.stop_reason) stop = ev.delta.stop_reason;
        if (ev.usage?.output_tokens != null) usage.outputTokens = ev.usage.output_tokens;
        break;
      case "error":
        throw new ProviderError(ev.error?.type === "overloaded_error" ? "server" : "bad-response", String(ev.error?.message ?? "The server reported an error."));
    }
  }

  const stopReason = stop === "end_turn" || stop === "stop_sequence" ? "end" : stop === "tool_use" ? "tool-calls" : stop === "max_tokens" ? "max-tokens" : "other";
  yield { type: "done", stopReason, usage };
}
