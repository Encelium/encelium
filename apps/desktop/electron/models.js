// Which model the agent uses, and the user's own API keys.
// Keys are encrypted with Windows DPAPI (Electron safeStorage) and never sent to the window.
import { app, ipcMain, safeStorage } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PRESETS, CUSTOM_PRESET_ID, testConnection } from "@enceladus/agent-core";

const file = () => path.join(app.getPath("userData"), "model.json");

/** { mode: "enceladus" } or { mode: "own", presetId, baseUrl, protocol, model, key?: base64 } */
let state = { mode: "enceladus" };

async function load() {
  try { state = JSON.parse(await readFile(file(), "utf8")); } catch { state = { mode: "enceladus" }; }
}
/** Write to disk first; only then make it the live setting, so the two never disagree. */
async function save(next) {
  try {
    await mkdir(path.dirname(file()), { recursive: true });
    await writeFile(file(), JSON.stringify(next, null, 2));
  } catch {
    return false;
  }
  state = next;
  return true;
}

const encrypt = (key) => (safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key).toString("base64") : null);
const decrypt = (b64) => { try { return safeStorage.decryptString(Buffer.from(b64, "base64")); } catch { return undefined; } };

/** Resolve what the window sent into a full connection. Unknown presets are rejected. */
function resolve({ presetId, baseUrl, apiKey }) {
  if (presetId === CUSTOM_PRESET_ID) {
    const url = String(baseUrl ?? "").trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return { error: "bad-address" };
    return { protocol: "openai", baseUrl: url, apiKey: apiKey || savedKeyFor(presetId), usageInStream: false };
  }
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p) return { error: "unknown-provider" };
  return { protocol: p.protocol, baseUrl: p.baseUrl, apiKey: p.needsKey ? apiKey || savedKeyFor(presetId) : undefined, usageInStream: p.usageInStream };
}

// Reuse the saved key when the user re-tests the same provider without pasting it again.
const savedKeyFor = (presetId) => (state.mode === "own" && state.presetId === presetId && state.key ? decrypt(state.key) : undefined);

/** The connection the agent engine should use, or null for the Enceladus model. */
export function currentConnection() {
  if (state.mode !== "own") return null;
  return { protocol: state.protocol, baseUrl: state.baseUrl, apiKey: state.key ? decrypt(state.key) : undefined, model: state.model, usageInStream: state.usageInStream };
}

export async function initModels() {
  await load();

  ipcMain.handle("model:presets", () => PRESETS.map(({ id, name, needsKey, keyUrl, local }) => ({ id, name, needsKey, keyUrl: keyUrl ?? null, local: !!local })));

  ipcMain.handle("model:get", () => (state.mode === "own"
    ? { mode: "own", presetId: state.presetId, baseUrl: state.presetId === CUSTOM_PRESET_ID ? state.baseUrl : null, model: state.model, hasKey: !!state.key }
    : { mode: "enceladus" }));

  ipcMain.handle("model:test", async (_e, input) => {
    const conn = resolve(input ?? {});
    if (conn.error) return { ok: false, reason: conn.error };
    const preset = PRESETS.find((x) => x.id === input.presetId);
    if (preset?.needsKey && !conn.apiKey) return { ok: false, reason: "no-key" };
    const result = await testConnection(conn);
    return result.ok ? { ok: true, models: result.models } : { ok: false, reason: result.reason };
  });

  ipcMain.handle("model:save", async (_e, input) => {
    const conn = resolve(input ?? {});
    if (conn.error) return { ok: false, reason: conn.error };
    const model = String(input.model ?? "").trim();
    if (!model) return { ok: false, reason: "no-model" };
    let key = state.mode === "own" && state.presetId === input.presetId ? state.key : undefined;
    if (input.apiKey) {
      key = encrypt(input.apiKey);
      if (!key) return { ok: false, reason: "no-encryption" }; // never store a key in plain text
    }
    const next = { mode: "own", presetId: input.presetId, protocol: conn.protocol, baseUrl: conn.baseUrl, usageInStream: !!conn.usageInStream, model, ...(key ? { key } : {}) };
    return (await save(next)) ? { ok: true } : { ok: false, reason: "not-saved" };
  });

  ipcMain.handle("model:reset", async () => {
    return (await save({ mode: "enceladus" })) ? { ok: true } : { ok: false, reason: "not-saved" }; // forgets the key too
  });
}
