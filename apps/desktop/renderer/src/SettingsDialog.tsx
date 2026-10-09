import { Button, Dialog, Segmented } from "@enceladus/ui";
import type { Language, Settings, ThemeSetting } from "./bridge";
import type { Strings } from "./i18n";
import s from "./SettingsDialog.module.css";

interface Props {
  t: Strings;
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Pick<Settings, "theme" | "language">>) => void;
  onClose: () => void;
}

export function SettingsDialog({ t, open, settings, onChange, onClose }: Props) {
  const d = t.settingsDialog;
  return (
    <Dialog open={open} onClose={onClose} title={d.title} actions={<Button variant="primary" onClick={onClose}>{d.done}</Button>}>
      <div className={s.rows}>
        <div className={s.row}>
          <span className={s.label}>{d.theme}</span>
          <Segmented<ThemeSetting>
            ariaLabel={d.theme}
            value={settings.theme}
            onChange={(theme) => onChange({ theme })}
            options={[{ value: "light", label: d.light }, { value: "dark", label: d.dark }, { value: "system", label: d.system }]}
          />
        </div>
        <div className={s.row}>
          <span className={s.label}>{d.language}</span>
          <Segmented<Language>
            ariaLabel={d.language}
            value={settings.language}
            onChange={(language) => onChange({ language })}
            options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]}
          />
        </div>
      </div>
    </Dialog>
  );
}
