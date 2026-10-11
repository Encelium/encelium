// Tasks that survive a restart: their folder, conversation (for the model), and what
// was shown on screen (to re-open them). Also: choosing a folder, and the live preview.
import { app, dialog, ipcMain, net, protocol, shell, BrowserWindow } from "electron";
import { existsSync, watch } from "node:fs";
import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Checkpoints, Workspace, fallbackFolderName } from "@enceladus/agent-core";
import { writeZip } from "./zip.js";

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
/**
 * A new task's folder in Documents\Enceladus: the model's suggested English name, or English
 * words from the request, or "new-project". A number is added only if the name is taken.
 */
function newFolder(prompt, suggested) {
  const parent = path.join(app.getPath("documents"), "Enceladus");
  const name = suggested || fallbackFolderName(prompt) || "new-project"; // English words only
  let folder = path.join(parent, name);
  for (let n = 2; existsSync(folder); n++) folder = path.join(parent, `${name}-${n}`);
  return folder;
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
/** True once a task exists (its folder is already decided). */
export const hasTask = (id) => index.some((t) => t.id === safeId(id));

export async function getTask(id, { prompt, folder, folderName } = {}) {
  id = safeId(id);
  if (open.has(id)) return open.get(id);
  let meta = index.find((t) => t.id === id);
  if (!meta) {
    if (prompt === undefined) return null;
    const root = folder ?? newFolder(prompt, folderName);
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

let indexTimer = null;
/** Save the task list soon (coalesces many small updates, e.g. status-bar totals). */
export function saveIndexSoon() {
  clearTimeout(indexTimer);
  indexTimer = setTimeout(() => { saveIndex().catch(() => {}); }, 1000);
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
    if (e.type === "thinking-delta") return; // live only
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

// Shown on the "before" side when the page was only just created (both languages: the page has no app language).
const NOT_YET = "This page didn’t exist yet · لم تكن هذه الصفحة موجودة بعد";

// The "point at it" picker, added to a preview page on request. It highlights what's under the
// pointer and reports the clicked part (tag, text, a short CSS path) to the app.
const PICKER = String.raw`<script>(function () {
  var box = document.createElement("div");
  box.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #0F6E8C;background:rgba(15,110,140,.12);border-radius:4px;transition:all .08s ease-out;display:none";
  document.documentElement.appendChild(box);
  document.documentElement.style.cursor = "crosshair";
  var cur = null;
  function cssPath(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 6) {
      var name = el.tagName.toLowerCase();
      if (el.id) { parts.unshift(name + "#" + el.id); break; }
      var i = 1, s = el;
      while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
      parts.unshift(name + (i > 1 ? ":nth-of-type(" + i + ")" : ""));
      el = el.parentElement;
    }
    return parts.join(" > ");
  }
  document.addEventListener("mousemove", function (e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === cur || el === document.documentElement || el === document.body) return;
    cur = el;
    var r = el.getBoundingClientRect();
    box.style.display = "block"; box.style.left = r.left + "px"; box.style.top = r.top + "px"; box.style.width = r.width + "px"; box.style.height = r.height + "px";
  }, true);
  document.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    var el = cur || e.target;
    var text = (el.innerText || el.getAttribute("alt") || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 120);
    parent.postMessage({ type: "enceladus-pick", tag: el.tagName.toLowerCase(), text: text, path: cssPath(el) }, "*");
  }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") parent.postMessage({ type: "enceladus-pick-cancel" }, "*"); });
})();</script>`;

function registerPreview() {
  protocol.handle(PREVIEW_SCHEME, async (request) => {
    const url = new URL(request.url);
    const task = await getTask(url.hostname);
    if (!task) return new Response("Not found", { status: 404 });
    try {
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      // "@before/<point>/<path>": the file as it was at that Rewind point (for before/after).
      const before = rel.match(/^@before\/([\w-]+)\/(.*)$/);
      if (before) rel = before[2] || "index.html";
      const file = await task.workspace.resolve(rel); // refuses anything outside the task folder
      const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
      const headers = { "content-type": type, "cache-control": "no-store" };
      let source = file;
      if (before) {
        const saved = await task.checkpoints.originalAt(before[1], file);
        if (saved && !saved.existed) {
          // The page didn't exist yet at that point: say so calmly instead of a blank error.
          if (!/^text\/html/.test(type)) return new Response("Not found", { status: 404 });
          return new Response(`<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:grid;place-items:center;font:15px system-ui,sans-serif;color:#6B7B88;background:#F3F6F9">${NOT_YET}</body>`, { headers });
        }
        if (saved?.content !== undefined) return new Response(Buffer.from(saved.content, "base64"), { headers });
        if (saved?.movedTo) source = saved.movedTo;
      }
      // "Point at it": the page gets a small picker (highlight on hover, report the clicked part).
      if (url.searchParams.has("enceladus-pick") && /^text\/html/.test(type)) {
        const page = await readFile(source, "utf8");
        const withPicker = /<\/body>/i.test(page) ? page.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${PICKER}</body>`) : page + PICKER;
        return new Response(withPicker, { headers });
      }
      const res = await net.fetch(pathToFileURL(source).toString());
      return new Response(res.body, { status: res.status, headers });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
}

// ── Deleting a task ─────────────────────────────────────────────────
let stopRuns = () => {};
export function setTaskStopper(fn) { stopRuns = fn; }

/** Forget a task: its history and Rewind copies. The person's files in its folder are NOT touched. */
async function deleteTask(id) {
  id = safeId(id);
  stopRuns(id);
  const task = open.get(id);
  task?.watcher?.close();
  open.delete(id);
  index = index.filter((t) => t.id !== id);
  await saveIndex();
  await rm(path.join(base(), id), { recursive: true, force: true });
}

// ── IPC ─────────────────────────────────────────────────────────────
export async function initTasks() {
  try { index = JSON.parse(await readFile(indexFile(), "utf8")); } catch { index = []; }
  registerPreview();

  ipcMain.handle("tasks:list", () => index.map(({ id, title, folder, updatedAt }) => ({ id, title, folder, updatedAt })));
  ipcMain.handle("tasks:events", (_e, { taskId }) => readEvents(taskId));
  ipcMain.handle("tasks:delete", (_e, { taskId }) => deleteTask(taskId));
  // "Today" on the home screen: the chats worked on today, with how many requests and file changes.
  ipcMain.handle("tasks:today", async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const out = [];
    for (const meta of index.filter((m) => m.updatedAt >= start.getTime()).slice(0, 8)) {
      const events = await readEvents(meta.id).catch(() => []);
      const files = new Set(events.filter((e) => e.type === "activity" && e.file).map((e) => e.file.to ?? e.file.path));
      out.push({ id: meta.id, title: meta.title, requests: events.filter((e) => e.type === "user").length, files: files.size, workMs: meta.stats?.workMs ?? 0 });
    }
    return out;
  });
  ipcMain.handle("tasks:rename", async (_e, { taskId, title }) => {
    const meta = index.find((t) => t.id === safeId(taskId));
    const clean = String(title ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (!meta || !clean) return false;
    meta.title = clean; // only the name in the list; the folder keeps its name
    await saveIndex();
    return true;
  });
  ipcMain.handle("tasks:open-folder", async (_e, { taskId }) => {
    const meta = index.find((t) => t.id === safeId(taskId));
    if (meta) await shell.openPath(meta.folder);
  });

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

  // ── Files tab: what's in the task folder, and a read-only look inside ──
  ipcMain.handle("files:list", async (_e, { taskId }) => {
    const task = await getTask(taskId);
    return task ? listFiles(task.meta.folder) : [];
  });
  ipcMain.handle("files:read", async (_e, { taskId, path: rel }) => {
    const task = await getTask(taskId);
    if (!task) return { kind: "missing" };
    try {
      const file = await task.workspace.resolve(String(rel ?? "")); // never outside the task folder
      const info = await stat(file);
      if (IMAGE.test(file)) return { kind: "image", size: info.size };
      if (info.size > MAX_VIEW_BYTES) return { kind: "large", size: info.size };
      const buf = await readFile(file);
      if (buf.subarray(0, 8000).includes(0)) return { kind: "binary", size: info.size };
      return { kind: "text", size: info.size, text: buf.toString("utf8") };
    } catch {
      return { kind: "missing" };
    }
  });
  // "Save as zip": the whole task folder (minus tool caches), wherever the person chooses.
  ipcMain.handle("files:zip", async (event, { taskId }) => {
    const task = await getTask(taskId);
    if (!task) return { ok: false, reason: "missing" };
    const name = path.basename(task.meta.folder);
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: path.join(app.getPath("downloads"), `${name}.zip`),
      filters: [{ name: "Zip", extensions: ["zip"] }],
    });
    if (canceled || !filePath) return { ok: false, reason: "canceled" };
    const files = await zipList(task.meta.folder, name);
    if (!files.length) return { ok: false, reason: "empty" };
    try {
      await writeZip(filePath, files);
    } catch (e) {
      await rm(filePath, { force: true }).catch(() => {});
      return { ok: false, reason: e.message === "too-big" || e.message === "too-many" ? e.message : "failed" };
    }
    shell.showItemInFolder(filePath);
    return { ok: true, path: filePath, count: files.length };
  });

  // Shows the file in Explorer (never runs it: opening a .js or .bat directly would execute it).
  ipcMain.handle("files:show", async (_e, { taskId, path: rel }) => {
    const task = await getTask(taskId);
    if (!task) return;
    const file = await task.workspace.resolve(String(rel ?? "")).catch(() => null);
    if (file) shell.showItemInFolder(file);
  });
}

const IMAGE = /\.(png|jpe?g|gif|webp|svg|ico)$/i;
const MAX_VIEW_BYTES = 512 * 1024;
const SKIP_DIRS = new Set(["node_modules", ".git", ".venv", "venv", "__pycache__", ".next", "dist", "build", ".cache"]);

const ZIP_SKIP = new Set(["node_modules", ".git", ".venv", "venv", "__pycache__", ".cache"]);

/** Every file to put in the zip, named "<folder>/<path inside it>". */
async function zipList(root, top) {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (!ZIP_SKIP.has(entry.name)) await walk(full); }
      else if (entry.isFile()) out.push({ path: full, name: `${top}/${path.relative(root, full).replaceAll("\\", "/")}` });
    }
  }
  await walk(root);
  return out;
}

/** Files in the folder (relative paths, folders first), skipping bulky tool folders. At most 500. */
async function listFiles(root) {
  const out = [];
  async function walk(dir, depth) {
    if (depth > 6 || out.length >= 500) return;
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (out.length >= 500) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full, depth + 1);
      } else if (entry.isFile()) {
        const size = await stat(full).then((s) => s.size, () => 0);
        out.push({ path: path.relative(root, full).replaceAll("\\", "/"), size });
      }
    }
  }
  await walk(root, 0);
  return out;
}
