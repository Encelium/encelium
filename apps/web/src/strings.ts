// All site copy, English and Arabic. Short words, no jargon — the product's promise
// is also the site's writing rule.

export type Lang = "en" | "ar";

export const STRINGS = {
  en: {
    dir: "ltr",
    nav: { features: "Features", how: "How it works", faq: "FAQ", download: "Download", langName: "عربي" },
    hero: {
      kicker: "Free beta · Windows 10 & 11",
      title: ["The agent that", "speaks human."],
      sub: "Tell Encelium what you want, in your own words. It plans the work, asks before anything risky, checks its own result — and builds it right in front of you. Don't like it? Rewind.",
      cta: "Download for Windows",
      ctaNote: "Windows 10 & 11 · about 108 MB",
      secondary: "See how it works",
      trust: ["Free during beta", "We never train on your data", "English & العربية"],
    },
    steps: {
      kicker: "How it works",
      title: "Three moves. That's the whole manual.",
      items: [
        { t: "Say it in your own words", d: "No settings, no jargon. Type like you're texting a friend — Arabic or English." },
        { t: "Watch it work", d: "It shows its plan, asks before anything risky, and checks its own result before showing you." },
        { t: "Rewind anything", d: "Every change is saved. One click puts files back the way they were. You can't break anything." },
      ],
    },
    showcase: {
      kicker: "See it work",
      title: "From one sentence to a finished page.",
      captions: [
        "It asks instead of guessing.",
        "It shows the plan, then every step.",
        "The result, live — with one-click rewind.",
      ],
    },
    features: {
      kicker: "Features",
      title: "Simple on the surface. Deep underneath.",
      items: [
        { t: "You can't break anything", d: "Every file change is saved as a rewind point. One click puts things back. Undo a step, a task, or all of it." },
        { t: "It asks first", d: "Green means safe. Yellow means it will ask you first, in plain words. Red means risky — and it explains why." },
        { t: "Point at what you mean", d: "See your page build live next to the chat. Click any part of it and say \"make this bigger\" — no technical words needed." },
        { t: "Start from a recipe", d: "Not sure what to ask? Pick a ready-made task — a shop page, a menu, tidy folders — fill in two blanks, press Start." },
        { t: "Your language, properly", d: "Arabic is not an afterthought. The whole app — chat, plans, previews — is truly right-to-left." },
        { t: "Free model included", d: "Use the included model free during beta, with a simple invite code. Prefer your own? Plug in your key in Settings." },
      ],
    },
    ocean: {
      big: "We never train on your data.",
      sub: "Your chats and files stay on your computer. The agent works for you — not for our dataset.",
      chips: ["Runs on your PC", "Open source · MIT", "Rewind history stays local"],
    },
    faq: {
      kicker: "FAQ",
      title: "Fair questions.",
      items: [
        { q: "Is it really free?", a: "Yes. During the beta, the included model is free with an invite code. You can also bring your own model key at any time — from OpenAI, Google, or one running on your own PC." },
        { q: "Do I need to know how to code?", a: "No. You type what you want in plain words; Encelium handles the technical parts and explains the rest simply. If you do code, it works for you too." },
        { q: "Which languages does it speak?", a: "English and Arabic today — fully, including right-to-left layout and Arabic answers. More languages are planned." },
        { q: "Windows only?", a: "Today Encelium runs on Windows 10 and 11. A Mac version is planned after the beta." },
        { q: "What can it actually do?", a: "One-page websites, menus and portfolios; organizing, renaming and cleaning up files; small scripts and tools. And it tests its own work before telling you it's done." },
      ],
    },
    download: {
      kicker: "Download",
      title: "Get Encelium",
      sub: "Free during beta. No account needed to start — an invite code unlocks the included model.",
      cta: "Download for Windows",
      note: "Windows 10 & 11 · about 108 MB · while we finish code signing, Windows may ask you to choose “More info → Run anyway”.",
    },
    footer: { tagline: "Say it. Watch it get built.", opensource: "Open source · MIT", rights: "© 2026 The Encelium Authors" },
    ui: {
      planTitle: "Plan",
      planSteps: ["Set up the page", "Write the sections", "Check the result"],
      stepStates: { pending: "To do", active: "Doing", done: "Done" },
      perm: {
        levelLabel: "Careful",
        title: "Install a small helper tool?",
        description: "Needed once, to preview what we build. Nothing else changes.",
        details: "winget install --id some.helper.tool",
        show: "Show command",
        hide: "Hide command",
        allow: "Allow",
        deny: "Not now",
      },
      question: { title: "What is the page for?", options: ["A shop", "A menu", "A story"] },
      user1: "Make me a one-page website for my bakery, Sweet Crumb.",
      working: "Writing index.html…",
      done: "Your page is ready — here it is, live.",
      next: ["Add a contact form", "Make an Arabic version"],
      rewind: "Rewind",
      now: "Now",
      before: "Before the colors",
      previewSoon: "Your page appears here as it builds",
      previewTitle: "Sweet Crumb — fresh every morning",
    },
  },
  ar: {
    dir: "rtl",
    nav: { features: "الميزات", how: "كيف يعمل", faq: "أسئلة", download: "تحميل", langName: "English" },
    hero: {
      kicker: "نسخة تجريبية مجانية · ويندوز 10 و11",
      title: ["مساعدٌ", "يتحدّث لغتك."],
      sub: "قل لإنسيليوم ما تريد بكلماتك. يضع الخطة، يستأذنك قبل أي إجراء حسّاس، يتحقّق من نتيجته — ثم ينفّذ كل شيء أمام عينيك. لم تعجبك النتيجة؟ ارجع خطوة للخلف.",
      cta: "حمّله لويندوز",
      ctaNote: "ويندوز 10 و11 · نحو 108 ميغابايت",
      secondary: "شاهد كيف يعمل",
      trust: ["مجاني خلال التجربة", "لا نتدرّب على بياناتك", "عربي وإنجليزي"],
    },
    steps: {
      kicker: "كيف يعمل",
      title: "ثلاث خطوات. هذا الدليل كاملًا.",
      items: [
        { t: "قلها بكلماتك", d: "بلا إعدادات ولا مصطلحات. اكتب كما لو كنت تراسل صديقًا — بالعربية أو الإنجليزية." },
        { t: "شاهده يعمل", d: "يعرض خطته، يستأذنك قبل أي إجراء حسّاس، ويتحقّق من نتيجته قبل أن يعرضها عليك." },
        { t: "ارجع بأي وقت", d: "كل تغيير يُحفظ. نقرة واحدة تعيد الملفات كما كانت. لا يمكنك تعطيل شيء." },
      ],
    },
    showcase: {
      kicker: "شاهده يعمل",
      title: "من جملة واحدة إلى صفحة جاهزة.",
      captions: [
        "يسأل بدلًا من أن يخمّن.",
        "يعرض الخطة، ثم كل خطوة.",
        "النتيجة مباشرة — مع زر عودة بخطوة واحدة.",
      ],
    },
    features: {
      kicker: "الميزات",
      title: "بسيط من الخارج، عميق من الداخل.",
      items: [
        { t: "لا يمكنك تعطيل شيء", d: "كل تعديل على ملف يُحفظ كنقطة عودة. نقرة واحدة تعيد الأمور كما كانت — خطوة، أو مهمة كاملة." },
        { t: "يستأذنك أولًا", d: "الأخضر يعني آمن. الأصفر يعني أنه سيسألك أولًا بكلمات واضحة. الأحمر يعني خطرًا — ويشرح لك السبب." },
        { t: "أشِر إلى ما تقصده", d: "شاهد صفحتك تُبنى مباشرة بجوار المحادثة. انقر أي جزء منها وقل «كبّر هذا» — بلا أي مصطلحات." },
        { t: "ابدأ من وصفة", d: "لا تدري ماذا تطلب؟ اختر مهمة جاهزة — صفحة متجر، قائمة طعام، ترتيب ملفات — املأ فراغين واضغط ابدأ." },
        { t: "لغتك، كما يجب", d: "العربية ليست إضافة لاحقة. التطبيق كله — المحادثة والخطط والمعاينة — من اليمين إلى اليسار فعلًا." },
        { t: "نموذج مجاني مدمج", d: "استخدم النموذج المدمج مجانًا خلال التجربة برمز دعوة بسيط. وتفضّل نموذجك؟ أدخل مفتاحك من الإعدادات." },
      ],
    },
    ocean: {
      big: "لا نتدرّب على بياناتك أبدًا.",
      sub: "محادثاتك وملفاتك تبقى على جهازك. المساعد يعمل لك — لا لقاعدة بياناتنا.",
      chips: ["يعمل على جهازك", "مفتوح المصدر · MIT", "سجلّ العودة يبقى محليًّا"],
    },
    faq: {
      kicker: "أسئلة",
      title: "أسئلة مشروعة.",
      items: [
        { q: "هل هو مجاني فعلًا؟", a: "نعم. خلال التجربة، النموذج المدمج مجاني برمز دعوة. ويمكنك في أي وقت استخدام مفتاح نموذجك الخاص — من OpenAI أو Google أو نموذج يعمل على جهازك." },
        { q: "هل أحتاج معرفة بالبرمجة؟", a: "لا. اكتب ما تريد بكلمات عادية، وإنسيليوم يتولّى الأجزاء التقنية ويشرح الباقي ببساطة. وإن كنت مبرمجًا، فهو يعمل لك أيضًا." },
        { q: "ما اللغات المتاحة؟", a: "الإنجليزية والعربية اليوم — بشكل كامل، بما فيه الاتجاه من اليمين إلى اليسار والردود بالعربية. ولغات أخرى قادمة." },
        { q: "ويندوز فقط؟", a: "اليوم يعمل إنسيليوم على ويندوز 10 و11. نسخة ماك مخطط لها بعد التجربة." },
        { q: "ما الذي يستطيع فعله؟", a: "مواقع من صفحة واحدة، قوائم وأعمالًا شخصية؛ ترتيب الملفات وإعادة تسميتها وتنظيفها؛ سكربتات وأدوات صغيرة. ويختبر عمله بنفسه قبل أن يقول لك أنجزت." },
      ],
    },
    download: {
      kicker: "تحميل",
      title: "احصل على إنسيليوم",
      sub: "مجاني خلال التجربة. لا تحتاج حسابًا للبدء — رمز الدعوة يفتح النموذج المدمج.",
      cta: "حمّله لويندوز",
      note: "ويندوز 10 و11 · نحو 108 ميغابايت · إلى أن نُكمل توقيع البرنامج، قد يطلب ويندوز اختيار «معلومات إضافية → تشغيل على أي حال».",
    },
    footer: { tagline: "قلها. وشاهدها تُبنى.", opensource: "مفتوح المصدر · MIT", rights: "© 2026 مؤلفو إنسيليوم" },
    ui: {
      planTitle: "الخطة",
      planSteps: ["تجهيز الصفحة", "كتابة الأقسام", "التحقق من النتيجة"],
      stepStates: { pending: "لم تبدأ", active: "جارية", done: "تمّت" },
      perm: {
        levelLabel: "حذر",
        title: "تثبيت أداة مساعدة صغيرة؟",
        description: "تحتاج مرة واحدة لمعاينة ما نبنيه. لا يتغيّر أي شيء آخر.",
        details: "winget install --id some.helper.tool",
        show: "عرض الأمر",
        hide: "إخفاء الأمر",
        allow: "السماح",
        deny: "ليس الآن",
      },
      question: { title: "ما الغرض من الصفحة؟", options: ["متجر", "قائمة طعام", "قصة"] },
      user1: "اصنع لي موقعًا من صفحة واحدة لمخبزي، «سويت كرَمب».",
      working: "جارٍ كتابة index.html…",
      done: "صفحتك جاهزة — ها هي أمامك مباشرة.",
      next: ["أضف نموذج تواصل", "اصنع نسخة عربية"],
      rewind: "العودة",
      now: "الآن",
      before: "قبل الألوان",
      previewSoon: "ستظهر صفحتك هنا أثناء البناء",
      previewTitle: "سويت كرَمب — طازج كل صباح",
    },
  },
};

// Both languages share one structural shape (no `as const`, so strings widen to `string`).
export type Copy = (typeof STRINGS)["en"];
