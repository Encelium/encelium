import type { AgentEngine, AgentEvent, AgentRun } from "./types";

// A scripted run for "make a one-page website for my bakery".
// This is content, not UI chrome, so the strings live here in both languages.

type Lang = "en" | "ar";
type Pair = { en: string; ar: string };

const text = {
  thinking: { en: "Thinking about your request", ar: "أفكّر في طلبك" },
  planTitle: { en: "Plan for your bakery page", ar: "خطة صفحة المخبز" },
  steps: [
    { en: "Plan the page", ar: "تخطيط الصفحة" },
    { en: "Write the pages and styles", ar: "كتابة الصفحة والتصميم" },
    { en: "Show you a live preview", ar: "عرض معاينة حيّة لك" },
    { en: "Check my own work", ar: "مراجعة عملي بنفسي" },
  ] as Pair[],
  intro: {
    en: "Sure. I’ll make a calm, one-page site for your bakery: a hero with your name, today’s menu, opening hours and a map. First I’ll save a Rewind point, then create the files. Nothing outside this folder will change.",
    ar: "حاضر. سأصنع لمخبزك موقعًا هادئًا من صفحة واحدة: عنوان رئيسي باسمك، وقائمة اليوم، وساعات العمل، وخريطة. سأحفظ أولًا نقطة للتراجع، ثم أنشئ الملفات. لن يتغيّر أي شيء خارج هذا المجلد.",
  },
  cp1: { en: "Before making the page", ar: "قبل صنع الصفحة" },
  act1: { en: "Created 3 files", ar: "أنشأتُ ٣ ملفات" },
  act1Details: "index.html\nstyles.css\nmenu.json",
  permTitle: { en: "Install Node.js to show a live preview", ar: "تثبيت Node.js لعرض معاينة حيّة" },
  permDesc: {
    en: "To show your page as you’d see it online, I need a small free program called Node.js. It installs on this computer only, and you can remove it later.",
    ar: "لأعرض صفحتك كما ستظهر على الإنترنت، أحتاج إلى برنامج صغير ومجاني اسمه Node.js. يُثبَّت على هذا الجهاز فقط، ويمكنك إزالته لاحقًا.",
  },
  allow: { en: "Install it", ar: "ثبّته" },
  deny: { en: "Not now", ar: "ليس الآن" },
  act2: { en: "Set up Node.js", ar: "جهّزتُ Node.js" },
  act2Details: "node --version\nv20.11.1\nnpm --version\n10.2.4",
  cp2: { en: "Preview is ready", ar: "المعاينة جاهزة" },
  checking: { en: "Checking my own work", ar: "أراجع عملي بنفسي" },
  act3: {
    en: "Found the menu overlapping on small screens — fixed it",
    ar: "وجدتُ أن القائمة تتداخل على الشاشات الصغيرة، وأصلحتُها",
  },
  act3Details: "styles.css  line 42\n- .menu { position: absolute; }\n+ .menu { position: static; }",
  finalMsg: {
    en: "All done. Your bakery page is ready, with a menu, opening hours and a map. I also found the menu overlapping on small screens and fixed it. If you’d like a different look, tell me and I’ll change it.",
    ar: "انتهيت. صفحة مخبزك جاهزة، وفيها القائمة وساعات العمل وخريطة. ووجدتُ أن القائمة تتداخل على الشاشات الصغيرة فأصلحتُها. إن أردت شكلًا مختلفًا فأخبرني وسأغيّره.",
  },
  doneSummary: { en: "Your bakery page is ready.", ar: "صفحة مخبزك جاهزة." },
  deniedMsg: {
    en: "Okay, I won’t install anything. That means I can’t show you a live preview, but your files are ready in the folder: index.html, styles.css and menu.json. You can open index.html in any browser.",
    ar: "حسنًا، لن أثبّت أي شيء. هذا يعني أنني لن أستطيع عرض معاينة حيّة، لكن ملفاتك جاهزة في المجلد: index.html وstyles.css وmenu.json. يمكنك فتح index.html في أي متصفح.",
  },
  deniedSummary: { en: "Your files are ready. No preview was shown.", ar: "ملفاتك جاهزة. لم تُعرض معاينة." },
  stopped: { en: "Stopped. Nothing else will change.", ar: "تم الإيقاف. لن يتغيّر شيء آخر." },
  stoppedHint: { en: "You can start again whenever you like.", ar: "يمكنك البدء من جديد متى شئت." },
};

