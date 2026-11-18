import { useEffect, useRef, useState } from "react";
import { STRINGS, type Lang } from "./strings.ts";
import { Download, Faq, Features, Footer, Gallery, Hero, Jargon, Nav, Ocean, Roadmap, Showcase, Steps } from "./sections.tsx";

type Phase = "idle" | "out" | "in";

export function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("encelium-lang") === "ar" ? "ar" : "en"));
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.title = lang === "ar" ? "إنسيليوم — مساعد يتحدّث لغتك" : "Encelium — The agent that speaks human";
    localStorage.setItem("encelium-lang", lang);
  }, [lang, t.dir]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Language switch: the page slides out toward its reading direction, flips, and
  // the mirrored page slides in from the other side. Reduced motion: instant swap.
  const switchLang = () => {
    if (phase !== "idle") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setLang(lang === "en" ? "ar" : "en"); return; }
    setPhase("out");
    timers.current.push(window.setTimeout(() => {
      setLang(lang === "en" ? "ar" : "en");
      setPhase("in");
    }, 250));
    timers.current.push(window.setTimeout(() => setPhase("idle"), 620));
  };

  return (
    <div className={phase !== "idle" ? `lang-${phase}` : undefined}>
      <Nav t={t} onLang={switchLang} />
      <main>
        <Hero t={t} />
        <Steps t={t} />
        <Showcase t={t} />
        <Gallery t={t} />
        <Features t={t} />
        <Jargon t={t} />
        <Ocean t={t} />
        <Roadmap t={t} />
        <Faq t={t} />
        <Download t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}
