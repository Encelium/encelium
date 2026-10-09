import { useEffect, useState } from "react";
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
import { Sidebar } from "./Sidebar";
import { Home } from "./Home";
import { Work } from "./Work";
import { SettingsDialog } from "./SettingsDialog";
import { ModelDialog } from "./ModelDialog";
import { Button, Dialog, Toast } from "@enceladus/ui";
import type { Attachment } from "./bridge";

/** prompt/folder are set for a brand-new task; a saved task re-opens without them. */
type View = { kind: "home" } | { kind: "task"; id: string; prompt?: string; folder?: string; attachments?: Attachment[] };
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
  const [view, setView] = useState<View>({ kind: "home" });
  // Saved tasks (desktop app) or this session's tasks (browser preview, demo agent).
  const [tasks, setTasks] = useState<{ id: string; title: string; prompt?: string; folder?: string }[]>([]);
  const [deleting, setDeleting] = useState<{ id: string; title: string; folder?: string } | null>(null);
  // Bumped when a task is re-opened, so the screen starts fresh.
  const [openCount, setOpenCount] = useState(0);

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

  if (!settings) return null; // settings arrive within a frame; avoid a flash of the wrong theme/language

  const t = strings[settings.language];
  const update = (patch: Partial<Pick<Settings, "theme" | "language">>) => bridge.setSettings(patch).then(setSettings);

  const startTask = (prompt: string, folder?: string, attachments?: Attachment[]) => {
    const id = `task-${Date.now()}`;
    setTasks((prev) => [{ id, title: taskTitle(prompt || attachments?.[0]?.name || ""), prompt }, ...prev]);
    setView({ kind: "task", id, prompt, folder, attachments });
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
    if (view.kind === "task" && view.id === id) return;
    setOpenCount((n) => n + 1);
    // The desktop app re-opens the saved history; the browser demo has nothing saved, so it re-runs.
    setView(bridge.tasks ? { kind: "task", id } : { kind: "task", id, prompt: task.prompt });
  };

  return (
    <div className="app">
      <TitleBar t={t} />
      <div className="app-body">
        <Sidebar
          t={t}
          tasks={tasks.map((x) => ({ id: x.id, title: x.title }))}
          currentTaskId={view.kind === "task" ? view.id : null}
          onNewTask={() => setView({ kind: "home" })}
          onOpenTask={openTask}
          onDeleteTask={bridge.tasks ? (id) => { const task = tasks.find((x) => x.id === id); if (task) setDeleting(task); } : undefined}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {view.kind === "home" ? (
          <Home t={t} onSubmit={startTask} onNotice={(message) => setNotice({ message, tone: "neutral" })} />
        ) : (
          <Work
            key={`${view.id}-${openCount}`}
            t={t}
            taskId={view.id}
            prompt={view.prompt}
            folder={view.folder}
            attachments={view.attachments}
            language={settings.language}
            engine={engineFor(view.id)}
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
      <ModelDialog t={t} open={modelOpen} onClose={() => setModelOpen(false)} onSaved={(message) => setNotice({ message, tone: "safe" })} />
      {notice && (
        <div className="app-toast">
          <Toast tone={notice.tone} message={notice.message} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss} />
        </div>
      )}
    </div>
  );
}
