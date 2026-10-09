import { useEffect, useState, type ReactNode } from "react";
import { Button, IconButton, Tag, StatusIcon } from "../src";

type Lang = "en" | "ar";
type Theme = "light" | "dark";

const t = {
  en: {
    title: "Enceladus UI", subtitle: "Design system · foundations and first components",
    light: "Light", dark: "Dark", theme: "Theme", language: "Language",
    colors: "Colors", type: "Type", buttons: "Buttons", iconButtons: "Icon buttons", tags: "Tags", status: "Agent status",
    sample: "What do you want to make?", body: "Describe it in your own words. You can also drop files, folders or a screenshot here.",
    start: "Start", newTask: "New task", install: "Install it", notNow: "Not now", fixIt: "Fix it", rewind: "Rewind",
    del: "Delete 12 files", cancel: "Cancel", continue: "Continue", disabled: "Disabled",
    send: "Send", attach: "Add files", settings: "Settings", close: "Close", inUse: "In use",
    safe: "Safe", careful: "Careful", risky: "Risky", live: "Live", beta: "Beta",
    thinking: "Thinking", working: "Working", done: "Done",
    variant: { primary: "Primary", accent: "Accent", secondary: "Secondary", ghost: "Ghost", danger: "Danger" },
  },
  ar: {
    title: "واجهة إنسيلادوس", subtitle: "نظام التصميم · الأساسيات وأول المكوّنات",
    light: "فاتح", dark: "داكن", theme: "المظهر", language: "اللغة",
    colors: "الألوان", type: "الخطوط", buttons: "الأزرار", iconButtons: "أزرار الأيقونات", tags: "الوسوم", status: "حالة الوكيل",
    sample: "ماذا تريد أن تصنع؟", body: "صِفه بكلماتك. يمكنك أيضًا إفلات ملفات أو مجلدات أو لقطة شاشة هنا.",
    start: "ابدأ", newTask: "مهمة جديدة", install: "ثبّته", notNow: "ليس الآن", fixIt: "أصلِحه", rewind: "تراجع",
    del: "حذف ١٢ ملفًا", cancel: "إلغاء", continue: "متابعة", disabled: "غير متاح",
    send: "إرسال", attach: "إضافة ملفات", settings: "الإعدادات", close: "إغلاق", inUse: "في الاستخدام",
    safe: "آمن", careful: "انتباه", risky: "خطِر", live: "مباشر", beta: "تجريبي",
    thinking: "يفكّر", working: "يعمل", done: "تمّ",
    variant: { primary: "أساسي", accent: "مميّز", secondary: "ثانوي", ghost: "شفاف", danger: "خطِر" },
  },
};

const colorTokens = [
  "bg", "bg-sunken", "surface", "surface-muted", "border", "border-strong",
  "text", "text-muted", "text-subtle", "accent", "accent-soft", "primary",
  "safe", "careful", "risky", "code-bg",
];

const typeScale: [string, string][] = [["3xl", "semibold"], ["2xl", "semibold"], ["xl", "semibold"], ["lg", "regular"], ["base", "regular"], ["md", "regular"], ["sm", "regular"], ["xs", "regular"]];

export function Gallery() {
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<Lang>("en");
  const s = t[lang];

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.lang = lang;
    el.dir = lang === "ar" ? "rtl" : "ltr";
  }, [theme, lang]);

  return (
    <div className="g-page">
      <header className="g-header">
        <div>
          <h1 className="g-title">{s.title}</h1>
          <p className="g-sub">{s.subtitle}</p>
        </div>
        <div className="g-controls">
          <Segmented label={s.theme} value={theme} onChange={setTheme} options={[["light", s.light], ["dark", s.dark]]} />
          <Segmented label={s.language} value={lang} onChange={setLang} options={[["en", "English"], ["ar", "العربية"]]} />
        </div>
      </header>

      <Section title={s.colors}>
        <div className="g-swatches">
          {colorTokens.map((n) => (
            <div key={n} className="g-swatch">
              <span className="g-chip" style={{ background: `var(--color-${n})` }} />
              <code dir="ltr">--color-{n}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title={s.type}>
        <div className="g-type">
          {typeScale.map(([size, weight]) => (
            <div key={size} className="g-type-row">
              <code dir="ltr" className="g-type-label">{size} · {weight}</code>
              <span style={{ fontSize: `var(--text-${size})`, lineHeight: `var(--leading-${size})`, fontWeight: `var(--weight-${weight})`, letterSpacing: size.includes("xl") ? "var(--tracking-tight)" : undefined }}>
                {size.includes("xl") ? s.sample : s.body}
              </span>
            </div>
          ))}
          <div className="g-type-row">
            <code dir="ltr" className="g-type-label">mono</code>
            <code dir="ltr" style={{ fontSize: "var(--text-md)" }}>C:\Projects\SweetCrumb\index.html</code>
          </div>
        </div>
      </Section>

      <Section title={s.buttons}>
        <div className="g-grid">
          {(["primary", "accent", "secondary", "ghost", "danger"] as const).map((v) => (
            <div key={v} className="g-row">
              <span className="g-row-label">{s.variant[v]}</span>
              <Button variant={v} size="sm">{v === "danger" ? s.del : s.continue}</Button>
              <Button variant={v}>{v === "danger" ? s.del : s.continue}</Button>
              <Button variant={v} size="lg">{v === "danger" ? s.del : s.continue}</Button>
              <Button variant={v} disabled>{s.disabled}</Button>
            </div>
          ))}
          <div className="g-row">
            <span className="g-row-label">{s.inUse}</span>
            <Button variant="primary" icon="plus">{s.newTask}</Button>
            <Button variant="accent" iconEnd="arrowRight">{s.start}</Button>
            <Button variant="accent" icon="wrench">{s.fixIt}</Button>
            <Button variant="secondary" icon="rewind">{s.rewind}</Button>
            <Button variant="primary" icon="download">{s.install}</Button>
            <Button variant="secondary">{s.notNow}</Button>
            <Button variant="danger" icon="trash">{s.del}</Button>
            <Button variant="secondary">{s.cancel}</Button>
          </div>
        </div>
      </Section>

      <Section title={s.iconButtons}>
        <div className="g-row">
          <IconButton icon="arrowUp" label={s.send} variant="accent" />
          <IconButton icon="paperclip" label={s.attach} variant="secondary" />
          <IconButton icon="settings" label={s.settings} />
          <IconButton icon="close" label={s.close} size="sm" />
          <IconButton icon="arrowUp" label={s.send} variant="accent" size="lg" />
        </div>
      </Section>

      <Section title={s.tags}>
        <div className="g-row">
          <Tag tone="safe" dot>{s.safe}</Tag>
          <Tag tone="careful" dot>{s.careful}</Tag>
          <Tag tone="risky" dot>{s.risky}</Tag>
          <Tag tone="accent" dot>{s.live}</Tag>
          <Tag>{s.beta}</Tag>
        </div>
      </Section>

      <Section title={s.status}>
        <div className="g-row g-status">
          <span><StatusIcon status="thinking" label={s.thinking} /> {s.thinking}</span>
          <span><StatusIcon status="working" label={s.working} /> {s.working}</span>
          <span><StatusIcon status="done" label={s.done} /> {s.done}</span>
          <span className="g-big"><StatusIcon status="working" label={s.working} size={48} /></span>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="g-section">
      <h2 className="g-h2">{title}</h2>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="group" aria-label={label} className="g-seg">
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} className="g-seg-btn" onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}
