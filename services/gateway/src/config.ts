// Gateway settings: config.json next to the server (or GATEWAY_CONFIG), with secrets from the
// environment so they never sit in a file that gets copied around.
import { readFileSync } from "node:fs";
import path from "node:path";

export interface ModelRoute {
  /** The name clients ask for, e.g. "encelium". */
  id: string;
  /** The real model at the upstream server. */
  upstreamModel: string;
}

export interface GatewayConfig {
  port: number;
  host: string;
  /** The model server behind the gateway (OpenAI-compatible), e.g. our own, or NVIDIA for testing. */
  upstream: { baseUrl: string; apiKey: string; timeoutMs: number };
  models: ModelRoute[];
  /** Per invite key, unless the key has its own. */
  limits: { perMinute: number; perDay: number; maxTokens: number; maxBodyBytes: number };
  /** Folder with the prompt files (system-prefix.md, system-suffix.md). */
  promptsDir: string;
  /** Hashed invite keys. */
  keysFile: string;
  /** Where daily usage counts are kept (so a restart doesn't reset them). */
  usageFile: string;
}

const DEFAULTS: GatewayConfig = {
  port: 8787,
  host: "0.0.0.0",
  upstream: { baseUrl: "", apiKey: "", timeoutMs: 600_000 },
  models: [{ id: "encelium", upstreamModel: "" }],
  limits: { perMinute: 30, perDay: 500, maxTokens: 8192, maxBodyBytes: 12 * 1024 * 1024 },
  promptsDir: "prompts",
  keysFile: "data/keys.json",
  usageFile: "data/usage.json",
};

export function loadConfig(file = process.env.GATEWAY_CONFIG ?? "config.json"): GatewayConfig {
  let fromFile: Partial<GatewayConfig> = {};
  // (A byte-order mark, which some Windows editors add, is ignored.)
  try { fromFile = JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, "")); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`config.json can't be read: ${(e as Error).message}`);
  }
  const base = path.dirname(path.resolve(file));
  const c: GatewayConfig = {
    ...DEFAULTS,
    ...fromFile,
    upstream: { ...DEFAULTS.upstream, ...fromFile.upstream },
    limits: { ...DEFAULTS.limits, ...fromFile.limits },
    models: fromFile.models?.length ? fromFile.models : DEFAULTS.models,
  };
  // Secrets and per-machine values from the environment win.
  if (process.env.GATEWAY_UPSTREAM_URL) c.upstream.baseUrl = process.env.GATEWAY_UPSTREAM_URL;
  if (process.env.GATEWAY_UPSTREAM_KEY) c.upstream.apiKey = process.env.GATEWAY_UPSTREAM_KEY;
  if (process.env.GATEWAY_UPSTREAM_MODEL) c.models = c.models.map((m, i) => (i === 0 ? { ...m, upstreamModel: process.env.GATEWAY_UPSTREAM_MODEL! } : m));
  if (process.env.PORT) c.port = Number(process.env.PORT);
  c.promptsDir = path.resolve(base, c.promptsDir);
  c.keysFile = path.resolve(base, c.keysFile);
  c.usageFile = path.resolve(base, c.usageFile);
  return c;
}

/** Problems that would stop the gateway from working, in plain words. */
export function configProblems(c: GatewayConfig): string[] {
  const out: string[] = [];
  if (!/^https?:\/\//.test(c.upstream.baseUrl)) out.push("upstream.baseUrl is missing (set GATEWAY_UPSTREAM_URL or config.json).");
  for (const m of c.models) if (!m.upstreamModel) out.push(`model "${m.id}" has no upstreamModel (set GATEWAY_UPSTREAM_MODEL or config.json).`);
  return out;
}
