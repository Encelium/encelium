// Access to the Enceladus model: the gateway's address and the person's invite code.
// The code is encrypted with Windows DPAPI (safeStorage) and never sent to the window.
import { app, ipcMain, safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { testConnection } from "@enceladus/agent-core";

/** The gateway address the app ships with, once there is one (until then the person enters it). */
export const DEFAULT_GATEWAY_URL = "";

const file = () => path.join(app.getPath("userData"), "access.json");
let state = {}; // { gatewayUrl, code: base64 (encrypted) }

const encrypt = (text) => (safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text).toString("base64") : null);
const decrypt = (b64) => { try { return safeStorage.decryptString(Buffer.from(b64, "base64")); } catch { return undefined; } };
const clean = (url) => String(url ?? "").trim().replace(/\/+$/, "");

async function save(next) {
  try {
    await mkdir(path.dirname(file()), { recursive: true });
    await writeFile(file(), JSON.stringify(next, null, 2));
  } catch { return false; }
  state = next;
  return true;
}

/** The connection to the Enceladus model, or null if there's no invite code yet. */
export function enceladusConnection() {
  const url = state.gatewayUrl || DEFAULT_GATEWAY_URL;
  const code = state.code ? decrypt(state.code) : undefined;
  if (!url || !code) return null;
  return { protocol: "openai", baseUrl: url, apiKey: code, model: "enceladus", usageInStream: true };
}

export async function initAccess() {
  try { state = JSON.parse(await readFile(file(), "utf8")); } catch { state = {}; }

  ipcMain.handle("access:get", () => ({
    connected: !!enceladusConnection(),
    gatewayUrl: state.gatewayUrl || DEFAULT_GATEWAY_URL,
    builtInAddress: !!DEFAULT_GATEWAY_URL,
  }));

  // Check the code against the gateway, then keep it.
  ipcMain.handle("access:connect", async (_e, { gatewayUrl, code }) => {
    const url = clean(gatewayUrl) || DEFAULT_GATEWAY_URL;
    const key = String(code ?? "").trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return { ok: false, reason: "bad-address" };
    if (!key) return { ok: false, reason: "no-key" };
    const test = await testConnection({ protocol: "openai", baseUrl: url, apiKey: key });
    if (!test.ok) return { ok: false, reason: test.reason };
    const enc = encrypt(key);
    if (!enc) return { ok: false, reason: "no-encryption" };
    return (await save({ gatewayUrl: url, code: enc })) ? { ok: true } : { ok: false, reason: "not-saved" };
  });

  ipcMain.handle("access:disconnect", async () => ((await save({ gatewayUrl: state.gatewayUrl })) ? { ok: true } : { ok: false, reason: "not-saved" }));

  // Today's use, for the "energy" bar: { requestsToday, requestLimit, resetsAt } or null.
  ipcMain.handle("access:usage", async () => {
    const conn = enceladusConnection();
    if (!conn) return null;
    try {
      const res = await fetch(`${conn.baseUrl}/usage`, { headers: { authorization: `Bearer ${conn.apiKey}` }, signal: AbortSignal.timeout(8000) });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  });
}
