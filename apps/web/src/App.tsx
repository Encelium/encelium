import { useEffect, useRef, useState } from "react";
import { STRINGS, type Lang } from "./strings.ts";
import { Bonus, Compare, Download, Faq, Features, Footer, Gallery, Hero, Jargon, Nav, Ocean, Roadmap, Showcase, Steps } from "./sections.tsx";

type Phase = "idle" | "out" | "in";
type Theme = "light" | "dark";

const initialTheme = (): Theme => {
  const saved = localStorage.getItem("encelium-theme");
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("encelium-lang") === "ar" ? "ar" : "en"));
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.title = lang === "ar" ? "إنسيليوم — مساعد يتحدّث لغتك" : "Encelium — The agent that speaks human";
    localStorage.setItem("encelium-lang", lang);
  }, [lang, t.dir]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("encelium-theme", theme);
  }, [theme]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Language switch: the page slides out toward its reading direction, flips, and
  // the mirrored page slides in from the other side. Reduced motion: instant swap.
  const switchLang = (next: Lang) => {
    if (next === lang || phase !== "idle") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setLang(next); return; }
    setPhase("out");
    timers.current.push(window.setTimeout(() => { setLang(next); setPhase("in"); }, 250));
    timers.current.push(window.setTimeout(() => setPhase("idle"), 620));
  };

  return (
    <div className={phase !== "idle" ? `lang-${phase}` : undefined}>
      <Nav t={t} lang={lang} onLang={switchLang} theme={theme} onTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />
      <main>
        <Hero t={t} theme={theme} />
        <Steps t={t} />
        <Showcase t={t} />
        <Gallery t={t} />
        <Features t={t} />
        <Compare t={t} />
        <Bonus t={t} />
        <Jargon t={t} />
        <Ocean t={t} />
        <Roadmap t={t} />
        <Faq t={t} />
        <Download t={t} theme={theme} />
      </main>
      <Footer t={t} />
    </div>
  );
}
