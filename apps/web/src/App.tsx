import { useEffect, useState } from "react";
import { STRINGS, type Lang } from "./strings.ts";
import { Download, Faq, Features, Footer, Hero, Nav, Ocean, Showcase, Steps } from "./sections.tsx";

export function App() {
  const [lang, setLang] = useState<Lang>("en");
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.title = lang === "ar" ? "إنسيليوم — مساعد يتحدّث لغتك" : "Encelium — The agent that speaks human";
  }, [lang, t.dir]);

  return (
    <>
      <Nav t={t} onLang={() => setLang(lang === "en" ? "ar" : "en")} />
      <main>
        <Hero t={t} />
        <Steps t={t} />
        <Showcase t={t} />
        <Features t={t} />
        <Ocean t={t} />
        <Faq t={t} />
        <Download t={t} />
      </main>
      <Footer t={t} />
    </>
  );
}
