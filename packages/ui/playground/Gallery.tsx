import { useEffect, useState, type ReactNode } from "react";
import {
  Button, IconButton, Tag, StatusIcon, TextField, Switch, Segmented, Composer, Message, PlanCard,
  PermissionPrompt, RewindTimeline, EnergyBar, Dialog, Toast, type ToastTone,
} from "../src";

type Lang = "en" | "ar";
type Theme = "light" | "dark";

const t = {
  en: {
    title: "Encelium UI", subtitle: "Design system · foundations and first components",
    light: "Light", dark: "Dark", theme: "Theme", language: "Language",
    colors: "Colors", type: "Type", buttons: "Buttons", iconButtons: "Icon buttons", tags: "Tags", status: "Agent status",
    sample: "What do you want to make?", body: "Describe it in your own words. You can also drop files, folders or a screenshot here.",
    start: "Start", newTask: "New task", install: "Install it", notNow: "Not now", fixIt: "Fix it", rewind: "Rewind",
    del: "Delete 12 files", cancel: "Cancel", continue: "Continue", disabled: "Disabled",
    send: "Send", attach: "Add files", settings: "Settings", close: "Close", inUse: "In use",
    safe: "Safe", careful: "Careful", risky: "Risky", live: "Live", beta: "Beta",
    thinking: "Thinking", working: "Working", done: "Done",
    variant: { primary: "Primary", accent: "Accent", secondary: "Secondary", ghost: "Ghost", danger: "Danger" },
    fields: "Text fields", switches: "Switches", segmented: "Segmented control", composer: "Composer", messages: "Messages",
    plan: "Plan", permission: "Permission prompt", rewindTitle: "Rewind timeline", energy: "Energy bar", dialog: "Dialog", toast: "Toasts",
    fieldName: "Project name", fieldHint: "You can change this later.", fieldValue: "Sweet Crumb",
    fieldEmail: "Email", fieldError: "That email looks incomplete. It needs an ending like .com", fieldBad: "sara@sweetcrumb",
    fieldBig: "What should we call it?", fieldOff: "Folder (not available yet)",
    swSave: "Keep my work safe automatically", swAsk: "Ask me before I change files",
    segView: "View", segPreview: "Preview", segCode: "Details", segChat: "Chat",
    composerHint: "Ask me to make or fix something", attachFiles: "Add files", workingIn: "Working in", sendMsg: "Send",
    userMsg: "Please make the Sweet Crumb website's menu easier to read on a phone.",
    aiMsg1: "Done. I made the menu text larger and gave each cake more space, so it's easier to tap.",
    aiMsg2: "Take a look at the preview on the right. If you don't like it, you can rewind.",
    aiMsgAr: "تمّ. جعلتُ الخط أكبر. This also works for English words inside the same message.",
    planTitle: "Making the Sweet Crumb website", step1: "Look at your files", step2: "Make the menu page", step3: "Check it on a small screen", step4: "Show you the result",
    stDone: "Done", stActive: "In progress", stPending: "Not started",
    permSafeTitle: "Read the files in your Sweet Crumb folder", permSafeDesc: "I only look. Nothing is changed.", permSafeBtn: "Allow",
    permCarefulTitle: "Install Python", permCarefulDesc: "I need Python to run your script. It's free and about 30 MB. You can remove it later.", permCarefulLink: "Show details",
    permRiskyTitle: "Delete 12 files in Downloads", permRiskyDesc: "These files will move to the Recycle Bin. You can rewind this.", permRiskyLink: "See which files",
    restoreHere: "Restore here", now: "Now",
    tl1: "Made the menu page", tl2: "Changed the colors", tl3: "Started the project", t1: "10:42", t2: "10:30", t3: "10:12",
    restored: "Went back to 10:30",
    energyLabel: "Today's energy", energy70: "70% left", energy15: "15% left", energy0: "Used up for today",
    open: "Open dialog", dlgTitle: "Delete 12 files?", dlgBody: "They will move to the Recycle Bin. You can bring them back with Rewind.", dlgKeep: "Keep them",
    toastNeutral: "Saved a copy of your work", toastSafe: "Your website is ready", toastCareful: "You have 15% of today's energy left", toastRisky: "I couldn't install Python",
    undo: "Undo", tryAgain: "Try again", dismiss: "Close notification", showToasts: "Show again",
  },
  ar: {
    title: "واجهة إنسيليوم", subtitle: "نظام التصميم · الأساسيات وأول المكوّنات",
    light: "فاتح", dark: "داكن", theme: "المظهر", language: "اللغة",
    colors: "الألوان", type: "الخطوط", buttons: "الأزرار", iconButtons: "أزرار الأيقونات", tags: "الوسوم", status: "حالة الوكيل",
    sample: "ماذا تريد أن تصنع؟", body: "صِفه بكلماتك. يمكنك أيضًا إفلات ملفات أو مجلدات أو لقطة شاشة هنا.",
    start: "ابدأ", newTask: "مهمة جديدة", install: "ثبّته", notNow: "ليس الآن", fixIt: "أصلِحه", rewind: "تراجع",
    del: "حذف ١٢ ملفًا", cancel: "إلغاء", continue: "متابعة", disabled: "غير متاح",
    send: "إرسال", attach: "إضافة ملفات", settings: "الإعدادات", close: "إغلاق", inUse: "في الاستخدام",
    safe: "آمن", careful: "انتباه", risky: "خطِر", live: "مباشر", beta: "تجريبي",
    thinking: "يفكّر", working: "يعمل", done: "تمّ",
    variant: { primary: "أساسي", accent: "مميّز", secondary: "ثانوي", ghost: "شفاف", danger: "خطِر" },
    fields: "حقول النص", switches: "المفاتيح", segmented: "الخيارات المتجاورة", composer: "مربع الكتابة", messages: "الرسائل",
    plan: "الخطة", permission: "طلب الإذن", rewindTitle: "شريط التراجع", energy: "شريط الطاقة", dialog: "النافذة", toast: "الإشعارات",
    fieldName: "اسم المشروع", fieldHint: "يمكنك تغييره لاحقًا.", fieldValue: "سويت كرامب",
    fieldEmail: "البريد الإلكتروني", fieldError: "يبدو أن البريد ناقص. يحتاج إلى نهاية مثل .com", fieldBad: "sara@sweetcrumb",
    fieldBig: "ماذا نسمّيه؟", fieldOff: "المجلد (غير متاح بعد)",
    swSave: "احفظ عملي تلقائيًا", swAsk: "اسألني قبل تغيير الملفات",
    segView: "العرض", segPreview: "معاينة", segCode: "التفاصيل", segChat: "محادثة",
    composerHint: "اطلب مني أن أصنع شيئًا أو أصلحه", attachFiles: "إضافة ملفات", workingIn: "أعمل في", sendMsg: "إرسال",
    userMsg: "من فضلك اجعل قائمة موقع سويت كرامب أسهل قراءة على الهاتف.",
    aiMsg1: "تمّ. كبّرتُ خط القائمة ووسّعتُ المسافة حول كل كعكة ليسهل الضغط عليها.",
    aiMsg2: "ألقِ نظرة على المعاينة على اليمين. إن لم تعجبك النتيجة، يمكنك التراجع.",
    aiMsgAr: "Done. I made the font larger. وهذا يعمل أيضًا مع العربية في الرسالة نفسها.",
    planTitle: "صنع موقع سويت كرامب", step1: "النظر في ملفاتك", step2: "صنع صفحة القائمة", step3: "فحصها على شاشة صغيرة", step4: "عرض النتيجة عليك",
    stDone: "تمّ", stActive: "قيد التنفيذ", stPending: "لم يبدأ",
    permSafeTitle: "قراءة الملفات في مجلد سويت كرامب", permSafeDesc: "أنظر فقط. لن يتغيّر شيء.", permSafeBtn: "سماح",
    permCarefulTitle: "تثبيت بايثون", permCarefulDesc: "أحتاج بايثون لتشغيل برنامجك. هو مجاني وحجمه نحو ٣٠ ميغابايت. يمكنك حذفه لاحقًا.", permCarefulLink: "عرض التفاصيل",
    permRiskyTitle: "حذف ١٢ ملفًا في التنزيلات", permRiskyDesc: "ستنتقل هذه الملفات إلى سلة المحذوفات. يمكنك التراجع عن ذلك.", permRiskyLink: "عرض الملفات",
    restoreHere: "العودة إلى هنا", now: "الآن",
    tl1: "صنعتُ صفحة القائمة", tl2: "غيّرتُ الألوان", tl3: "بدأتُ المشروع", t1: "١٠:٤٢", t2: "١٠:٣٠", t3: "١٠:١٢",
    restored: "عدتَ إلى ١٠:٣٠",
    energyLabel: "طاقة اليوم", energy70: "تبقّى ٧٠٪", energy15: "تبقّى ١٥٪", energy0: "انتهت طاقة اليوم",
    open: "فتح النافذة", dlgTitle: "حذف ١٢ ملفًا؟", dlgBody: "ستنتقل إلى سلة المحذوفات. يمكنك استعادتها بالتراجع.", dlgKeep: "أبقِها",
    toastNeutral: "حفظتُ نسخة من عملك", toastSafe: "موقعك جاهز", toastCareful: "تبقّى ١٥٪ من طاقة اليوم", toastRisky: "تعذّر تثبيت بايثون",
    undo: "تراجع", tryAgain: "حاول مجددًا", dismiss: "إغلاق الإشعار", showToasts: "إظهار مجددًا",
  },
};

