import type { Language } from "./bridge";

const en = {
  appName: "Enceladus",
  greeting: { morning: "Good morning.", afternoon: "Good afternoon.", evening: "Good evening." },
  heading: "What do you want to make?",
  composerPlaceholder: "Describe it in your own words. You can also drop files, folders or a screenshot here.",
  send: "Start",
  attach: "Add files",
  workingIn: "Working in",
  newTask: "New task",
  recent: "Recent",
  recentEmpty: "Your tasks will appear here.",
  energy: "Today’s energy",
  energyCaption: "Refills at midnight",
  connections: "Connections",
  settings: "Settings",
  privacy: "We never train on your data.",
  starters: {
    website: { title: "Make a website", body: "A page for your shop, portfolio or idea. Watch it appear as it’s built.", prompt: "Make a one-page website for " },
    files: { title: "Organize my files", body: "Sort, rename or clean up a folder. Every change can be rewound.", prompt: "Organize the files in " },
    automate: { title: "Automate a boring task", body: "Turn something you repeat every week into a single click.", prompt: "Every week I have to " },
    fix: { title: "Fix something broken", body: "Paste an error or just describe it. I’ll find the cause.", prompt: "Something isn’t working: " },
  },
  notConnected: "The agent isn’t connected yet. That’s the next step we’re building.",
  dismiss: "Dismiss",
  settingsDialog: {
    title: "Settings",
    theme: "Theme", light: "Light", dark: "Dark", system: "Match Windows",
    language: "Language",
    done: "Done",
  },
};

type Strings = typeof en;

const ar: Strings = {
  appName: "إنسيلادوس",
  greeting: { morning: "صباح الخير.", afternoon: "مساء الخير.", evening: "مساء الخير." },
  heading: "ماذا تريد أن تصنع؟",
  composerPlaceholder: "صِفه بكلماتك. يمكنك أيضًا إفلات ملفات أو مجلدات أو لقطة شاشة هنا.",
  send: "ابدأ",
  attach: "إضافة ملفات",
  workingIn: "أعمل في",
  newTask: "مهمة جديدة",
  recent: "الأخيرة",
  recentEmpty: "ستظهر مهامك هنا.",
  energy: "طاقة اليوم",
  energyCaption: "تتجدد عند منتصف الليل",
  connections: "الاتصالات",
  settings: "الإعدادات",
  privacy: "لا نستخدم بياناتك أبدًا لتدريب النموذج.",
  starters: {
    website: { title: "اصنع موقعًا", body: "صفحة لمتجرك أو أعمالك أو فكرتك. شاهدها تُبنى أمامك.", prompt: "أنشئ موقعًا من صفحة واحدة لـ " },
    files: { title: "رتّب ملفاتي", body: "فرز مجلد أو إعادة تسمية ملفاته أو تنظيفه. يمكن التراجع عن كل تغيير.", prompt: "رتّب الملفات في " },
    automate: { title: "أتمِت مهمة مملة", body: "حوّل شيئًا تكرره كل أسبوع إلى نقرة واحدة.", prompt: "كل أسبوع عليّ أن " },
    fix: { title: "أصلِح شيئًا معطّلًا", body: "الصق رسالة الخطأ أو صِف المشكلة فقط. سأجد السبب.", prompt: "هناك شيء لا يعمل: " },
  },
  notConnected: "الوكيل غير متصل بعد. هذه هي الخطوة التالية التي نبنيها.",
  dismiss: "إغلاق",
  settingsDialog: {
    title: "الإعدادات",
    theme: "المظهر", light: "فاتح", dark: "داكن", system: "مثل ويندوز",
    language: "اللغة",
    done: "تم",
  },
};

export const strings: Record<Language, Strings> = { en, ar };
export type { Strings };
