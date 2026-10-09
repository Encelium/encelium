// Tasks that survive a restart: their folder, conversation (for the model), and what
// was shown on screen (to re-open them). Also: choosing a folder, and the live preview.
import { app, dialog, ipcMain, net, protocol, shell, BrowserWindow } from "electron";
import { watch } from "node:fs";
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Checkpoints, Workspace } from "@enceladus/agent-core";

export const PREVIEW_SCHEME = "enceladus-preview";

// Must run before the app is ready.
protocol.registerSchemesAsPrivileged([{ scheme: PREVIEW_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

const base = () => path.join(app.getPath("userData"), "tasks");
const indexFile = () => path.join(base(), "index.json");
const safeId = (id) => String(id).toLowerCase().replace(/[^a-z0-9-]/g, "");

/** id → { meta, workspace, checkpoints, messages, watcher } */
const open = new Map();
let index = []; // [{ id, title, folder, createdAt, updatedAt }]

async function saveIndex() {
  await mkdir(base(), { recursive: true });
  await writeFile(indexFile(), JSON.stringify(index, null, 2));
}

// ── Folders ─────────────────────────────────────────────────────────
function folderName(prompt) {
  const words = prompt.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 6);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `${words.length ? words.join("-") : "task"}-${stamp}`;
}

/** Folders that are far too broad (or too important) to hand to an agent. */
function tooBroad(p) {
  const norm = (x) => path.resolve(x).toLowerCase().replace(/\\+$/, "");
  const full = norm(p);
  if (/^[a-z]:$/.test(full)) return true; // a whole drive
  // These folders themselves are too broad (pick a folder inside them instead)…
  const exact = ["home", "documents", "desktop", "downloads"].map((k) => norm(app.getPath(k)));
  // …and nothing inside these belongs to the person's projects.
  const under = [app.getPath("appData"), path.join(app.getPath("home"), "AppData"), process.env.WINDIR, process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.ProgramData]
    .filter(Boolean).map(norm);
  return exact.includes(full) || under.some((b) => full === b || full.startsWith(b + "\\"));
}

// ── Task lifecycle ──────────────────────────────────────────────────
export async function getTask(id, { prompt, folder } = {}) {
  id = safeId(id);
  if (open.has(id)) return open.get(id);
  let meta = index.find((t) => t.id === id);
  if (!meta) {
    if (prompt === undefined) return null;
    const root = folder ?? path.join(app.getPath("documents"), "Enceladus", folderName(prompt));
    meta = { id, title: titleOf(prompt), folder: root, createdAt: Date.now(), updatedAt: Date.now() };
    index.unshift(meta);
    await saveIndex();
  }
  await mkdir(meta.folder, { recursive: true });
  const dir = path.join(base(), id);
  let messages = [];
  try { messages = JSON.parse(await readFile(path.join(dir, "messages.json"), "utf8")); } catch { /* new task */ }
  const task = { meta, dir, workspace: new Workspace(meta.folder), checkpoints: new Checkpoints(dir), messages, watcher: null };
  task.watcher = watchFolder(task);
  open.set(id, task);
  return task;
}

function titleOf(prompt) {
  const text = prompt.trim().replace(/\s+/g, " ");
  return text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text;
}

export async function saveMessages(task, messages) {
  task.messages = messages;
  await mkdir(task.dir, { recursive: true });
  await writeFile(path.join(task.dir, "messages.json"), JSON.stringify(messages));
  task.meta.updatedAt = Date.now();
  index = [task.meta, ...index.filter((t) => t.id !== task.meta.id)];
  await saveIndex();
}

/** What the screen showed, so a task can be re-opened later. Streaming text is stored once, whole. */
export function recorder(task) {
  const file = path.join(task.dir, "events.jsonl");
  const pendingText = new Map();
  let chain = mkdir(task.dir, { recursive: true });
  const write = (e) => { chain = chain.then(() => appendFile(file, JSON.stringify(e) + "\n")).catch(() => {}); };
  return (e) => {
    if (e.type === "status") return;
    if (e.type === "message-delta") { pendingText.set(e.id, (pendingText.get(e.id) ?? "") + e.text); return; }
    if (e.type === "message-done") { write({ type: "message", text: pendingText.get(e.id) ?? "" }); pendingText.delete(e.id); return; }
    write(e);
  };
}

async function readEvents(id) {
  try {
    return (await readFile(path.join(base(), safeId(id), "events.jsonl"), "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

// Tell the window when the task's files change (for the live preview).
function watchFolder(task) {
  let timer = null;
  try {
    return watch(task.meta.folder, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const w of BrowserWindow.getAllWindows()) w.webContents.send("task:files-changed", task.meta.id);
      }, 250);
    });
  } catch { return null; }
}

// ── Live preview ────────────────────────────────────────────────────
const MIME = { ".html": "text/html", ".htm": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg" };

/** The page to preview: index.html at the top (or in a usual build folder), else the first .html file. */
async function findPage(task) {
  for (const p of ["index.html", "dist/index.html", "public/index.html", "build/index.html", "src/index.html"]) {
    if (await stat(path.join(task.meta.folder, p)).then((s) => s.isFile(), () => false)) return p;
  }
  const top = await readdir(task.meta.folder).catch(() => []);
  return top.find((f) => /\.html?$/i.test(f)) ?? null;
}

function registerPreview() {
  protocol.handle(PREVIEW_SCHEME, async (request) => {
    const url = new URL(request.url);
    const task = await getTask(url.hostname);
    if (!task) return new Response("Not found", { status: 404 });
    try {
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      const file = await task.workspace.resolve(rel); // refuses anything outside the task folder
      const res = await net.fetch(pathToFileURL(file).toString());
      const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
      return new Response(res.body, { status: res.status, headers: { "content-type": type, "cache-control": "no-store" } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
}

// ── IPC ─────────────────────────────────────────────────────────────
export async function initTasks() {
  try { index = JSON.parse(await readFile(indexFile(), "utf8")); } catch { index = []; }
  registerPreview();

  ipcMain.handle("tasks:list", () => index.map(({ id, title, folder, updatedAt }) => ({ id, title, folder, updatedAt })));
  ipcMain.handle("tasks:events", (_e, { taskId }) => readEvents(taskId));

  ipcMain.handle("folder:choose", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory"] });
    if (result.canceled || !result.filePaths[0]) return { ok: false, reason: "canceled" };
    const chosen = result.filePaths[0];
    if (tooBroad(chosen)) return { ok: false, reason: "too-broad" };
    return { ok: true, path: chosen, name: path.basename(chosen) };
  });

  ipcMain.handle("preview:find", async (_e, { taskId }) => {
    const task = await getTask(taskId);
    return task ? findPage(task) : null;
  });
  ipcMain.handle("preview:open", async (_e, { taskId, page }) => {
    const task = await getTask(taskId);
    if (!task) return;
    const file = await task.workspace.resolve(String(page ?? "")).catch(() => null);
    await shell.openPath(file ?? task.meta.folder);
  });
}
