import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Icon, Logo } from "@encelium/ui";
import "@encelium/ui/styles.css";
import "./site.css";

// TODO(set before launch): the real inbox. Until a domain exists this is a placeholder.
const CONTACT_EMAIL = "hello@encelium.example";

type Lang = "en" | "ar";

const COPY = {
  en: {
    title: "Talk to us",
    sub: "Questions, beta feedback, or the thing you'd build first — we read everything.",
    name: "Your name",
    email: "Your email",
    message: "What's on your mind?",
    send: "Send message",
    opens: "Opens your email app with the message ready.",
    or: "Or write to us directly:",
    copy: "Copy address",
    copied: "Copied",
    back: "Back to the site",
    need: "All fields help us reply properly.",
  },
  ar: {
    title: "تحدّث إلينا",
    sub: "أسئلة، أو ملاحظات على التجربة، أو أول شيء ستبنيه — نقرأ كل شيء.",
    name: "اسمك",
    email: "بريدك الإلكتروني",
    message: "ما الذي يشغل بالك؟",
    send: "أرسل الرسالة",
    opens: "يفتح تطبيق البريد لديك والرسالة جاهزة.",
    or: "أو اكتب لنا مباشرة:",
    copy: "انسخ العنوان",
    copied: "تم النسخ",
    back: "العودة إلى الموقع",
    need: "كل الحقول تساعدنا على الرد كما ينبغي.",
  },
};

function ContactPage() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("encelium-lang") === "ar" ? "ar" : "en"));
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("encelium-theme");
    if (saved === "light" || saved === "dark") return saved;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [copied, setCopied] = useState(false);
  const t = COPY[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = lang === "ar" ? "إنسيليوم — تواصل" : "Encelium — Contact";
    localStorage.setItem("encelium-lang", lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("encelium-theme", theme);
  }, [theme]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Encelium — ${form.name || "hello"}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(CONTACT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard refused */ }
  };

  return (
    <div className="contact-page">
      <nav className="nav scrolled">
        <div className="wrap nav-in">
          <a className="brand" href="./index.html"><Logo size={22} /> Encelium</a>
          <div className="nav-links">
            <a href="./index.html">{t.back}</a>
          </div>
          <div className="seg" role="group" aria-label="Language">
            <button className={["seg-btn", lang === "en" ? "on" : ""].join(" ")} aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
            <button className={["seg-btn", lang === "ar" ? "on" : ""].join(" ")} aria-pressed={lang === "ar"} onClick={() => setLang("ar")}>ع</button>
          </div>
          <button className="theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Theme">
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </nav>

      <main className="wrap contact-main">
        <span className="kicker">Encelium</span>
        <h1 className="h2">{t.title}</h1>
        <p className="lead">{t.sub}</p>
        <form className="contact-form" onSubmit={submit}>
          <label>
            <span>{t.name}</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>{t.email}</span>
          <input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span>{t.message}</span>
            <textarea required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          <div className="contact-actions">
            <button className="btn btn-primary btn-lg" type="submit"><Icon name="arrowRight" size={17} /> {t.send}</button>
            <span className="contact-note">{t.opens}</span>
          </div>
        </form>
        <div className="contact-alt">
          <span>{t.or}</span>
          <code dir="ltr">{CONTACT_EMAIL}</code>
          <button className="btn btn-ghost" type="button" onClick={copy}>{copied ? t.copied : t.copy}</button>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContactPage />
  </StrictMode>,
);
