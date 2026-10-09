import { useEffect, useState } from "react";
import { bridge, type Settings } from "./bridge";
import { strings } from "./i18n";
import { demoEngine } from "./agent/demo";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { Home } from "./Home";
import { Work } from "./Work";
import { SettingsDialog } from "./SettingsDialog";

type View = { kind: "home" } | { kind: "task"; prompt: string; id: string };

function taskTitle(prompt: string) {
  const text = prompt.trim().replace(/\s+/g, " ");
  return text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text;
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "home" });
  // Tasks started this session. Kept in memory only for now.
  const [tasks, setTasks] = useState<{ id: string; prompt: string }[]>([]);
  // Bumped when a task is re-opened, so the screen starts fresh.
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    bridge.getSettings().then(setSettings);
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

  const startTask = (prompt: string) => {
    const id = `task-${Date.now()}`;
    setTasks((prev) => [{ id, prompt }, ...prev]);
    setView({ kind: "task", prompt, id });
  };
  const openTask = (id: string) => {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    if (view.kind === "task" && view.id === id) return;
    setOpenCount((n) => n + 1);
    setView({ kind: "task", prompt: task.prompt, id });
  };

  return (
    <div className="app">
      <TitleBar t={t} />
      <div className="app-body">
        <Sidebar
          t={t}
          tasks={tasks.map((x) => ({ id: x.id, title: taskTitle(x.prompt) }))}
          currentTaskId={view.kind === "task" ? view.id : null}
          onNewTask={() => setView({ kind: "home" })}
          onOpenTask={openTask}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {view.kind === "home" ? (
          <Home t={t} onSubmit={startTask} />
        ) : (
          <Work
            key={`${view.id}-${openCount}`}
            t={t}
            prompt={view.prompt}
            language={settings.language}
            engine={demoEngine}
            onNewTask={() => setView({ kind: "home" })}
          />
        )}
      </div>
      <SettingsDialog t={t} open={settingsOpen} settings={settings} onChange={update} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
