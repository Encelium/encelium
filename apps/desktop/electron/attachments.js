// Files the person attaches to a request. They are copied into the task folder (so the
// agent can work with them and the person can find them), and pictures are also shown
// to the model directly.
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
const MAX_FILE = 50 * 1024 * 1024; // copy limit
const MAX_IMAGE = 5 * 1024 * 1024; // what we send to the model

export const kindOf = (file) => (IMAGE_TYPES[path.extname(file).toLowerCase()] ? "image" : "file");

/** Describe files picked or dropped by the person (no copying yet). */
async function describe(paths) {
  const out = [];
  for (const p of paths) {
    const info = await stat(p).catch(() => null);
    if (!info?.isFile()) continue;
    out.push({ path: p, name: path.basename(p), size: info.size, kind: kindOf(p) });
  }
  return out;
}

/**
 * Copy attachments into <task folder>/attachments and build the request for the model:
 * the person's words, a note listing where the files are, and the pictures themselves.
 */
export async function prepareAttachments(taskFolder, text, attachments) {
  if (!attachments?.length) return { prompt: text, names: [] };
  const dir = path.join(taskFolder, "attachments");
  await mkdir(dir, { recursive: true });
  const saved = [];
  const images = [];
  for (const a of attachments) {
    const info = await stat(a.path).catch(() => null);
    if (!info?.isFile() || info.size > MAX_FILE) continue;
    let target = path.join(dir, path.basename(a.path));
    for (let i = 2; await stat(target).then(() => true, () => false); i++) {
      const { name, ext } = path.parse(a.path);
      target = path.join(dir, `${name} (${i})${ext}`);
    }
    await copyFile(a.path, target);
    const rel = `attachments/${path.basename(target)}`;
    saved.push(rel);
    const mediaType = IMAGE_TYPES[path.extname(target).toLowerCase()];
    if (mediaType && info.size <= MAX_IMAGE) images.push({ type: "image", mediaType, base64: (await readFile(target)).toString("base64") });
  }
  if (!saved.length) return { prompt: text, names: [] };
  const note = `\n\n[The person attached ${saved.length === 1 ? "this file" : "these files"} (copied into the task folder): ${saved.join(", ")}]`;
  const prompt = images.length ? [{ type: "text", text: text + note }, ...images] : text + note;
  return { prompt, names: saved.map((s) => path.basename(s)) };
}

export function initAttachments() {
  ipcMain.handle("attachments:choose", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, { properties: ["openFile", "multiSelections"] });
    return result.canceled ? [] : describe(result.filePaths);
  });
  // Paths come from files dropped on the window (resolved by the preload script).
  // A picture pasted with Ctrl+V: saved as a file first, then attached like any other.
  ipcMain.handle("attachments:save-pasted", async (_e, { data, type }) => {
    const ext = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp" }[type];
    const buf = Buffer.from(String(data ?? ""), "base64");
    if (!ext || !buf.length || buf.length > MAX_FILE) return null;
    const dir = path.join(app.getPath("temp"), "enceladus-pasted");
    await mkdir(dir, { recursive: true });
    const d = new Date(), two = (n) => String(n).padStart(2, "0");
    const name = `pasted-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}${ext}`;
    const file = path.join(dir, name);
    await writeFile(file, buf);
    return { path: file, name, size: buf.length, kind: "image" };
  });
  ipcMain.handle("attachments:describe", (_e, { paths }) => describe(Array.isArray(paths) ? paths.map(String) : []));
}
