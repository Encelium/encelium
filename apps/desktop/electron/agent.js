// Runs agent tasks for the window. Tasks, folders and history live in tasks.js.
import { app, BrowserWindow, Notification, ipcMain } from "electron";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AgentSession, ENCELADUS_PRESET, splitNextLine, suggestFolderName, suggestNext, toFolderName } from "@enceladus/agent-core";
import { currentConnection } from "./models.js";
import { getTask, hasTask, recorder, saveIndexSoon, saveMessages, setTaskStopper } from "./tasks.js";
import { gitSave, gitStart, gitStatus } from "./status.js";
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

const notifyText = {
  en: { done: "Finished", permission: "Needs your OK to continue", question: "Has a question for you" },
  ar: { done: "انتهت المهمة", permission: "تحتاج موافقتك للمتابعة", question: "لديها سؤال لك" },
};

/** Tell the person when a task finishes (or needs them) while they're in another window. */
function notifyIfAway(sender, task, e, lang) {
  const win = sender.isDestroyed() ? null : BrowserWindow.fromWebContents(sender);
  if (!win || win.isFocused() || !Notification.isSupported()) return;
  if (e.type === "error" && /stopp|توقف/i.test(e.message)) return; // the person stopped it themselves
  const body = e.type === "error" ? e.message : e.type === "question" ? `${notifyText[lang].question}: ${e.question}` : notifyText[lang][e.type];
  const note = new Notification({ title: task.meta.title, body, silent: false });
  note.on("click", () => {
    if (win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    win.webContents.send("task:open", task.meta.id);
  });
  note.show();
}

// "Allow for this task": tools whose careful requests the person allowed for the whole task.
// Kept next to the task's history, so it lasts across restarts and ends with the task.
const allowedFile = (task) => path.join(task.dir, "allowed.json");
async function allowedFor(task) {
  if (!task.allowed) {
    try { task.allowed = new Set(JSON.parse(await readFile(allowedFile(task), "utf8"))); } catch { task.allowed = new Set(); }
  }
  return task.allowed;
}

// ── Status bar: per-task totals (kept in the task's index entry) ──
function stats(task) {
  task.meta.stats ??= { tokensIn: 0, tokensOut: 0, estimated: false, apiMs: 0, workMs: 0 };
  return task.meta.stats;
}
function addUsage(task, e) {
  const st = stats(task);
  st.tokensIn += e.inputTokens; st.tokensOut += e.outputTokens; st.apiMs += e.ms;
  if (e.estimated) st.estimated = true;
}
function addWorkTime(task, ms) { stats(task).workMs += ms; saveIndexSoon(); }

export function initAgent() {
  // Deleting a task stops its run first.
  setTaskStopper((taskId) => { for (const run of runs.values()) if (run.taskId === taskId) run.session.stop(); });

  ipcMain.handle("agent:start", async (event, { taskId, prompt, language, folder, attachments, check, retry, pointed, detail, folderName: given }) => {
    const lang = language === "ar" ? "ar" : "en";
    const text = String(prompt);
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const chosen = typeof folder === "string" ? folder : undefined;
    const conn = connection();
    // A new task without a chosen folder gets one named by the model (short, English, descriptive).
    const named = typeof given === "string" ? toFolderName(given) : "";
    const folderName = chosen || hasTask(taskId) ? "" : named || (conn ? await suggestFolderName(conn, text) : "");
    const task = await getTask(taskId, { prompt: text, folder: chosen, folderName });
    const record = recorder(task);
    const send = (e) => {
      if (e.type === "usage") { addUsage(task, e); return; } // totals for the status bar; not part of the chat
      record(e);
      if (!event.sender.isDestroyed()) event.sender.send("agent:event", runId, e);
      if (e.type === "done" || e.type === "error" || e.type === "permission" || e.type === "question") notifyIfAway(event.sender, task, e, lang);
    };
    const { prompt: prepared, names } = await prepareAttachments(task.meta.folder, text, Array.isArray(attachments) ? attachments : []);
    // "Point at it": tell the model exactly which part of the page the person means.
    const pointNote = pointed?.context ? String(pointed.context).slice(0, 600) : "";
    const note = [await takeRewindNote(task), pointNote].filter(Boolean).join("\n");
    const request = !note ? prepared : typeof prepared === "string" ? `${note}

${prepared}` : [{ type: "text", text: note }, ...prepared];
    // "Try again": no second copy of the message. The model gets the request once, or, if the
    // error came halfway through, a note to carry on from where it stopped.
    let history = task.messages;
    let ask = request;
    if (retry) {
      record({ type: "retried" });
      const last = history[history.length - 1];
      if (last?.role === "user") { ask = last.content; history = history.slice(0, -1); }
      else ask = lang === "ar" ? "توقّف الطلب السابق بسبب خطأ. تابع من حيث توقفت." : "The last request was cut off by an error. Carry on from where you stopped.";
    } else {
      record({ type: "user", text, ...(names.length ? { attachments: names } : {}), ...(pointed?.label ? { pointed: String(pointed.label).slice(0, 140) } : {}) });
    }

    if (!conn) {
      setTimeout(() => send({ type: "error", ...notConnected[lang] }), 0);
      return { runId, folder: task.meta.folder };
    }

    const allowed = await allowedFor(task);
    const session = new AgentSession(ask, { connection: conn, workspace: task.workspace, checkpoints: task.checkpoints, language: lang, history, preApproved: (tool) => allowed.has(tool), check: check !== false, detail: detail === "short" ? "short" : "full" });
    /** requestId → tool, so "Allow for this task" knows what to remember. */
    const asked = new Map();
    session.onEvent((e) => { if (e.type === "permission" && e.tool) asked.set(e.requestId, e.tool); });
    runs.set(runId, { session, record, task, asked, taskId: task.meta.id });
    session.onEvent(send);
    const runStarted = Date.now();
    session.finished.then(() => addWorkTime(task, Date.now() - runStarted));
    let finishedWell = false;
    session.onEvent((e) => { if (e.type === "done") finishedWell = true; });
    session.finished.then(async () => {
      runs.delete(runId);
      await saveMessages(task, session.messages); // follow-ups (even after a restart) continue the conversation
      // "What next?": three short follow-ups, only after a task that finished well.
      if (!finishedWell) return;
      const answer = String([...session.messages].reverse().find((m) => m.role === "assistant" && m.content)?.content ?? "");
      // Usually the agent wrote them on its last NEXT: line; otherwise ask once (a backup).
      const written = splitNextLine(answer).next;
      const items = written.length ? written : await suggestNext(conn, text, answer, lang);
      if (items.length) send({ type: "suggestions", items });
    });
    return { runId, folder: task.meta.folder };
  });

  ipcMain.handle("agent:respond", async (_e, { runId, requestId, allowed, remember }) => {
    const run = runs.get(runId);
    if (!run) return;
    const tool = run.asked.get(String(requestId));
    const keep = !!allowed && !!remember && !!tool;
    if (keep) {
      const set = await allowedFor(run.task);
      set.add(tool);
      await writeFile(allowedFile(run.task), JSON.stringify([...set])).catch(() => {});
    }
    run.record({ type: "permission-answer", requestId: String(requestId), allowed: !!allowed, ...(keep ? { remember: true } : {}) });
    run.session.respond(String(requestId), !!allowed);
  });
  ipcMain.handle("agent:answer", (_e, { runId, requestId, text }) => {
    const run = runs.get(runId);
    if (!run) return;
    const answer = String(text ?? "").trim().slice(0, 2000);
    if (!answer) return;
    run.record({ type: "answer", requestId: String(requestId), text: answer });
    run.session.answer(String(requestId), answer);
  });
  // Status bar Git actions, in the task folder only.
  ipcMain.handle("git:start", async (_e, { taskId, message }) => {
    const task = await getTask(taskId);
    return task ? gitStart(task.meta.folder, String(message || "First version")) : { ok: false, reason: "failed" };
  });
  ipcMain.handle("git:save", async (_e, { taskId, message }) => {
    const task = await getTask(taskId);
    return task ? gitSave(task.meta.folder, String(message || "Saved version")) : { ok: false, reason: "failed" };
  });
  ipcMain.handle("status:get", async (_e, { taskId }) => {
    const task = taskId ? await getTask(taskId) : null;
    const own = currentConnection();
    const metrics = app.getAppMetrics();
    const ramMB = Math.round(metrics.reduce((sum, m) => sum + (m.memory?.workingSetSize ?? 0), 0) / 1024);
    return {
      model: own ? own.model : "Enceladus",
      git: task ? await gitStatus(task.meta.folder) : null,
      stats: task ? stats(task) : null,
      running: task ? [...runs.values()].some((r) => r.taskId === task.meta.id) : false,
      ramMB,
    };
  });
  ipcMain.handle("agent:stop", (_e, { runId }) => runs.get(runId)?.session.stop());

  ipcMain.handle("agent:restore", async (_e, { taskId, checkpointId, language }) => {
    const task = await getTask(taskId);
    if (!task) return { ok: false, message: language === "ar" ? "لم يعد هذا التراجع متاحًا." : "This Rewind point isn’t available any more." };
    try {
      const cp = (await task.checkpoints.all()).find((c) => c.id === String(checkpointId));
      // Going back can be undone: the files as they are now are kept in a new point first.
      const files = await task.checkpoints.restore(String(checkpointId), language === "ar" ? "قبل التراجع" : "Before going back");
      const undo = await task.checkpoints.latest();
      const record = recorder(task);
      record({ type: "restored", checkpointId: String(checkpointId) });
      if (undo) record({ type: "checkpoint", ...undo });
      const names = files.map((f) => path.relative(task.meta.folder, f) || f).join(", ");
      await writeFile(rewindNoteFile(task), `[The person used Rewind: the task folder is back to how it was ${cp ? `at "${cp.label}"` : "at an earlier point"}. Everything you changed after that point is undone${names ? ` (files put back: ${names})` : ""}. Read files again before relying on what you remember of them.]`);
      return { ok: true, checkpoint: undo };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  });
}
