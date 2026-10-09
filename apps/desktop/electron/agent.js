// Runs agent tasks for the window. Each task gets its own folder (Documents\Enceladus\...)
// and its own Rewind history (in app data, out of the agent's reach).
import { app, ipcMain, shell } from "electron";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { AgentSession, Checkpoints, ENCELADUS_PRESET, Workspace } from "@enceladus/agent-core";
import { currentConnection } from "./models.js";

/** taskId → { workspace, checkpoints, messages } (follow-ups continue the conversation) */
const tasks = new Map();
/** runId → AgentSession */
const runs = new Map();

const notConnected = {
  en: { message: "Enceladus’s own model isn’t connected yet.", suggestion: "Until it is, you can use your own model: Settings → Advanced." },
  ar: { message: "نموذج إنسيلادوس الخاص غير متصل بعد.", suggestion: "إلى أن يتصل، يمكنك استخدام نموذجك الخاص: الإعدادات ← متقدّم." },
};

/** The model to use: the person's own, if they set one; otherwise ours. */
function connection() {
  const own = currentConnection();
  if (own) return own;
  if (!ENCELADUS_PRESET.baseUrl) return null; // waiting for the model team (docs/model-integration.md)
  return { protocol: ENCELADUS_PRESET.protocol, baseUrl: ENCELADUS_PRESET.baseUrl, model: "enceladus", usageInStream: true };
}

/** A readable folder name from the request: "Make a website for my bakery" → "make-a-website-for-my-bakery". */
function folderName(prompt) {
  const words = prompt.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 6);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `${words.length ? words.join("-") : "task"}-${stamp}`;
}

async function taskFor(taskId, prompt) {
  if (tasks.has(taskId)) return tasks.get(taskId);
  const safeId = String(taskId).replace(/[^\w-]/g, "");
  const root = path.join(app.getPath("documents"), "Enceladus", folderName(prompt));
  await mkdir(root, { recursive: true });
  const task = {
    workspace: new Workspace(root),
    checkpoints: new Checkpoints(path.join(app.getPath("userData"), "tasks", safeId)),
    messages: [],
  };
  tasks.set(taskId, task);
  return task;
}

export function initAgent() {
  ipcMain.handle("agent:start", async (event, { taskId, prompt, language }) => {
    const lang = language === "ar" ? "ar" : "en";
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const send = (e) => { if (!event.sender.isDestroyed()) event.sender.send("agent:event", runId, e); };

    const conn = connection();
    if (!conn) {
      setTimeout(() => send({ type: "error", ...notConnected[lang] }), 0);
      return { runId };
    }

    const task = await taskFor(taskId, String(prompt));
    const session = new AgentSession(String(prompt), { connection: conn, workspace: task.workspace, checkpoints: task.checkpoints, language: lang, history: task.messages });
    runs.set(runId, session);
    session.onEvent(send);
    session.finished.then(() => {
      task.messages = session.messages; // keep the conversation for follow-ups
      runs.delete(runId);
    });
    return { runId, folder: task.workspace.root };
  });

  ipcMain.handle("agent:respond", (_e, { runId, requestId, allowed }) => runs.get(runId)?.respond(String(requestId), !!allowed));
  ipcMain.handle("agent:stop", (_e, { runId }) => runs.get(runId)?.stop());

  ipcMain.handle("agent:restore", async (_e, { taskId, checkpointId, language }) => {
    const task = tasks.get(taskId);
    if (!task) return { ok: false, message: language === "ar" ? "لم يعد هذا التراجع متاحًا." : "This Rewind point isn’t available any more." };
    try {
      await task.checkpoints.restore(String(checkpointId));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  });

  ipcMain.handle("agent:open-folder", async (_e, { taskId }) => {
    const task = tasks.get(taskId);
    if (task) await shell.openPath(task.workspace.root);
  });
}
