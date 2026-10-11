import { useEffect, useState } from "react";
import { Button, Dialog, Segmented } from "@enceladus/ui";
import { bridge, type Language, type ModelState, type Settings, type ThemeSetting } from "./bridge";
import type { Strings } from "./i18n";
import s from "./SettingsDialog.module.css";

interface Props {
  t: Strings;
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Pick<Settings, "theme" | "language" | "detail">>) => void;
  onOpenModel: () => void;
  onClose: () => void;
}

export function SettingsDialog({ t, open, settings, onChange, onOpenModel, onClose }: Props) {
  const d = t.settingsDialog;
  const [model, setModel] = useState<ModelState>({ mode: "enceladus" });
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([bridge.models.get(), bridge.models.presets()]).then(([state, presets]) => {
      setModel(state);
      if (state.mode === "own") setProviderName(presets.find((p) => p.id === state.presetId)?.name ?? state.baseUrl ?? "");
    });
  }, [open]);

  const modelLabel = model.mode === "own"
    ? d.usingOwn.replace("{provider}", providerName).replace("{model}", model.model)
    : d.usingEnceladus;

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
        <div className={s.row}>
          <span className={s.label}>{d.detail}</span>
          <Segmented<"full" | "short">
            ariaLabel={d.detail}
            value={settings.detail}
            onChange={(detail) => onChange({ detail })}
            options={[{ value: "full", label: d.detailFull }, { value: "short", label: d.detailShort }]}
          />
        </div>

        <section className={s.advanced} aria-labelledby="settings-advanced">
          <h3 id="settings-advanced" className={s.sectionTitle}>{d.advanced}</h3>
          <div className={s.modelRow}>
            <div className={s.modelText}>
              <span className={s.label}>{d.modelRow}</span>
              <span className={s.value} dir="auto">{modelLabel}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={onOpenModel}>{model.mode === "own" ? d.edit : d.change}</Button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
