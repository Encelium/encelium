// Runs agent tasks for the window. Tasks, folders and history live in tasks.js.
import { ipcMain } from "electron";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AgentSession, ENCELADUS_PRESET, suggestFolderName } from "@enceladus/agent-core";
import { currentConnection } from "./models.js";
import { getTask, hasTask, recorder, saveMessages, setTaskStopper } from "./tasks.js";
import { prepareAttachments } from "./attachments.js";

/** runId → { session, record } */
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

// After a Rewind the files changed behind the model's back. The next request carries a
// note about it, kept on disk so it survives a restart.
const rewindNoteFile = (task) => path.join(task.dir, "rewind-note.txt");
async function takeRewindNote(task) {
  try { const note = await readFile(rewindNoteFile(task), "utf8"); await rm(rewindNoteFile(task), { force: true }); return note; } catch { return ""; }
}

export function initAgent() {
  // Deleting a task stops its run first.
  setTaskStopper((taskId) => { for (const run of runs.values()) if (run.taskId === taskId) run.session.stop(); });

  ipcMain.handle("agent:start", async (event, { taskId, prompt, language, folder, attachments }) => {
    const lang = language === "ar" ? "ar" : "en";
    const text = String(prompt);
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const chosen = typeof folder === "string" ? folder : undefined;
    const conn = connection();
    // A new task without a chosen folder gets one named by the model (short, English, descriptive).
    const folderName = !chosen && conn && !hasTask(taskId) ? await suggestFolderName(conn, text) : "";
    const task = await getTask(taskId, { prompt: text, folder: chosen, folderName });
    const record = recorder(task);
    const send = (e) => {
      record(e);
      if (!event.sender.isDestroyed()) event.sender.send("agent:event", runId, e);
    };
    const { prompt: prepared, names } = await prepareAttachments(task.meta.folder, text, Array.isArray(attachments) ? attachments : []);
    const note = await takeRewindNote(task);
    const request = !note ? prepared : typeof prepared === "string" ? `${note}

${prepared}` : [{ type: "text", text: note }, ...prepared];
    record({ type: "user", text, ...(names.length ? { attachments: names } : {}) });

    if (!conn) {
      setTimeout(() => send({ type: "error", ...notConnected[lang] }), 0);
      return { runId, folder: task.meta.folder };
    }

    const session = new AgentSession(request, { connection: conn, workspace: task.workspace, checkpoints: task.checkpoints, language: lang, history: task.messages });
    runs.set(runId, { session, record, taskId: task.meta.id });
    session.onEvent(send);
    session.finished.then(async () => {
      runs.delete(runId);
      await saveMessages(task, session.messages); // follow-ups (even after a restart) continue the conversation
    });
    return { runId, folder: task.meta.folder };
  });

  ipcMain.handle("agent:respond", (_e, { runId, requestId, allowed }) => {
    const run = runs.get(runId);
    if (!run) return;
    run.record({ type: "permission-answer", requestId: String(requestId), allowed: !!allowed });
    run.session.respond(String(requestId), !!allowed);
  });
  ipcMain.handle("agent:stop", (_e, { runId }) => runs.get(runId)?.session.stop());

  ipcMain.handle("agent:restore", async (_e, { taskId, checkpointId, language }) => {
    const task = await getTask(taskId);
    if (!task) return { ok: false, message: language === "ar" ? "لم يعد هذا التراجع متاحًا." : "This Rewind point isn’t available any more." };
    try {
      const cp = (await task.checkpoints.all()).find((c) => c.id === String(checkpointId));
      const files = await task.checkpoints.restore(String(checkpointId));
      recorder(task)({ type: "restored", checkpointId: String(checkpointId) });
      const names = files.map((f) => path.relative(task.meta.folder, f) || f).join(", ");
      await writeFile(rewindNoteFile(task), `[The person used Rewind: the task folder is back to how it was ${cp ? `at "${cp.label}"` : "at an earlier point"}. Everything you changed after that point is undone${names ? ` (files put back: ${names})` : ""}. Read files again before relying on what you remember of them.]`);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  });
}