let runCounter = 0;

export const demoEngine: AgentEngine = {
  start(_prompt, options): AgentRun {
    const lang: Lang = options.language;
    const tr = (p: Pair) => p[lang];
    const runId = ++runCounter;
    const listeners = new Set<(e: AgentEvent) => void>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let finished = false;
    let permissionId: string | null = null;
    let branch: ((allowed: boolean) => void) | null = null;

    const emit = (e: AgentEvent) => listeners.forEach((l) => l(e));
    const at = (ms: number, fn: () => void) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!finished) fn();
      }, ms);
      timers.add(id);
    };
    const finish = () => { finished = true; };

    /** Streams a message in small pieces, ~40 ms apart. Returns the time it takes. */
    const stream = (start: number, id: string, full: string, then?: () => void) => {
      const words = full.split(/(?<=\s)/);
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += 2) chunks.push(words.slice(i, i + 2).join(""));
      chunks.forEach((c, i) => at(start + i * 40, () => emit({ type: "message-delta", id, text: c })));
      const end = start + chunks.length * 40;
      at(end, () => { emit({ type: "message-done", id }); then?.(); });
      return end;
    };

    const plan = (active: number, doneThrough = active): AgentEvent => ({
      type: "plan",
      title: tr(text.planTitle),
      steps: text.steps.map((s, i) => ({
        label: tr(s),
        status: i < doneThrough ? "done" : i === active ? "active" : "pending",
      })),
    });
    const allDone: AgentEvent = {
      type: "plan",
      title: tr(text.planTitle),
      steps: text.steps.map((s) => ({ label: tr(s), status: "done" as const })),
    };

    // Opening: thinking, plan, intro message.
    at(0, () => emit({ type: "status", phase: "thinking", text: tr(text.thinking) }));
    at(1200, () => emit(plan(0, 0)));
    const introEnd = stream(1800, `m${runId}-1`, tr(text.intro), () => {
      // After the intro: save a point, make the files.
      at(600, () => {
        emit({ type: "checkpoint", id: `c${runId}-1`, label: tr(text.cp1), at: Date.now() });
        emit({ type: "status", phase: "working", text: lang === "ar" ? "أنشئ الملفات" : "Creating the files" });
      });
      at(2400, () => {
        emit({ type: "activity", text: tr(text.act1), details: text.act1Details });
        emit(plan(2, 2));
      });
      at(3200, () => {
        permissionId = `p${runId}-1`;
        emit({
          type: "permission",
          requestId: permissionId,
          level: "careful",
          title: tr(text.permTitle),
          description: tr(text.permDesc),
          allowLabel: tr(text.allow),
          denyLabel: tr(text.deny),
        });
      });
    });
    void introEnd;

    branch = (allowed) => {
      if (!allowed) {
        at(500, () => emit({ type: "status", phase: "thinking", text: tr(text.thinking) }));
        stream(1100, `m${runId}-2`, tr(text.deniedMsg), () => {
          at(300, () => {
            emit({ type: "done", summary: tr(text.deniedSummary) });
            finish();
          });
        });
        return;
      }
      at(300, () => emit({ type: "status", phase: "working", text: lang === "ar" ? "أجهّز Node.js" : "Setting up Node.js" }));
      at(2200, () => emit({ type: "activity", text: tr(text.act2), details: text.act2Details }));
      at(2600, () => emit({ type: "checkpoint", id: `c${runId}-2`, label: tr(text.cp2), at: Date.now() }));
      at(2800, () => {
        emit(plan(3, 3));
        emit({ type: "status", phase: "working", text: tr(text.checking) });
      });
      at(5000, () => emit({ type: "activity", text: tr(text.act3), details: text.act3Details }));
      at(5600, () => emit(allDone));
      stream(6000, `m${runId}-3`, tr(text.finalMsg), () => {
        at(300, () => {
          emit({ type: "done", summary: tr(text.doneSummary) });
          finish();
        });
      });
    };

    return {
      onEvent(listener) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
      respond(requestId, allowed) {
        if (finished || requestId !== permissionId || !branch) return;
        const go = branch;
        branch = null;
        go(allowed);
      },
      stop() {
        if (finished) return;
        finished = true;
        timers.forEach(clearTimeout);
        timers.clear();
        emit({ type: "error", message: tr(text.stopped), suggestion: tr(text.stoppedHint) });
      },
    };
  },
};
