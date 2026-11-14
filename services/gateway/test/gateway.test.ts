import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createGateway } from "../src/server.ts";
import type { GatewayConfig } from "../src/config.ts";

const listen = (s: Server) => new Promise<string>((r) => s.listen(0, "127.0.0.1", () => r(`http://127.0.0.1:${(s.address() as AddressInfo).port}`)));

/** A fake model server: remembers what it was sent, answers with a short stream. */
function fakeUpstream(status = 200) {
  const seen: { auth?: string; body: any }[] = [];
  const server = createServer(async (req, res) => {
    let raw = ""; for await (const c of req) raw += c;
    const body = JSON.parse(raw);
    seen.push({ auth: req.headers.authorization, body });
    if (status !== 200) { res.writeHead(status, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: { message: "upstream says no" } })); }
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ model: "secret-upstream-model", choices: [{ delta: { content: "Hello" } }] })}\n\n`);
    res.write(`data: ${JSON.stringify({ model: "secret-upstream-model", choices: [], usage: { total_tokens: 42 } })}\n\n`);
    res.end("data: [DONE]\n\n");
  });
  return { server, seen };
}

async function setup(upstreamStatus = 200, limits: Partial<GatewayConfig["limits"]> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "gw-"));
  mkdirSync(path.join(dir, "prompts"));
  writeFileSync(path.join(dir, "prompts", "system-prefix.md"), "You are Encelium. Keep words simple.");
  const up = fakeUpstream(upstreamStatus);
  const upUrl = await listen(up.server);
  const config: GatewayConfig = {
    port: 0, host: "127.0.0.1",
    upstream: { baseUrl: `${upUrl}/v1`, apiKey: "server-secret", timeoutMs: 10_000 },
    models: [{ id: "encelium", upstreamModel: "secret-upstream-model" }],
    limits: { perMinute: 30, perDay: 500, maxTokens: 1000, maxBodyBytes: 1_000_000, ...limits },
    promptsDir: path.join(dir, "prompts"), keysFile: path.join(dir, "keys.json"), usageFile: path.join(dir, "usage.json"),
  };
  const gw = createGateway(config);
  const url = await listen(gw.server);
  const key = gw.keys.add("Tester");
  const close = () => { gw.server.close(); up.server.close(); rmSync(dir, { recursive: true, force: true }); };
  return { url, key, up, gw, close };
}

const chat = (url: string, key: string, body: object) => fetch(`${url}/v1/chat/completions`, {
  method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
  body: JSON.stringify({ model: "encelium", stream: true, messages: [{ role: "system", content: "App rules." }, { role: "user", content: "hi" }], ...body }),
});

test("health is open; everything else needs a valid invite key", async () => {
  const t = await setup();
  try {
    assert.equal((await fetch(`${t.url}/health`)).status, 200);
    assert.equal((await fetch(`${t.url}/v1/models`)).status, 401);
    assert.equal((await fetch(`${t.url}/v1/models`, { headers: { authorization: "Bearer enc_wrong" } })).status, 401);
    const models = await (await fetch(`${t.url}/v1/models`, { headers: { authorization: `Bearer ${t.key}` } })).json() as { data: { id: string }[] };
    assert.deepEqual(models.data.map((m) => m.id), ["encelium"]);
  } finally { t.close(); }
});

test("a chat streams through with the server's prompt added, our model name, and capped tokens", async () => {
  const t = await setup();
  try {
    const res = await chat(t.url, t.key, { max_tokens: 99999 });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /Hello/);
    assert.doesNotMatch(text, /secret-upstream-model/, "the upstream model's name doesn't leak");
    const sent = t.up.seen[0]!;
    assert.equal(sent.auth, "Bearer server-secret", "the server key is used upstream, not the invite key");
    assert.equal(sent.body.model, "secret-upstream-model");
    assert.equal(sent.body.max_tokens, 1000);
    assert.equal(sent.body.messages[0].content, "You are Encelium. Keep words simple.\n\nApp rules.");
    assert.equal(sent.body.messages[1].content, "hi", "the person's words are untouched");
    const usage = await (await fetch(`${t.url}/v1/usage`, { headers: { authorization: `Bearer ${t.key}` } })).json() as { requestsToday: number; tokensToday: number };
    assert.equal(usage.requestsToday, 1);
    assert.equal(usage.tokensToday, 42);
  } finally { t.close(); }
});

test("limits: too many requests in a minute get 429 with Retry-After", async () => {
  const t = await setup(200, { perMinute: 2 });
  try {
    for (let i = 0; i < 2; i++) await (await chat(t.url, t.key, {})).text();
    const third = await chat(t.url, t.key, {});
    assert.equal(third.status, 429);
    assert.ok(Number(third.headers.get("retry-after")) > 0);
  } finally { t.close(); }
});

test("an unknown model is 404; a bad upstream key is the server's problem (502), not the person's", async () => {
  const a = await setup();
  try { assert.equal((await chat(a.url, a.key, { model: "gpt-9" })).status, 404); } finally { a.close(); }
  const b = await setup(401);
  try { assert.equal((await chat(b.url, b.key, {})).status, 502); } finally { b.close(); }
});

test("the pre-rename model name still routes to the same upstream", async () => {
  const t = await setup();
  try {
    const res = await chat(t.url, t.key, { model: "enceladus" });
    assert.equal(res.status, 200);
    const sent = t.up.seen.at(-1);
    assert.ok(sent && sent.body.model === "secret-upstream-model");
  } finally { t.close(); }
});

test("a disabled key stops working", async () => {
  const t = await setup();
  try {
    t.gw.keys.setDisabled("Tester", true);
    assert.equal((await chat(t.url, t.key, {})).status, 401);
  } finally { t.close(); }
});

test("a key added by the admin command while the gateway runs works right away", async () => {
  const t = await setup();
  try {
    // The admin command is another process: it writes the keys file on its own.
    const { KeyStore } = await import("../src/keys.ts");
    const other = new KeyStore((t.gw.keys as unknown as { file: string }).file);
    await new Promise((r) => setTimeout(r, 20)); // a different file time than the first write
    const late = other.add("Late tester");
    assert.equal((await fetch(`${t.url}/v1/models`, { headers: { authorization: `Bearer ${late}` } })).status, 200);
  } finally { t.close(); }
});
