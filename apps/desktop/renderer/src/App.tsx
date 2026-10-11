import { useEffect, useRef, useState } from "react";
import { useMediaQuery, useRemembered, useRememberedNumber } from "./useLayout";
import { Splitter } from "./Splitter";
import { bridge, type Settings } from "./bridge";
import { strings } from "./i18n";
import { demoEngine } from "./agent/demo";
import { electronEngine } from "./agent/electron";
import type { AgentEngine } from "./agent/types";

// The real engine inside the desktop app; the scripted demo in a plain browser (design work).
const engineCache = new Map<string, AgentEngine>();
function engineFor(taskId: string): AgentEngine {
  if (!bridge.agent) return demoEngine;
  let engine = engineCache.get(taskId);
  if (!engine) { engine = electronEngine(bridge.agent, taskId); engineCache.set(taskId, engine); }
  return engine;
}
import { TitleBar } from "./TitleBar";
import { Sidebar, SidebarRail } from "./Sidebar";
import { Home } from "./Home";
import { Work } from "./Work";
import { SettingsDialog } from "./SettingsDialog";
import { Welcome } from "./Welcome";
import { SaveRecipeDialog } from "./SaveRecipe";
import { StatusBar } from "./StatusBar";
import { ModelDialog } from "./ModelDialog";
import { Button, Dialog, Toast } from "@enceladus/ui";
import type { Attachment } from "./bridge";

/** prompt/folder are set for a brand-new task; a saved task re-opens without them. */
type View = { kind: "home" } | { kind: "task"; id: string; prompt?: string; folder?: string; attachments?: Attachment[]; folderName?: string };
type Notice = { message: string; tone: "safe" | "neutral" };

