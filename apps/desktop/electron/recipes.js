// The person's own recipes ("Save as recipe" on a chat that went well), kept in recipes.json.
import { app, ipcMain } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = () => path.join(app.getPath("userData"), "recipes.json");
let list = null;

async function load() {
  if (list) return list;
  try { list = JSON.parse(await readFile(file(), "utf8")); } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  return list;
}
async function save() {
  await mkdir(path.dirname(file()), { recursive: true });
  await writeFile(file(), JSON.stringify(list, null, 2));
}

export function initRecipes() {
  ipcMain.handle("recipes:list", () => load());
  ipcMain.handle("recipes:save", async (_e, { title, prompt }) => {
    const t = String(title ?? "").trim().slice(0, 80), p = String(prompt ?? "").trim().slice(0, 8000);
    if (!t || !p) return null;
    await load();
    const recipe = { id: `mine-${Date.now().toString(36)}`, title: t, prompt: p, createdAt: Date.now() };
    list.unshift(recipe);
    await save();
    return recipe;
  });
  ipcMain.handle("recipes:delete", async (_e, { id }) => {
    await load();
    list = list.filter((r) => r.id !== String(id));
    await save();
  });
}
