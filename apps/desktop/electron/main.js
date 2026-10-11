// Enceladus — Electron main process.
// Owns the window, the native title bar buttons, and the user's settings file.
import { app, BrowserWindow, clipboard, ipcMain, nativeImage, nativeTheme, screen, shell } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initModels } from "./models.js";
import { initAgent } from "./agent.js";
import { initTasks } from "./tasks.js";
import { initAttachments } from "./attachments.js";
import { initRecipes } from "./recipes.js";
import { initAccess } from "./access.js";

const here = path.dirname(fileURLToPath(import.meta.url));
app.setName("Enceladus"); // user data lives in %APPDATA%\Enceladus, not under the package name
// Automated tests run in their own profile, so they never touch the person's chats or settings
// (and can run while the person's copy is open: the single-instance lock is per profile).
if (process.env.ENCELADUS_PROFILE_DIR) app.setPath("userData", process.env.ENCELADUS_PROFILE_DIR);
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
  welcomed: false, // the first-run welcome has been seen
  detail: "full", // how the agent explains: "full" (beginners) or "short"
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
  if (typeof patch?.welcomed === "boolean") out.welcomed = patch.welcomed;
  if (["full", "short"].includes(patch?.detail)) out.detail = patch.detail;
  return out;
}

const effectiveTheme = () => (nativeTheme.shouldUseDarkColors ? "dark" : "light");

// ── Window ──────────────────────────────────────────────────────────
let win = null;
const NORMAL_MIN = { width: 720, height: 520 };
const COMPACT = { width: 460, height: 760, minWidth: 380, minHeight: 480 };
/** Where the window was before compact mode, to go back to it. */
let normalBounds = null;

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
    minWidth: NORMAL_MIN.width,
    minHeight: NORMAL_MIN.height,
    show: false,
    title: "Enceladus",
    icon: path.join(here, "../build/icon.ico"),
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

// Compact mode: a small chat-only window (the screen hides the sidebar and panel itself).
ipcMain.handle("window:compact", (_event, on) => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  if (on) {
    normalBounds = win.getBounds();
    const area = screen.getDisplayMatching(normalBounds).workArea;
    win.setMinimumSize(COMPACT.minWidth, COMPACT.minHeight);
    // Keep the top-right corner where it was, so the window shrinks in place.
    const x = Math.max(area.x, Math.min(normalBounds.x + normalBounds.width - COMPACT.width, area.x + area.width - COMPACT.width));
    win.setBounds({ x, y: Math.max(area.y, normalBounds.y), width: COMPACT.width, height: Math.min(COMPACT.height, area.height) }, true);
  } else {
    win.setAlwaysOnTop(false);
    win.setMinimumSize(NORMAL_MIN.width, NORMAL_MIN.height);
    if (normalBounds) win.setBounds(normalBounds, true);
    normalBounds = null;
  }
});
ipcMain.handle("window:on-top", (_event, on) => win?.setAlwaysOnTop(!!on));

// Taskbar: a progress bar under the icon while a task runs (a fraction when there's a plan,
// a moving bar when there isn't), and a small dot on the icon. Cleared when the task ends.
let workingDot = null;
function dotImage() {
  if (workingDot) return workingDot;
  const size = 16, buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8), i = (y * size + x) * 4;
    const ring = d <= 7.5, core = d <= 5.5;
    const [b, g, r] = core ? [0xe0, 0xb8, 0x2f] : [0xff, 0xff, 0xff]; // BGRA: accent core, white ring
    buf[i] = b; buf[i + 1] = g; buf[i + 2] = r;
    buf[i + 3] = ring ? Math.round(255 * Math.min(1, 7.5 - d + 0.5)) : 0;
  }
  return (workingDot = nativeImage.createFromBitmap(buf, { width: size, height: size }));
}
ipcMain.handle("window:progress", (_event, state) => {
  if (!win) return;
  if (!state) {
    win.setProgressBar(-1);
    win.setOverlayIcon(null, "");
    return;
  }
  const value = typeof state.value === "number" ? Math.max(0, Math.min(1, state.value)) : null;
  win.setProgressBar(value ?? 2, { mode: value === null ? "indeterminate" : "normal" });
  win.setOverlayIcon(dotImage(), String(state.label ?? "Working"));
});
ipcMain.handle("clipboard:write", (_event, text) => clipboard.writeText(String(text ?? "")));

// ── App lifecycle ───────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.setAppUserModelId("app.enceladus.desktop"); // lets Windows show our notifications
  app.whenReady().then(async () => {
    await loadSettings();
    await initModels();
    await initAccess();
    await initTasks();
    initAgent();
    initAttachments();
    initRecipes();
    nativeTheme.themeSource = settings.theme;
    nativeTheme.on("updated", applyChrome);
    createWindow();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
