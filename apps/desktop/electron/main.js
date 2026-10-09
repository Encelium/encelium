// Enceladus — Electron main process.
// Owns the window, the native title bar buttons, and the user's settings file.
import { app, BrowserWindow, ipcMain, nativeTheme, shell } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initModels } from "./models.js";
import { initAgent } from "./agent.js";

const here = path.dirname(fileURLToPath(import.meta.url));
app.setName("Enceladus"); // user data lives in %APPDATA%\Enceladus, not under the package name
const devUrl = process.env.ENCELADUS_DEV_URL;

// Title bar colors must match --color-bg-sunken / --color-text-muted in tokens.css.
const chrome = {
  light: { bg: "#F4F7FA", bar: "#EBF0F4", symbol: "#4A5866" },
  dark: { bg: "#0F1317", bar: "#12171C", symbol: "#A1ABB5" },
};
const TITLE_BAR_HEIGHT = 40;

// ── Settings ────────────────────────────────────────────────────────
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
const defaults = () => ({
  theme: "light", // light is the default; "dark" and "system" are options
  language: app.getLocale().toLowerCase().startsWith("ar") ? "ar" : "en",
});
let settings = defaults();

async function loadSettings() {
  try {
    const saved = JSON.parse(await readFile(settingsFile(), "utf8"));
    settings = { ...defaults(), ...pick(saved) };
  } catch {
    settings = defaults(); // first run, or an unreadable file: start clean
  }
}

async function saveSettings() {
  await mkdir(path.dirname(settingsFile()), { recursive: true });
  await writeFile(settingsFile(), JSON.stringify(settings, null, 2));
}

// Only accept known keys and values from the renderer.
function pick(patch) {
  const out = {};
  if (["light", "dark", "system"].includes(patch?.theme)) out.theme = patch.theme;
  if (["en", "ar"].includes(patch?.language)) out.language = patch.language;
  return out;
}

const effectiveTheme = () => (nativeTheme.shouldUseDarkColors ? "dark" : "light");

// ── Window ──────────────────────────────────────────────────────────
let win = null;

function applyChrome() {
  if (!win) return;
  const c = chrome[effectiveTheme()];
  win.setBackgroundColor(c.bg);
  if (process.platform === "win32") win.setTitleBarOverlay({ color: c.bar, symbolColor: c.symbol, height: TITLE_BAR_HEIGHT });
  win.webContents.send("theme:effective", effectiveTheme());
}

function createWindow() {
  const c = chrome[effectiveTheme()];
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Enceladus",
    backgroundColor: c.bg,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: c.bar, symbolColor: c.symbol, height: TITLE_BAR_HEIGHT },
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => { win = null; });

  // Never open other pages inside the app: web links go to the user's browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });

  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(here, "../dist/index.html"));
}

// ── IPC ─────────────────────────────────────────────────────────────
ipcMain.handle("settings:get", () => ({ ...settings, effectiveTheme: effectiveTheme() }));
ipcMain.handle("settings:set", async (_event, patch) => {
  settings = { ...settings, ...pick(patch) };
  nativeTheme.themeSource = settings.theme;
  applyChrome();
  await saveSettings();
  return { ...settings, effectiveTheme: effectiveTheme() };
});

// ── App lifecycle ───────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    await loadSettings();
    await initModels();
    initAgent();
    nativeTheme.themeSource = settings.theme;
    nativeTheme.on("updated", applyChrome);
    createWindow();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
