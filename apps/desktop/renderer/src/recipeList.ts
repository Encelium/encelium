// Recipes: tested starting points. Each one asks for a single, clear result in a way a smaller
// model handles well (one file where possible, no frameworks, check your work, never delete).
// The person only fills in a few blanks.
import type { IconName } from "@enceladus/ui";
import type { Language } from "./bridge";

export type RecipeCategory = "web" | "files" | "tools" | "help";

export interface RecipeField {
  key: string;
  label: string;
  placeholder: string;
  optional?: boolean;
  /** A longer answer (a few lines). */
  long?: boolean;
}

interface RecipeText {
  title: string;
  hint: string;
  fields: RecipeField[];
  prompt: (v: Record<string, string>) => string;
}

export interface Recipe {
  id: string;
  category: RecipeCategory;
  icon: IconName;
  /** Works on a folder the person picks (instead of a new, empty one); "optional" offers it. */
  folder?: "required" | "optional";
  /** Shown on the home screen. */
  featured?: boolean;
  en: RecipeText;
  ar: RecipeText;
}

const opt = (value: string | undefined, text: (v: string) => string, fallback = "") => (value?.trim() ? text(value.trim()) : fallback);

const WEB_RULES_EN = "Use a single index.html file with the CSS inside it. No frameworks and no external libraries or images. Make it look modern and calm, and make it work well on phones. When it's done, read the file back once to check it.";
const WEB_RULES_AR = "استخدم ملفًا واحدًا باسم index.html يحتوي التنسيق بداخله، بلا أطر عمل ولا مكتبات أو صور خارجية. اجعل التصميم عصريًا وهادئًا ومناسبًا للجوال. وعند الانتهاء اقرأ الملف مرة واحدة للتأكد منه.";

