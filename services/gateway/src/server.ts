// Encelium gateway: sits between the app and the model server.
//
//   app ──(invite key)──▶ gateway ──(server key)──▶ model (OpenAI-compatible)
//
// It checks invite keys, applies fair-use limits, adds the server's prompt instructions, streams
// the answer back, and logs one line per request (who, model, status, time, tokens; never content).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { GatewayConfig } from "./config.ts";
import { KeyStore, type InviteKey } from "./keys.ts";
import { Limiter } from "./limits.ts";
import { Prompts } from "./prompts.ts";

type Json = Record<string, unknown>;

function sendJson(res: ServerResponse, status: number, body: Json, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}
/** Errors in the shape OpenAI-style clients (like the app) already understand. */
function sendError(res: ServerResponse, status: number, type: string, message: string, headers: Record<string, string> = {}) {
  sendJson(res, status, { error: { message, type, code: type } }, headers);
}

export function log(entry: Json) {
  process.stdout.write(JSON.stringify({ time: new Date().toISOString(), ...entry }) + "\n");
}

async function readBody(req: IncomingMessage, max: number): Promise<string | null> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > max) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const bearer = (req: IncomingMessage) => String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();

export function createGateway(config: GatewayConfig) {
  const keys = new KeyStore(config.keysFile);
  const limiter = new Limiter(config.usageFile);
  const prompts = new Prompts(config.promptsDir);
  const signedIn = (k: InviteKey) => k.tier === "signedIn";
  const tierOf = (k: InviteKey) => (signedIn(k) ? config.tiers.signedIn : config.tiers.anonymous);
  const perMinute = (k: InviteKey) => k.perMinute ?? tierOf(k).perMinute;
  const perDay = (k: InviteKey) => k.perDay ?? tierOf(k).perDay;
  /** The sign-in bonus the app shows at the quota wall (null when already signed in). */
  const offer = (k: InviteKey) => (signedIn(k) ? null : { signIn: true, perDay: config.tiers.signedIn.perDay, via: ["google", "email"] });

  async function chat(req: IncomingMessage, res: ServerResponse, key: InviteKey) {
    const started = Date.now();
    const raw = await readBody(req, config.limits.maxBodyBytes);
    if (raw === null) return sendError(res, 413, "request_too_large", "The request is too large.");
    let body: Json;
    try { body = JSON.parse(raw); } catch { return sendError(res, 400, "invalid_request", "The request isn't valid JSON."); }

    // The model's name has a small family history: "encelus" is its real name, but older
    // apps ask for "encelium" and the very oldest for "enceladus". All one model.
    const FAMILY = ["encelus", "encelium", "enceladus"];
    const alias = (asked: unknown, id: string) => FAMILY.includes(String(asked)) && FAMILY.includes(id);
    const route = config.models.find((m) => m.id === body.model) ?? config.models.find((m) => alias(body.model, m.id));
    if (!route) return sendError(res, 404, "model_not_found", `There's no model called "${String(body.model)}" here.`);

    // The admin can require sign-in for everyone, or for one key, before any limit is hit.
    if ((config.requireLogin || key.requireLogin) && !signedIn(key)) {
      log({ key: key.name, model: route.id, status: 401, reason: "login_required" });
      return sendJson(res, 401, {
        error: { code: "login_required", message: "Sign in to keep using Encelus.", offer: offer(key) },
      });
    }

    const limit = limiter.take(key.name, perMinute(key), perDay(key));
    if (!limit.ok) {
      const message = limit.reason === "per-day" ? "Today's limit is used up. It refills at midnight (UTC)." : "Too many requests in a minute. Wait a moment.";
      log({ key: key.name, model: route.id, status: 429, reason: limit.reason });
      return sendJson(res, 429, {
        error: { code: "rate_limit_exceeded", message, ...(limit.reason === "per-day" ? { offer: offer(key) } : {}) },
      }, { "retry-after": String(limit.retryAfterSec) });
    }

    const stream = body.stream === true;
    const upstreamBody: Json = {
      ...body,
      model: route.upstreamModel,
      messages: prompts.apply(Array.isArray(body.messages) ? body.messages : []),
      max_tokens: Math.min(Number(body.max_tokens) || config.limits.maxTokens, config.limits.maxTokens),
      ...(stream ? { stream_options: { include_usage: true } } : {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.upstream.timeoutMs);
    res.on("close", () => { if (!res.writableEnded) controller.abort(); }); // the app went away: stop the model too
    let upstream: Response;
    try {
      upstream = await fetch(`${config.upstream.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(config.upstream.apiKey ? { authorization: `Bearer ${config.upstream.apiKey}` } : {}) },
        body: JSON.stringify(upstreamBody),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      log({ key: key.name, model: route.id, status: 502, reason: (e as Error).name });
      return sendError(res, 502, "upstream_unreachable", "The model server didn't answer.");
    }

    // The model server refused: pass its status on (the app explains 401/404/429/5xx in plain words).
    if (!upstream.ok || !upstream.body) {
      clearTimeout(timer);
      const text = await upstream.text().catch(() => "");
      log({ key: key.name, model: route.id, status: upstream.status, upstreamStatus: upstream.status });
      // An upstream key problem is ours, not the person's: don't let it look like their invite key is wrong.
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status;
      res.writeHead(status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
      return res.end(text);
    }

    // Pass the answer through, naming our model instead of the upstream one, and counting tokens.
    res.writeHead(200, { "content-type": stream ? "text/event-stream" : "application/json", "cache-control": "no-cache" });
    let tokens = 0;
    const rename = (obj: Json) => { if (obj.usage && typeof obj.usage === "object") tokens = Number((obj.usage as Json).total_tokens) || tokens; if (obj.model) obj.model = route.id; return obj; };
    try {
      if (stream) {
        const decoder = new TextDecoder();
        let buffer = "";
        for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
          buffer += decoder.decode(chunk, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl + 1);
            buffer = buffer.slice(nl + 1);
            const m = line.match(/^data:\s*(\{.*\})\s*$/);
            if (m) {
              try { res.write(`data: ${JSON.stringify(rename(JSON.parse(m[1]!)))}\n`); continue; } catch { /* not JSON: pass as is */ }
            }
            res.write(line);
          }
        }
        if (buffer) res.write(buffer);
      } else {
        res.write(JSON.stringify(rename(JSON.parse(await upstream.text()))));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") log({ key: key.name, model: route.id, status: 200, error: "stream cut" });
    } finally {
      clearTimeout(timer);
      res.end();
    }
    if (tokens) limiter.addTokens(key.name, tokens);
    log({ key: key.name, model: route.id, status: 200, ms: Date.now() - started, tokens, requestsToday: limit.usedToday });
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://gateway");
    try {
      if (req.method === "GET" && url.pathname === "/health") return sendJson(res, 200, { ok: true, models: config.models.map((m) => m.id) });

      // Everything else needs an invite key.
      const key = keys.find(bearer(req));
      if (!key) return sendError(res, 401, "invalid_api_key", "This invite key isn't valid.");

      if (req.method === "GET" && url.pathname === "/v1/models") return sendJson(res, 200, { object: "list", data: config.models.map((m) => ({ id: m.id, object: "model", owned_by: "encelus" })) });
      if (req.method === "GET" && url.pathname === "/v1/usage")
        return sendJson(res, 200, { ...limiter.usage(key.name, perDay(key)), tier: signedIn(key) ? "signedIn" : "anonymous", offer: offer(key) });
      if (req.method === "POST" && url.pathname === "/v1/chat/completions") return await chat(req, res, key);
      return sendError(res, 404, "not_found", "There's nothing here.");
    } catch (e) {
      log({ status: 500, error: (e as Error).message });
      if (!res.headersSent) sendError(res, 500, "server_error", "Something went wrong in the gateway.");
      else res.end();
    }
  });

  return { server, keys, limiter };
}
