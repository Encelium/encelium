import { Button, Dialog, Icon, Segmented, type IconName } from "@enceladus/ui";
import type { Language } from "./bridge";
import type { Strings } from "./i18n";
import s from "./Welcome.module.css";

const points: { icon: IconName; key: "say" | "watch" | "undo" }[] = [
  { icon: "pencil", key: "say" },
  { icon: "shield", key: "watch" },
  { icon: "rewind", key: "undo" },
];

/** Shown once, on the very first start: what Enceladus does, in three lines, and the language. */
export function Welcome({ t, open, language, onLanguage, onDone }: {
  t: Strings;
  open: boolean;
  language: Language;
  onLanguage: (language: Language) => void;
  onDone: () => void;
}) {
  const w = t.welcome;
  return (
    <Dialog open={open} onClose={onDone} title={w.title} size="lg" actions={<Button variant="primary" size="lg" onClick={onDone}>{w.start}</Button>}>
      <div className={s.body}>
        <div className={s.language}>
          <Segmented<Language>
            ariaLabel={t.settingsDialog.language}
            value={language}
            onChange={onLanguage}
            options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]}
          />
        </div>
        <p className={s.intro}>{w.intro}</p>
        <ul className={s.points}>
          {points.map((p) => (
            <li key={p.key}>
              <span className={s.icon}><Icon name={p.icon} size={20} /></span>
              <span>
                <strong>{w[p.key].title}</strong>
                <span className={s.detail}>{w[p.key].body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className={s.privacy}><Icon name="lock" size={14} />{t.privacy}</p>
      </div>
    </Dialog>
  );
}
