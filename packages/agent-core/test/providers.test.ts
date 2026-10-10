import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { streamChat, testConnection, type ModelConnection, type StreamEvent } from "../src/index.ts";

type Handler = (req: IncomingMessage, body: any, res: ServerResponse) => void;

async function withServer(handler: Handler, fn: (base: string) => Promise<void>) {
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    handler(req, raw ? JSON.parse(raw) : null, res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    server.close();
  }
}

function sse(res: ServerResponse, events: (string | object)[]) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  for (const e of events) res.write(typeof e === "string" ? e : `data: ${JSON.stringify(e)}\n\n`);
  res.end();
}

async function collect(gen: AsyncGenerator<StreamEvent>) {
  const out: StreamEvent[] = [];
  for await (const e of gen) if (e.type !== "tool-progress") out.push(e); // live progress only feeds the status line
  return out;
}

test("openai: streams text and assembles a tool call sent in pieces", async () => {
  await withServer((req, body, res) => {
    assert.equal(req.url, "/v1/chat/completions");
    assert.equal(req.headers.authorization, "Bearer sk-test");
    assert.equal(body.stream, true);
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.tools[0].function.name, "read_file");
    sse(res, [
      { choices: [{ delta: { content: "Let me " } }] },
      { choices: [{ delta: { content: "look." } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "read_file", arguments: "{\"pa" } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "th\":\"index.html\"}" } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
      { choices: [], usage: { prompt_tokens: 12, completion_tokens: 7 } },
      "data: [DONE]\n\n",
    ]);
  }, async (base) => {
    const conn: ModelConnection = { protocol: "openai", baseUrl: `${base}/v1`, apiKey: "sk-test", model: "m", usageInStream: true };
    const events = await collect(streamChat(conn, {
      system: "be brief",
      messages: [{ role: "user", content: "hi" }],
      tools: [{ name: "read_file", description: "Read a file", parameters: { type: "object" } }],
    }));
    const text = events.filter((e) => e.type === "text").map((e) => (e as { text: string }).text).join("");
    assert.equal(text, "Let me look.");
    const call = events.find((e) => e.type === "tool-call");
    assert.deepEqual(call, { type: "tool-call", call: { id: "call_1", name: "read_file", arguments: "{\"path\":\"index.html\"}" } });
    assert.deepEqual(events.at(-1), { type: "done", stopReason: "tool-calls", usage: { inputTokens: 12, outputTokens: 7 } });
  });
});

test("openai: handles CRLF line endings and keep-alive comments", async () => {
  await withServer((_req, _body, res) => {
    sse(res, [": keep-alive\r\n\r\n", "data: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}\r\n\r\n", "data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\r\n\r\n", "data: [DONE]\r\n\r\n"]);
  }, async (base) => {
    const events = await collect(streamChat({ protocol: "openai", baseUrl: base, model: "m" }, { messages: [{ role: "user", content: "hi" }] }));
    assert.deepEqual(events, [{ type: "text", text: "ok" }, { type: "done", stopReason: "end", usage: undefined }]);
  });
});

test("anthropic: streams text, a tool call, and merges consecutive tool results into one user turn", async () => {
  await withServer((req, body, res) => {
    assert.equal(req.url, "/v1/messages");
    assert.equal(req.headers["x-api-key"], "ak-test");
    assert.equal(body.system, "be brief");
    // assistant tool_use → two tool results must become ONE user message with two blocks
    assert.equal(body.messages.length, 3);
    assert.equal(body.messages[2].role, "user");
    assert.equal(body.messages[2].content.length, 2);
    assert.equal(body.tools[0].input_schema.type, "object");
    sse(res, [
      "event: message_start\n" + `data: ${JSON.stringify({ type: "message_start", message: { usage: { input_tokens: 20 } } })}\n\n`,
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Reading it now." } },
      { type: "content_block_stop", index: 0 },
      { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "tu_1", name: "read_file" } },
      { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "{\"path\":" } },
      { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "\"a.txt\"}" } },
      { type: "content_block_stop", index: 1 },
      { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 9 } },
      { type: "message_stop" },
    ]);
  }, async (base) => {
    const conn: ModelConnection = { protocol: "anthropic", baseUrl: base, apiKey: "ak-test", model: "m" };
    const events = await collect(streamChat(conn, {
      system: "be brief",
      tools: [{ name: "read_file", description: "Read a file", parameters: { type: "object" } }],
      messages: [
        { role: "user", content: "open both" },
        { role: "assistant", content: "", toolCalls: [{ id: "a", name: "read_file", arguments: "{}" }, { id: "b", name: "read_file", arguments: "{}" }] },
        { role: "tool", toolCallId: "a", content: "one" },
        { role: "tool", toolCallId: "b", content: "two" },
      ],
    }));
    assert.deepEqual(events, [
      { type: "text", text: "Reading it now." },
      { type: "tool-call", call: { id: "tu_1", name: "read_file", arguments: "{\"path\":\"a.txt\"}" } },
      { type: "done", stopReason: "tool-calls", usage: { inputTokens: 20, outputTokens: 9 } },
    ]);
  });
});

test("testConnection: lists models, and reports a wrong key as bad-key", async () => {
  await withServer((req, _body, res) => {
    if (req.headers.authorization !== "Bearer good") { res.writeHead(401, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "Invalid API key" } })); return; }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [{ id: "model-b" }, { id: "model-a" }] }));
  }, async (base) => {
    assert.deepEqual(await testConnection({ protocol: "openai", baseUrl: base, apiKey: "good" }), { ok: true, models: ["model-a", "model-b"] });
    assert.deepEqual(await testConnection({ protocol: "openai", baseUrl: base, apiKey: "bad" }), { ok: false, reason: "bad-key", detail: "Invalid API key" });
  });
});

test("testConnection: an address with nothing running reports no-network", async () => {
  const result = await testConnection({ protocol: "openai", baseUrl: "http://127.0.0.1:9" }, 3000);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, "no-network");
});