function taskTitle(prompt: string) {
  const text = prompt.trim().replace(/\s+/g, " ");
  return text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text;
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Notices fade on their own after a few seconds (they can still be closed sooner).
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 6000); return () => clearTimeout(timer); }, [notice]);
  const [view, setView] = useState<View>({ kind: "home" });
  // Saved tasks (desktop app) or this session's tasks (browser preview, demo agent).
  const [tasks, setTasks] = useState<{ id: string; title: string; prompt?: string; folder?: string }[]>([]);
  const [deleting, setDeleting] = useState<{ id: string; title: string; folder?: string } | null>(null);
  const [savingRecipe, setSavingRecipe] = useState<{ id: string; title: string } | null>(null);
  // Chats with a task still working (also ones not on screen), for the sidebar's dot.
  const [workingIds, setWorkingIds] = useState<string[]>([]);
  useEffect(() => {
    const timer = setInterval(() => {
      const ids = [...engineCache.entries()].filter(([, e]) => e.active?.()).map(([id]) => id);
      setWorkingIds((prev) => (prev.join() === ids.join() ? prev : ids));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  // Bumped when a task is re-opened, so the screen starts fresh.
  const [openCount, setOpenCount] = useState(0);

  // Layout. Wide windows dock the sidebar and the right panel; smaller ones slide them over the
  // chat instead, closed until asked for. Compact mode is a small chat-only window.
  const [sidebarDocked, setSidebarDocked] = useRemembered("enceladus.sidebar", true);
  const [panelDocked, setPanelDocked] = useRemembered("enceladus.panel", true);
  const [sidebarOver, setSidebarOver] = useState(false);
  const [panelOver, setPanelOver] = useState(false);
  const [compact, setCompact] = useState(false);
  const [onTop, setOnTop] = useState(false);
  const [searchRequest, setSearchRequest] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useRememberedNumber("enceladus.sidebarWidth", 256);
  const bodyRef = useRef<HTMLDivElement>(null);
  const narrow = useMediaQuery("(max-width: 900px)");
  const roomy = useMediaQuery("(min-width: 1100px)");
  const sidebarMode = compact || narrow ? "overlay" : "docked";
  const panelMode = compact || !roomy ? "overlay" : "docked";
  const sidebarOpen = sidebarMode === "docked" ? sidebarDocked : sidebarOver;
  const panelOpen = panelMode === "docked" ? panelDocked : panelOver;
  const toggleSidebar = () => (sidebarMode === "docked" ? setSidebarDocked(!sidebarDocked) : setSidebarOver(!sidebarOver));
  const togglePanel = () => (panelMode === "docked" ? setPanelDocked(!panelDocked) : setPanelOver(!panelOver));
  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    setSidebarOver(false);
    setPanelOver(false);
    if (!next) setOnTop(false);
    bridge.window?.setCompact(next);
  };
  const toggleOnTop = () => { setOnTop(!onTop); bridge.window?.setOnTop(!onTop); };

  useEffect(() => {
    bridge.getSettings().then(setSettings);
    bridge.tasks?.list().then((saved) => setTasks(saved.map((x) => ({ id: x.id, title: taskTitle(x.title), folder: x.folder }))));
    return bridge.onEffectiveTheme((effectiveTheme) => setSettings((s) => (s ? { ...s, effectiveTheme } : s)));
  }, []);

  // Theme and language live on <html>, so every component (and dialogs in portals) follows them.
  useEffect(() => {
    if (!settings) return;
    const el = document.documentElement;
    el.dataset.theme = settings.effectiveTheme;
    el.lang = settings.language;
    el.dir = settings.language === "ar" ? "rtl" : "ltr";
    document.title = strings[settings.language].appName;
  }, [settings]);

  // Keyboard shortcuts. Keys are matched by position (e.code), so they work with an Arabic layout too.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // A notification was clicked: show that task.
  const openRef = useRef<(id: string) => void>(() => {});
  useEffect(() => bridge.tasks?.onOpenRequest((id) => openRef.current(id)), []);

  if (!settings) return null; // settings arrive within a frame; avoid a flash of the wrong theme/language

  const t = strings[settings.language];
  const update = (patch: Partial<Pick<Settings, "theme" | "language" | "welcomed" | "detail">>) => bridge.setSettings(patch).then(setSettings);

  const startTask = (prompt: string, folder?: string, attachments?: Attachment[], meta?: { title: string; folderName: string }) => {
    const id = `task-${Date.now()}`;
    setTasks((prev) => [{ id, title: taskTitle(meta?.title || prompt || attachments?.[0]?.name || ""), prompt }, ...prev]);
    setView({ kind: "task", id, prompt, folder, attachments, folderName: meta?.folderName });
    // A recipe's chat is named after the recipe, not its long request.
    if (meta?.title) setTimeout(() => bridge.tasks?.rename({ taskId: id, title: meta.title }), 1200);
    // The folder is only known once the task starts; refresh the list to get it.
    setTimeout(() => bridge.tasks?.list().then((saved) => setTasks((prev) => prev.map((x) => ({ ...x, folder: saved.find((s) => s.id === x.id)?.folder ?? x.folder })))), 1500);
  };

  const confirmDelete = async () => {
    if (!deleting || !bridge.tasks) return;
    await bridge.tasks.delete({ taskId: deleting.id });
    setTasks((prev) => prev.filter((x) => x.id !== deleting.id));
    if (view.kind === "task" && view.id === deleting.id) setView({ kind: "home" });
    setDeleting(null);
    setNotice({ message: t.deleted, tone: "safe" });
  };
  const openTask = (id: string) => {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    setSidebarOver(false); // a slid-over sidebar gets out of the way once something is picked
    if (view.kind === "task" && view.id === id) return;
    setOpenCount((n) => n + 1);
    // The desktop app re-opens the saved history; the browser demo has nothing saved, so it re-runs.
    setView(bridge.tasks ? { kind: "task", id } : { kind: "task", id, prompt: task.prompt });
  };

  const renameTask = async (id: string, title: string) => {
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, title: taskTitle(title) } : x)));
    await bridge.tasks?.rename({ taskId: id, title });
  };
  const newTask = () => { setSidebarOver(false); setView({ kind: "home" }); };
  openRef.current = openTask;
  keys.current = (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const handled = (() => {
      if (e.shiftKey) return e.code === "KeyM" ? (toggleCompact(), true) : false;
      switch (e.code) {
        case "KeyN": newTask(); return true;
        case "KeyB": toggleSidebar(); return true;
        case "Backslash": if (view.kind === "task") togglePanel(); return true;
        case "Comma": setSettingsOpen(true); return true;
        case "KeyK": openSearch(); return true;
        default: return false;
      }
    })();
    if (handled) e.preventDefault();
  };

  // Sidebar folded away (and not compact mode): a slim bar keeps the main buttons in reach.
  const showRail = !compact && !(sidebarMode === "docked" && sidebarOpen);
  const bodyClass = ["app-body", sidebarMode === "docked" && sidebarOpen ? "with-sidebar" : showRail ? "with-rail" : "", compact ? "is-compact" : ""].filter(Boolean).join(" ");
  const openSearch = () => { if (sidebarMode === "docked") setSidebarDocked(true); else setSidebarOver(true); setSearchRequest((n) => n + 1); };

  return (
    <div className="app">
      <TitleBar
        t={t}
        sidebar={{ open: sidebarOpen, onToggle: toggleSidebar }}
        panel={view.kind === "task" ? { open: panelOpen, onToggle: togglePanel } : undefined}
        compact={bridge.window ? { on: compact, onToggle: toggleCompact } : undefined}
        onTop={compact && bridge.window ? { on: onTop, onToggle: toggleOnTop } : undefined}
      />
      <div ref={bodyRef} className={bodyClass} style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}>
        {showRail && <SidebarRail t={t} onNewTask={newTask} onSearch={openSearch} onOpenSettings={() => setSettingsOpen(true)} />}
        {sidebarMode === "overlay" && sidebarOpen && <div className="app-scrim" onClick={() => setSidebarOver(false)} />}
        {sidebarOpen && <div className={sidebarMode === "overlay" ? "app-sidebar-over" : "app-sidebar"}><Sidebar
          t={t}
          tasks={tasks.map((x) => ({ id: x.id, title: x.title, working: workingIds.includes(x.id) }))}
          currentTaskId={view.kind === "task" ? view.id : null}
          onNewTask={newTask}
          onOpenTask={openTask}
          onDeleteTask={bridge.tasks ? (id) => { const task = tasks.find((x) => x.id === id); if (task) setDeleting(task); } : undefined}
          onRenameTask={bridge.tasks ? renameTask : undefined}
          onSaveRecipe={bridge.recipes ? (id) => { const task = tasks.find((x) => x.id === id); if (task) setSavingRecipe({ id, title: task.title }); } : undefined}
          onOpenSettings={() => setSettingsOpen(true)}
          searchRequest={searchRequest}
        />{sidebarMode === "docked" && (
          <Splitter className="app-sidebar-handle" label={t.layout.resize} width={sidebarWidth} onChange={setSidebarWidth} containerRef={bodyRef} min={200} max={420} minAfter={480} initial={256} />
        )}</div>}
        {view.kind === "home" ? (
          <Home t={t} theme={settings.effectiveTheme} language={settings.language} onOpenTask={openTask} onSubmit={startTask} onNotice={(message) => setNotice({ message, tone: "neutral" })} />
        ) : (
          <Work
            key={`${view.id}-${openCount}`}
            t={t}
            taskId={view.id}
            prompt={view.prompt}
            folder={view.folder}
            attachments={view.attachments}
            folderName={view.folderName}
            language={settings.language}
            engine={engineFor(view.id)}
            detail={settings.detail}
            panel={{
              open: panelOpen,
              mode: panelMode,
              onClose: () => (panelMode === "docked" ? setPanelDocked(false) : setPanelOver(false)),
              onOpen: () => (panelMode === "docked" ? setPanelDocked(true) : setPanelOver(true)),
            }}
          />
        )}
      </div>
      <SettingsDialog
        t={t}
        open={settingsOpen}
        settings={settings}
        onChange={update}
        onOpenModel={() => { setSettingsOpen(false); setModelOpen(true); }}
        onClose={() => setSettingsOpen(false)}
      />
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t.deleteTitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>{t.deleteCancel}</Button>
            <Button variant="danger" icon="trash" onClick={confirmDelete}>{t.deleteConfirm}</Button>
          </>
        }
      >
        <p className="app-dialog-text">{t.deleteBody}</p>
        {deleting?.folder && (
          <p className="app-dialog-path">
            <code dir="ltr">{deleting.folder}</code>
            <Button variant="ghost" size="sm" icon="folder" onClick={() => bridge.tasks?.openFolder({ taskId: deleting.id })}>{t.openFolder}</Button>
          </p>
        )}
      </Dialog>
      {view.kind === "task" && !compact && <StatusBar t={t} taskId={view.id} onOpenModel={() => setModelOpen(true)} onNotice={(message) => setNotice({ message, tone: "neutral" })} />}
      <SaveRecipeDialog t={t} task={savingRecipe} onClose={() => setSavingRecipe(null)} onSaved={(message) => setNotice({ message, tone: "safe" })} />
      <Welcome
        t={t}
        open={!settings.welcomed}
        language={settings.language}
        onLanguage={(language) => update({ language })}
        onDone={() => update({ welcomed: true })}
      />
      <ModelDialog t={t} open={modelOpen} onClose={() => setModelOpen(false)} onSaved={(message) => setNotice({ message, tone: "safe" })} />
      {notice && (
        <div className="app-toast">
          <Toast tone={notice.tone} message={notice.message} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss} />
        </div>
      )}
    </div>
  );
}