const colorTokens = [
  "bg", "bg-sunken", "surface", "surface-muted", "border", "border-strong",
  "text", "text-muted", "text-subtle", "accent", "accent-soft", "primary",
  "safe", "careful", "risky", "code-bg",
];

const typeScale: [string, string][] = [["3xl", "semibold"], ["2xl", "semibold"], ["xl", "semibold"], ["lg", "regular"], ["base", "regular"], ["md", "regular"], ["sm", "regular"], ["xs", "regular"]];

export function Gallery() {
  // ?theme=dark&lang=ar&only=12,13 opens a specific view (handy for reviews and screenshots)
  const params = new URLSearchParams(location.search);
  const [theme, setTheme] = useState<Theme>(params.get("theme") === "dark" ? "dark" : "light");
  const [lang, setLang] = useState<Lang>(params.get("lang") === "ar" ? "ar" : "en");
  const only = params.get("only")?.split(",").map(Number);
  const s = t[lang];
  const [seg, setSeg] = useState("preview");
  const [autoSave, setAutoSave] = useState(true);
  const [askFirst, setAskFirst] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restored, setRestored] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const hide = (k: string) => setHidden((h) => [...h, k]);
  const toasts: { key: string; tone: ToastTone; message: string; action?: { label: string; onClick: () => void } }[] = [
    { key: "neutral", tone: "neutral", message: s.toastNeutral },
    { key: "safe", tone: "safe", message: s.toastSafe, action: { label: s.undo, onClick: () => hide("safe") } },
    { key: "careful", tone: "careful", message: s.toastCareful },
    { key: "risky", tone: "risky", message: s.toastRisky, action: { label: s.tryAgain, onClick: () => hide("risky") } },
  ];
  const timeline = [
    { id: "a", label: s.tl1, time: s.t1, current: true },
    { id: "b", label: s.tl2, time: s.t2 },
    { id: "c", label: s.tl3, time: s.t3 },
  ];

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.lang = lang;
    el.dir = lang === "ar" ? "rtl" : "ltr";
  }, [theme, lang]);

  return (
    <div className="g-page">
      {only && <style>{`.g-section{display:none}` + only.map((n) => `.g-section:nth-of-type(${n + 1}){display:block}`).join("")}</style>}
      <header className="g-header">
        <div>
          <h1 className="g-title">{s.title}</h1>
          <p className="g-sub">{s.subtitle}</p>
        </div>
        <div className="g-controls">
          <Segmented ariaLabel={s.theme} value={theme} onChange={setTheme} options={[{ value: "light", label: s.light }, { value: "dark", label: s.dark }]} />
          <Segmented ariaLabel={s.language} value={lang} onChange={setLang} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
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

      <Section title={s.fields}>
        <div className="g-cols">
          <TextField label={s.fieldName} hint={s.fieldHint} defaultValue={s.fieldValue} />
          <TextField label={s.fieldEmail} error={s.fieldError} defaultValue={s.fieldBad} dir="ltr" />
          <TextField label={s.fieldBig} size="lg" placeholder={s.fieldValue} />
          <TextField label={s.fieldOff} disabled defaultValue={s.fieldValue} />
        </div>
      </Section>

      <Section title={s.switches}>
        <div className="g-stack g-narrow">
          <Switch label={s.swSave} checked={autoSave} onChange={setAutoSave} />
          <Switch label={s.swAsk} checked={askFirst} onChange={setAskFirst} />
          <Switch label={s.disabled} checked={false} onChange={() => undefined} disabled />
        </div>
      </Section>

      <Section title={s.segmented}>
        <Segmented
          ariaLabel={s.segView}
          value={seg}
          onChange={setSeg}
          options={[{ value: "preview", label: s.segPreview }, { value: "code", label: s.segCode }, { value: "chat", label: s.segChat }]}
        />
      </Section>

      <Section title={s.composer}>
        <div className="g-stack g-narrow">
          <Composer
            placeholder={s.composerHint}
            sendLabel={s.sendMsg}
            attachLabel={s.attachFiles}
            folder={{ label: s.workingIn, name: "SweetCrumb", path: "C:\\Projects\\SweetCrumb" }}
            onSubmit={setSent}
          />
          {sent && <p className="g-note" dir="auto">{sent}</p>}
        </div>
      </Section>

      <Section title={s.messages}>
        <div className="g-stack g-narrow">
          <Message role="user">{s.userMsg}</Message>
          <Message role="assistant">
            <p>{s.aiMsg1}</p>
            <p>{s.aiMsg2}</p>
            <p>{s.aiMsgAr}</p>
          </Message>
        </div>
      </Section>

      <Section title={s.plan}>
        <div className="g-narrow">
          <PlanCard
            title={s.planTitle}
            statusLabels={{ done: s.stDone, active: s.stActive, pending: s.stPending }}
            steps={[
              { label: s.step1, status: "done" },
              { label: s.step2, status: "active" },
              { label: s.step3, status: "pending" },
              { label: s.step4, status: "pending" },
            ]}
          />
        </div>
      </Section>

      <Section title={s.permission}>
        <div className="g-stack g-narrow">
          <PermissionPrompt
            level="safe"
            levelLabel={s.safe}
            title={s.permSafeTitle}
            description={s.permSafeDesc}
            actions={<Button variant="primary">{s.permSafeBtn}</Button>}
          />
          <PermissionPrompt
            level="careful"
            levelLabel={s.careful}
            title={s.permCarefulTitle}
            description={s.permCarefulDesc}
            detailsLink={{ label: s.permCarefulLink, onClick: () => undefined }}
            actions={<><Button variant="primary" icon="download">{s.install}</Button><Button>{s.notNow}</Button></>}
          />
          <PermissionPrompt
            level="risky"
            levelLabel={s.risky}
            title={s.permRiskyTitle}
            description={s.permRiskyDesc}
            detailsLink={{ label: s.permRiskyLink, onClick: () => undefined }}
            actions={<><Button variant="danger" icon="trash">{s.del}</Button><Button>{s.cancel}</Button></>}
          />
        </div>
      </Section>

      <Section title={s.rewindTitle}>
        <div className="g-narrow">
          <RewindTimeline items={timeline} restoreLabel={s.restoreHere} onRestore={setRestored} />
          {restored && <p className="g-note">{s.restored}</p>}
        </div>
      </Section>

      <Section title={s.energy}>
        <div className="g-stack g-narrow">
          <EnergyBar value={70} label={s.energyLabel} caption={s.energy70} />
          <EnergyBar value={15} label={s.energyLabel} caption={s.energy15} />
          <EnergyBar value={0} label={s.energyLabel} caption={s.energy0} />
        </div>
      </Section>

      <Section title={s.dialog}>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>{s.open}</Button>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={s.dlgTitle}
          actions={<><Button onClick={() => setDialogOpen(false)}>{s.dlgKeep}</Button><Button variant="danger" icon="trash" onClick={() => setDialogOpen(false)}>{s.del}</Button></>}
        >
          {s.dlgBody}
        </Dialog>
      </Section>

      <Section title={s.toast}>
        <div className="g-stack g-narrow">
          {toasts.filter((x) => !hidden.includes(x.key)).map((x) => (
            <Toast key={x.key} tone={x.tone} message={x.message} action={x.action} dismissLabel={s.dismiss} onDismiss={() => hide(x.key)} />
          ))}
          {hidden.length > 0 && <div><Button size="sm" onClick={() => setHidden([])}>{s.showToasts}</Button></div>}
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