export const RECIPES: Recipe[] = [
  // ── Websites ──
  {
    id: "business-site", category: "web", icon: "browser", featured: true,
    en: {
      title: "A website for my business", hint: "One page with your name, what you offer and how to reach you.",
      fields: [
        { key: "name", label: "Business name", placeholder: "Sweet Crumb" },
        { key: "type", label: "What kind of business?", placeholder: "a small bakery" },
        { key: "details", label: "Contact details or hours", placeholder: "Open 7am–2pm, 42 Maple Lane", optional: true },
      ],
      prompt: (v) => `Make a one-page website for my business: ${v.type}, called "${v.name}". Include a header with the name, a short welcome, a section about what we offer, ${opt(v.details, (d) => `our details (${d})`, "contact details (use clear placeholders I can replace)")}, and a footer. ${WEB_RULES_EN}`,
    },
    ar: {
      title: "موقع لعملي", hint: "صفحة واحدة فيها اسمك وما تقدّمه وطريقة التواصل معك.",
      fields: [
        { key: "name", label: "اسم العمل", placeholder: "مخبز الفجر" },
        { key: "type", label: "ما نوع العمل؟", placeholder: "مخبز صغير" },
        { key: "details", label: "معلومات التواصل أو أوقات العمل", placeholder: "من ٧ صباحًا حتى ٢ ظهرًا، شارع النخيل", optional: true },
      ],
      prompt: (v) => `اصنع موقعًا من صفحة واحدة لعملي: ${v.type} اسمه «${v.name}». أضف ترويسة بالاسم، وترحيبًا قصيرًا، وقسمًا عمّا نقدّمه، و${opt(v.details, (d) => `معلوماتنا (${d})`, "معلومات التواصل (ضع نصوصًا مؤقتة واضحة يمكنني تغييرها)")}، وتذييلًا. اجعل الصفحة بالعربية ومن اليمين إلى اليسار. ${WEB_RULES_AR}`,
    },
  },
  {
    id: "menu", category: "web", icon: "browser", featured: true,
    en: {
      title: "A menu for my restaurant or café", hint: "Dishes, prices and opening hours, easy to read on a phone.",
      fields: [
        { key: "name", label: "Restaurant or café name", placeholder: "Najma Café" },
        { key: "items", label: "Some dishes or drinks (with prices)", placeholder: "Arabic coffee 8, latte 14, date cake 12", optional: true, long: true },
      ],
      prompt: (v) => `Make a one-page menu website for "${v.name}". ${opt(v.items, (i) => `Use these items: ${i}. Group them into sensible sections.`, "Invent a realistic menu with 3 sections and 4 to 6 items each, with prices I can change later.")} Add opening hours and a short line about the place. ${WEB_RULES_EN}`,
    },
    ar: {
      title: "قائمة طعام لمطعمي أو مقهاي", hint: "الأطباق والأسعار وأوقات العمل، سهلة القراءة على الجوال.",
      fields: [
        { key: "name", label: "اسم المطعم أو المقهى", placeholder: "مقهى نجمة" },
        { key: "items", label: "بعض الأطباق أو المشروبات (مع الأسعار)", placeholder: "قهوة عربية ٨، لاتيه ١٤، كيكة تمر ١٢", optional: true, long: true },
      ],
      prompt: (v) => `اصنع موقعًا من صفحة واحدة لقائمة «${v.name}». ${opt(v.items, (i) => `استخدم هذه الأصناف: ${i}. ورتّبها في أقسام مناسبة.`, "اقترح قائمة واقعية من ٣ أقسام في كل منها ٤ إلى ٦ أصناف، مع أسعار يمكنني تغييرها لاحقًا.")} أضف أوقات العمل وسطرًا قصيرًا عن المكان. اجعل الصفحة بالعربية ومن اليمين إلى اليسار. ${WEB_RULES_AR}`,
    },
  },
  {
    id: "portfolio", category: "web", icon: "browser",
    en: {
      title: "A personal page or portfolio", hint: "Who you are, what you do, and a few examples of your work.",
      fields: [
        { key: "name", label: "Your name", placeholder: "Sara Ahmed" },
        { key: "role", label: "What do you do?", placeholder: "wedding photographer" },
        { key: "work", label: "A few things you've done", placeholder: "3 weddings in Dubai, a magazine cover", optional: true, long: true },
      ],
      prompt: (v) => `Make a one-page personal website for ${v.name}, a ${v.role}. Include a short introduction, a section with work examples (${opt(v.work, (w) => `based on: ${w}`, "3 to 4 examples with placeholder text I can replace")}), and a contact section with placeholder links. ${WEB_RULES_EN}`,
    },
    ar: {
      title: "صفحة شخصية أو معرض أعمال", hint: "من أنت، وماذا تعمل، وأمثلة من أعمالك.",
      fields: [
        { key: "name", label: "اسمك", placeholder: "سارة أحمد" },
        { key: "role", label: "ماذا تعمل؟", placeholder: "مصوّرة أعراس" },
        { key: "work", label: "بعض ما أنجزته", placeholder: "٣ أعراس في دبي، غلاف مجلة", optional: true, long: true },
      ],
      prompt: (v) => `اصنع موقعًا شخصيًا من صفحة واحدة لـ${v.name}، ${v.role}. أضف مقدمة قصيرة، وقسمًا لأمثلة الأعمال (${opt(v.work, (w) => `بناءً على: ${w}`, "من ٣ إلى ٤ أمثلة بنصوص مؤقتة يمكنني تغييرها")})، وقسمًا للتواصل بروابط مؤقتة. اجعل الصفحة بالعربية ومن اليمين إلى اليسار. ${WEB_RULES_AR}`,
    },
  },
  {
    id: "invite", category: "web", icon: "browser",
    en: {
      title: "An invitation page", hint: "For a wedding, a party or an event, with the date and place.",
      fields: [
        { key: "event", label: "What's the event?", placeholder: "Lina and Omar's wedding" },
        { key: "when", label: "Date, time and place", placeholder: "June 12, 7pm, Al Noor Hall" },
      ],
      prompt: (v) => `Make a beautiful one-page invitation website for: ${v.event}. Date, time and place: ${v.when}. Include a warm welcome line, the details clearly, a small countdown to the date written in plain JavaScript inside the page, and a section for directions with a placeholder I can replace. ${WEB_RULES_EN}`,
    },
    ar: {
      title: "صفحة دعوة", hint: "لعرس أو حفلة أو مناسبة، مع الموعد والمكان.",
      fields: [
        { key: "event", label: "ما المناسبة؟", placeholder: "زفاف لينا وعمر" },
        { key: "when", label: "التاريخ والوقت والمكان", placeholder: "١٢ يونيو، ٧ مساءً، قاعة النور" },
      ],
      prompt: (v) => `اصنع موقع دعوة جميلًا من صفحة واحدة لـ: ${v.event}. الموعد والمكان: ${v.when}. أضف سطر ترحيب دافئًا، والتفاصيل بوضوح، وعدًّا تنازليًا صغيرًا حتى الموعد مكتوبًا بجافاسكربت بسيطة داخل الصفحة، وقسمًا للاتجاهات بنص مؤقت يمكنني تغييره. اجعل الصفحة بالعربية ومن اليمين إلى اليسار. ${WEB_RULES_AR}`,
    },
  },

  // ── Files ──
  {
    id: "sort-by-type", category: "files", icon: "folderSort", folder: "required", featured: true,
    en: {
      title: "Tidy a messy folder", hint: "Sort files into folders by type: pictures, documents, videos…",
      fields: [],
      prompt: () => "Tidy this folder. Sort the files at the top level into subfolders by type: Pictures, Documents, Videos, Music, Archives and Other. First list the files and show me the plan in a short table, then move them. Never delete anything, and leave existing subfolders as they are. At the end, tell me how many files went where.",
    },
    ar: {
      title: "رتّب مجلدًا فوضويًا", hint: "فرز الملفات في مجلدات حسب النوع: صور، مستندات، فيديو…",
      fields: [],
      prompt: () => "رتّب هذا المجلد. افرز الملفات الموجودة في مستواه الأعلى إلى مجلدات فرعية حسب النوع: صور، مستندات، فيديو، صوتيات، ملفات مضغوطة، وأخرى. اعرض قائمة الملفات أولًا وخطتك في جدول قصير، ثم انقلها. لا تحذف أي شيء أبدًا، واترك المجلدات الفرعية الموجودة كما هي. وفي النهاية أخبرني بعدد الملفات التي ذهبت إلى كل مجلد.",
    },
  },
  {
    id: "photos-by-date", category: "files", icon: "image", folder: "required", featured: true,
    en: {
      title: "Rename photos by date", hint: "Turn IMG_4821.jpg into 2026-06-12 Wedding 01.jpg.",
      fields: [{ key: "label", label: "A word to add (optional)", placeholder: "Wedding", optional: true }],
      prompt: (v) => `Rename the photos and videos in this folder so they start with the date they were taken or created, like "2026-06-12${opt(v.label, (l) => ` ${l}`)} 01.jpg". Use the date the photo was taken if it's available, otherwise the file's date. Keep the original extension, number files from the same day in order, and never overwrite or delete a file. Show me 5 examples of old → new names before renaming everything.`,
    },
    ar: {
      title: "أعد تسمية الصور حسب التاريخ", hint: "حوّل IMG_4821.jpg إلى 2026-06-12 زفاف 01.jpg.",
      fields: [{ key: "label", label: "كلمة تُضاف (اختياري)", placeholder: "زفاف", optional: true }],
      prompt: (v) => `أعد تسمية الصور ومقاطع الفيديو في هذا المجلد لتبدأ بتاريخ التقاطها أو إنشائها، مثل «2026-06-12${opt(v.label, (l) => ` ${l}`)} 01.jpg». استخدم تاريخ التقاط الصورة إن توفّر، وإلا فتاريخ الملف. احتفظ بامتداد الملف، ورقّم ملفات اليوم نفسه بالترتيب، ولا تستبدل أي ملف أو تحذفه. اعرض لي ٥ أمثلة للاسم القديم ← الجديد قبل إعادة تسمية الكل.`,
    },
  },
  {
    id: "duplicates", category: "files", icon: "file", folder: "required",
    en: {
      title: "Find duplicate files", hint: "A list of files that are exact copies, so you can free up space.",
      fields: [],
      prompt: () => "Find files in this folder (including subfolders) that are exact duplicates of each other, by comparing their contents, not just their names. Write the results to duplicates.txt, grouped, with each file's size, and the total space that could be saved. Don't delete or move anything; just report.",
    },
    ar: {
      title: "اعثر على الملفات المكررة", hint: "قائمة بالملفات المتطابقة تمامًا لتوفير المساحة.",
      fields: [],
      prompt: () => "اعثر على الملفات المتطابقة تمامًا في هذا المجلد (ومجلداته الفرعية) بمقارنة محتواها لا أسمائها فقط. اكتب النتائج في ملف duplicates.txt مجمّعة، مع حجم كل ملف، والمساحة الكلية التي يمكن توفيرها. لا تحذف أو تنقل أي شيء؛ اكتفِ بالتقرير.",
    },
  },
  {
    id: "inventory", category: "files", icon: "file", folder: "required",
    en: {
      title: "List everything in a folder", hint: "A spreadsheet of all files with their size and date.",
      fields: [],
      prompt: () => "Make a list of every file in this folder and its subfolders, saved as file-list.csv (it opens in Excel). Columns: folder, file name, type, size in MB, last changed date. Sort by folder, then name. Don't change any files. At the end, tell me the total number of files and the total size.",
    },
    ar: {
      title: "قائمة بكل ما في مجلد", hint: "جدول بكل الملفات مع حجمها وتاريخها.",
      fields: [],
      prompt: () => "اصنع قائمة بكل ملف في هذا المجلد ومجلداته الفرعية، واحفظها في ملف file-list.csv (يُفتح في إكسل). الأعمدة: المجلد، اسم الملف، النوع، الحجم بالميغابايت، تاريخ آخر تعديل. رتّبها حسب المجلد ثم الاسم. لا تغيّر أي ملف. وفي النهاية أخبرني بعدد الملفات وحجمها الكلي.",
    },
  },

  // ── Small tools ──
  {
    id: "budget", category: "tools", icon: "repeat", featured: true,
    en: {
      title: "A simple budget tracker", hint: "Add income and expenses; see what's left this month.",
      fields: [{ key: "currency", label: "Currency", placeholder: "AED" }],
      prompt: (v) => `Make a simple budget tracker as a single page (index.html, with CSS and JavaScript inside). I can add income and expenses with an amount, a category and a date; it shows totals for this month and what's left, in ${v.currency}. Save entries in the browser (localStorage) so they stay after closing. Big, clear numbers; works on phones. No frameworks or external libraries. Read the file back once to check it.`,
    },
    ar: {
      title: "متتبّع ميزانية بسيط", hint: "أضف الدخل والمصاريف وشاهد ما تبقّى هذا الشهر.",
      fields: [{ key: "currency", label: "العملة", placeholder: "درهم" }],
      prompt: (v) => `اصنع متتبّع ميزانية بسيطًا في صفحة واحدة (index.html، مع التنسيق والجافاسكربت بداخلها). أستطيع إضافة دخل ومصاريف بمبلغ وفئة وتاريخ، وتعرض الصفحة مجموع هذا الشهر وما تبقّى، بعملة ${v.currency}. احفظ البيانات في المتصفح (localStorage) لتبقى بعد الإغلاق. أرقام كبيرة وواضحة ومناسبة للجوال، بالعربية ومن اليمين إلى اليسار. بلا أطر عمل ولا مكتبات خارجية. اقرأ الملف مرة واحدة للتأكد منه.`,
    },
  },
  {
    id: "todo", category: "tools", icon: "check",
    en: {
      title: "A to-do list", hint: "Add, tick off and clear tasks. Remembers them for next time.",
      fields: [],
      prompt: () => "Make a clean to-do list app as a single page (index.html, with CSS and JavaScript inside). I can add tasks, tick them off, delete them, and filter all / to do / done. Save tasks in the browser (localStorage). Keyboard friendly (Enter adds a task). No frameworks or external libraries. Read the file back once to check it.",
    },
    ar: {
      title: "قائمة مهام", hint: "أضف المهام وأنجزها وامسحها، وتبقى محفوظة للمرة القادمة.",
      fields: [],
      prompt: () => "اصنع تطبيق قائمة مهام أنيقًا في صفحة واحدة (index.html، مع التنسيق والجافاسكربت بداخلها). أستطيع إضافة مهام وتعليمها كمنجزة وحذفها، والتصفية بين: الكل / المتبقية / المنجزة. احفظ المهام في المتصفح (localStorage). يعمل بلوحة المفاتيح (Enter يضيف مهمة)، وبالعربية ومن اليمين إلى اليسار. بلا أطر عمل ولا مكتبات خارجية. اقرأ الملف مرة واحدة للتأكد منه.",
    },
  },
  {
    id: "flashcards", category: "tools", icon: "repeat",
    en: {
      title: "Flashcards to study", hint: "Cards you flip to learn a topic, with a score.",
      fields: [{ key: "topic", label: "Topic", placeholder: "capital cities of Europe" }],
      prompt: (v) => `Make a flashcards study page about: ${v.topic}. Write 20 accurate cards (question on the front, answer on the back). Click a card to flip it; buttons for "I knew it" and "Not yet", a score, and a shuffle button. A single index.html file with CSS and JavaScript inside, no external libraries. Read the file back once to check the facts and the code.`,
    },
    ar: {
      title: "بطاقات للمذاكرة", hint: "بطاقات تقلبها لتتعلّم موضوعًا، مع حساب النتيجة.",
      fields: [{ key: "topic", label: "الموضوع", placeholder: "عواصم الدول العربية" }],
      prompt: (v) => `اصنع صفحة بطاقات للمذاكرة عن: ${v.topic}. اكتب ٢٠ بطاقة صحيحة (سؤال في الوجه وجواب في الظهر). انقر البطاقة لقلبها، مع زرّين «عرفتها» و«ليس بعد»، وعدّاد للنتيجة، وزر لخلط البطاقات. ملف واحد index.html مع التنسيق والجافاسكربت بداخله، بلا مكتبات خارجية، وبالعربية ومن اليمين إلى اليسار. اقرأ الملف مرة واحدة للتأكد من المعلومات والكود.`,
    },
  },
  {
    id: "cv", category: "tools", icon: "file",
    en: {
      title: "A CV you can print", hint: "A clean, one-page CV that prints well as a PDF.",
      fields: [
        { key: "name", label: "Your name and job title", placeholder: "Omar Khalid, accountant" },
        { key: "experience", label: "Your experience and skills", placeholder: "5 years at ABC Ltd, Excel, SAP…", long: true },
      ],
      prompt: (v) => `Make a one-page CV as index.html for ${v.name}, based on: ${v.experience}. Clean, professional layout that prints nicely on A4 (add print styles so it fits one page). Sections: summary, experience, skills, education (use placeholders where I gave no details). No external libraries. Read the file back once to check it.`,
    },
    ar: {
      title: "سيرة ذاتية قابلة للطباعة", hint: "سيرة ذاتية أنيقة من صفحة واحدة تُطبع جيدًا بصيغة PDF.",
      fields: [
        { key: "name", label: "اسمك ومسمّاك الوظيفي", placeholder: "عمر خالد، محاسب" },
        { key: "experience", label: "خبرتك ومهاراتك", placeholder: "٥ سنوات في شركة كذا، إكسل، SAP…", long: true },
      ],
      prompt: (v) => `اصنع سيرة ذاتية من صفحة واحدة في ملف index.html لـ${v.name}، بناءً على: ${v.experience}. تصميم مرتب واحترافي يُطبع جيدًا على ورق A4 (أضف تنسيقات الطباعة لتتسع لصفحة واحدة). الأقسام: نبذة، الخبرات، المهارات، التعليم (ضع نصوصًا مؤقتة حيث لم أذكر تفاصيل). بالعربية ومن اليمين إلى اليسار، بلا مكتبات خارجية. اقرأ الملف مرة واحدة للتأكد منه.`,
    },
  },

  // ── Help ──
  {
    id: "fix-error", category: "help", icon: "wrench", featured: true, folder: "optional",
    en: {
      title: "Fix an error", hint: "Paste the error message. I'll find the cause and fix it.",
      fields: [{ key: "error", label: "The error message, or what goes wrong", placeholder: "Paste it here…", long: true }],
      prompt: (v) => `Something isn't working. Here is the error or what happens:\n\n${v.error}\n\nFind the cause in this folder's files, explain it in one or two simple sentences, then fix it. Change as little as possible, and check that it works afterwards.`,
    },
    ar: {
      title: "أصلح خطأً", hint: "الصق رسالة الخطأ، وسأجد السبب وأصلحه.",
      fields: [{ key: "error", label: "رسالة الخطأ، أو ما الذي لا يعمل", placeholder: "الصقها هنا…", long: true }],
      prompt: (v) => `هناك شيء لا يعمل. هذا هو الخطأ أو ما يحدث:\n\n${v.error}\n\nابحث عن السبب في ملفات هذا المجلد، واشرحه في جملة أو جملتين بسيطتين، ثم أصلحه. غيّر أقل ما يمكن، وتأكد بعدها أنه يعمل.`,
    },
  },
  {
    id: "explain", category: "help", icon: "info", folder: "required",
    en: {
      title: "Explain a project to me", hint: "What's in this folder, what it does, and how to use it.",
      fields: [],
      prompt: () => "Look through this folder and explain it to me in simple words: what it is, what the main files do, and how to use or run it. Write the explanation to EXPLAINED.md and give me a short summary here. Don't change any other files.",
    },
    ar: {
      title: "اشرح لي مشروعًا", hint: "ما الذي في هذا المجلد، وماذا يفعل، وكيف أستخدمه.",
      fields: [],
      prompt: () => "اطّلع على هذا المجلد واشرحه لي بكلمات بسيطة: ما هو، وماذا تفعل ملفاته الرئيسية، وكيف أستخدمه أو أشغّله. اكتب الشرح في ملف EXPLAINED.md وأعطني ملخصًا قصيرًا هنا. لا تغيّر أي ملف آخر.",
    },
  },
  {
    id: "automate", category: "help", icon: "repeat",
    en: {
      title: "Automate a boring task", hint: "Describe something you repeat; get a one-click script.",
      fields: [{ key: "task", label: "What do you do again and again?", placeholder: "Every Monday I copy last week's reports into a new folder…", long: true }],
      prompt: (v) => `I do this again and again: ${v.task}\n\nMake a Windows PowerShell script that does it for me, saved in this folder with a clear name, plus a .bat file I can double-click to run it. Add comments in simple words. Test it on a small example in a "test" subfolder first. Never delete files; if something would be replaced, keep a copy.`,
    },
    ar: {
      title: "أتمت مهمة مملة", hint: "صف شيئًا تكرّره، واحصل على سكربت يعمل بنقرة.",
      fields: [{ key: "task", label: "ما الذي تفعله مرارًا وتكرارًا؟", placeholder: "كل اثنين أنسخ تقارير الأسبوع الماضي إلى مجلد جديد…", long: true }],
      prompt: (v) => `أكرّر هذا العمل مرارًا: ${v.task}\n\nاصنع سكربت Windows PowerShell يقوم به بدلًا مني، واحفظه في هذا المجلد باسم واضح، مع ملف ‎.bat أنقر عليه مرتين لتشغيله. أضف تعليقات بكلمات بسيطة. جرّبه أولًا على مثال صغير في مجلد فرعي باسم test. لا تحذف أي ملف؛ وإن كان شيء سيُستبدل فاحتفظ بنسخة منه.`,
    },
  },
];

export function recipeText(recipe: Recipe, language: Language): RecipeText {
  return recipe[language];
}
