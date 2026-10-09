import { useEffect, useState } from "react";
import { Toast } from "@enceladus/ui";
import { bridge, type Settings } from "./bridge";
import { strings } from "./i18n";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { Home } from "./Home";
import { SettingsDialog } from "./SettingsDialog";

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  return (
    <div className="app">
      <TitleBar t={t} />
      <div className="app-body">
        <Sidebar t={t} onOpenSettings={() => setSettingsOpen(true)} onNewTask={() => setNotice(null)} />
        <Home t={t} onSubmit={() => setNotice(t.notConnected)} />
      </div>
      <SettingsDialog t={t} open={settingsOpen} settings={settings} onChange={update} onClose={() => setSettingsOpen(false)} />
      {notice && (
        <div className="app-toast">
          <Toast tone="neutral" message={notice} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss} />
        </div>
      )}
    </div>
  );
}
