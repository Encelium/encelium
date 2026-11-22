import { useEffect, useRef, useState } from "react";
import { Icon, Logo, Message, PermissionPrompt, PlanCard, StatusIcon } from "@encelium/ui";
import type { IconName } from "@encelium/ui";
import type { Copy } from "./strings.ts";
import { Moon } from "./Moon.tsx";
import { Reveal, useParallax } from "./Reveal.tsx";

const INSTALLER = "./download/Encelium-Setup-0.1.0.exe";

/* ── Nav ────────────────────────────────────────────────────────── */

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.4" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" />
  </svg>
);
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </svg>
);

export function Nav({ t, lang, onLang, theme, onTheme }: { t: Copy; lang: "en" | "ar"; onLang: (l: "en" | "ar") => void; theme: "light" | "dark"; onTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 8);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <nav className={["nav", scrolled ? "scrolled" : ""].join(" ")}>
      <div className="wrap nav-in">
        <a className="brand" href="#top"><Logo size={22} /> Encelium</a>
        <div className="nav-links">
          <a href="#features">{t.nav.features}</a>
          <a href="#how">{t.nav.how}</a>
          <a href="#makes">{t.nav.makes}</a>
          <a href="#faq">{t.nav.faq}</a>
          <a href="./contact.html">{t.nav.contact}</a>
        </div>
        <button className="theme-btn" onClick={onTheme} aria-label={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="seg" role="group" aria-label="Language">
          <button className={["seg-btn", lang === "en" ? "on" : ""].join(" ")} aria-pressed={lang === "en"} onClick={() => onLang("en")}>EN</button>
          <button className={["seg-btn", lang === "ar" ? "on" : ""].join(" ")} aria-pressed={lang === "ar"} onClick={() => onLang("ar")}>ع</button>
        </div>
        <a className="btn btn-primary" href="#download">{t.nav.download}</a>
      </div>
    </nav>
  );
}

/* ── Typewriter: example requests cycling in the hero ──────────── */

export function Typewriter({ phrases }: { phrases: string[] }) {
  const [text, setText] = useState(phrases[0]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    let pos = phrases[0].length;
    let dir: 1 | -1 = -1;
    let timer = 0;
    const tick = () => {
      const p = phrases[i];
      pos += dir;
      setText(p.slice(0, Math.max(0, pos)));
      if (dir < 0 && pos <= 0) { dir = 1; i = (i + 1) % phrases.length; timer = window.setTimeout(tick, 380); return; }
      if (dir > 0 && pos >= phrases[i].length) { dir = -1; timer = window.setTimeout(tick, 2200); return; }
      timer = window.setTimeout(tick, dir < 0 ? 24 : 44);
    };
    timer = window.setTimeout(tick, 1900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <p className="hero-examples" aria-hidden="true"><span dir="auto">{text}</span><i className="caret" /></p>;
}

/* ── Try it: a scripted taste of the agent, right in the hero ──── */

function TryBox({ t }: { t: Copy }) {
  const u = t.hero.try;
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"idle" | "q" | "work" | "done">("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const ask = () => { if (text.trim()) { setStage("q"); setPicked(null); } };
  const pick = (o: string) => { setPicked(o); setStage("work"); later(() => setStage("done"), 2000); };
  const reset = () => { setStage("idle"); setText(""); setPicked(null); };

  return (
    <div className="try">
      <p className="try-label">{u.label}</p>
      <div className="try-bar">
        <input
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder={u.ph} dir="auto" disabled={stage !== "idle"} aria-label={u.ph}
        />
        {stage === "idle"
          ? <button className="btn btn-primary try-send" onClick={ask}>{u.send}</button>
          : <button className="btn btn-ghost try-send" onClick={reset}>{u.again}</button>}
      </div>
      {stage !== "idle" && (
        <div className="try-card">
          <div className="try-user">{text}</div>
          {stage === "q" && (
            <div className="q-card">
              <p className="qt">{u.q}</p>
              <div className="q-opts">{u.opts.map((o, k) => <button className={["q-opt", k === 0 ? "rec" : ""].join(" ")} key={o} onClick={() => pick(o)}>{o}</button>)}</div>
            </div>
          )}
          {stage === "work" && <div className="work-line"><StatusIcon status="working" label={u.working} /> {u.working}</div>}
          {stage === "done" && (
            <>
              {picked && <div className="try-answer">{picked}</div>}
              <div className="work-line"><StatusIcon status="done" label={u.done} /> {u.done}</div>
              <div className="try-preview" aria-hidden="true">
                <div className="prev-bar"><i /><i /><i /></div>
                <div className="prev-hero">{t.ui.previewTitle}</div>
                <div className="prev-lines"><i /><i /><i /><i /></div>
              </div>
              <span className="chip try-demo"><Icon name="info" size={13} /> {u.demo}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────── */

export function Hero({ t, theme }: { t: Copy; theme: "light" | "dark" }) {
  const moon = useParallax(0.1);
  return (
    <header className="hero" id="top">
      <div className="wrap hero-in">
        <div>
          <Reveal><span className="kicker">{t.hero.kicker}</span></Reveal>
          <h1>{t.hero.title.map((line) => <span key={line}>{line.split(" ").map((w, i) => <span className="word" key={i}>{w}</span>)}</span>)}</h1>
          <Reveal delay={120}><p className="lead">{t.hero.sub}</p></Reveal>
          <Reveal delay={220}>
            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href={INSTALLER} download>
                <Icon name="download" size={18} /> {t.hero.cta}
              </a>
              <a className="btn btn-ghost btn-lg" href="#how">{t.hero.secondary}</a>
            </div>
            <p className="hero-note">{t.hero.ctaNote}</p>
          </Reveal>
          <Reveal delay={320}>
            <div className="hero-trust">{t.hero.trust.map((c) => <span className="chip" key={c}><Icon name="check" size={13} /> {c}</span>)}</div>
          </Reveal>
          <Reveal delay={420}><TryBox t={t} /></Reveal>
          <Typewriter key={t.dir} phrases={[...t.hero.examples]} />
        </div>
        <div className="hero-moon">
          <div className="moon-par" ref={moon}>
            <Moon theme={theme} w={420} h={380} r={148} plates={100} jets={9} speed={85} rate={2.4} seed={7} />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Steps ──────────────────────────────────────────────────────── */

export function Steps({ t }: { t: Copy }) {
  return (
    <section className="wrap" id="how" style={{ paddingTop: "var(--section-gap)" }}>
      <Reveal><span className="kicker">{t.steps.kicker}</span></Reveal>
      <Reveal delay={80}><h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{t.steps.title}</h2></Reveal>
      <ol className="steps-grid" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {t.steps.items.map((s, i) => (
          <Reveal as="li" className="step" delay={i * 120} key={s.t}>
            <span className="n" />
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* ── Showcase: one window, three screens on scroll ──────────────── */

export function Showcase({ t }: { t: Copy }) {
  const stickyRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setI(2); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const span = rect.height - innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, span)));
      setI(Math.min(2, Math.floor(p * 3)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const u = t.ui;
  return (
    <section className="showcase wrap" ref={wrapRef} style={{ height: "280vh" }}>
      <div className="show-sticky" ref={stickyRef}>
        <div className="show-head">
          <Reveal><span className="kicker">{t.showcase.kicker}</span></Reveal>
          <Reveal delay={80}><h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{t.showcase.title}</h2></Reveal>
        </div>

        <div className="window">
          <div className="titlebar">
            <Logo size={16} /> <span className="name">Encelium</span>
            <div className="tb-buttons"><i /><i /><i /></div>
          </div>
          <div className="screens">
            {/* 1 · it asks instead of guessing */}
            <div className={["screen", i === 0 ? "on" : ""].join(" ")}>
              <div className="chat-col">
                <Message role="user">{u.user1}</Message>
                <div className="q-card">
                  <p className="qt">{u.question.title}</p>
                  <div className="q-opts">
                    {u.question.options.map((o, k) => <span className={["q-opt", k === 0 ? "rec" : ""].join(" ")} key={o}>{o}</span>)}
                  </div>
                </div>
              </div>
              <div className="prev-col">
                <div className="prev-frame prev-empty">
                  <Icon name="browser" size={22} />
                  <span>{u.previewSoon}</span>
                </div>
              </div>
            </div>

            {/* 2 · plan, steps, permission */}
            <div className={["screen", i === 1 ? "on" : ""].join(" ")}>
              <div className="chat-col">
                <PlanCard
                  steps={[
                    { label: u.planSteps[0], status: "done" },
                    { label: u.planSteps[1], status: "active" },
                    { label: u.planSteps[2], status: "pending" },
                  ]}
                  statusLabels={u.stepStates}
                />
                <div className="work-line"><StatusIcon status="working" label={u.working} /> {u.working}</div>
                <PermissionPrompt
                  level="careful"
                  levelLabel={u.perm.levelLabel}
                  title={u.perm.title}
                  description={u.perm.description}
                  details={u.perm.details}
                  detailsLabels={{ show: u.perm.show, hide: u.perm.hide }}
                  actions={<span className="q-opt">{u.perm.allow}</span>}
                  icon="wrench"
                />
              </div>
              <div className="prev-col">
                <div className="prev-frame">
                  <div className="prev-bar"><i /><i /><i /></div>
                  <div className="prev-hero building">{u.previewTitle}</div>
                  <div className="prev-lines"><i /><i /><i /></div>
                </div>
              </div>
            </div>

            {/* 3 · the result, live, rewindable */}
            <div className={["screen", i === 2 ? "on" : ""].join(" ")}>
              <div className="chat-col">
                <Message role="assistant">{u.done}</Message>
                <div className="next-chips">{u.next.map((n) => <span className="q-opt" key={n}>{n}</span>)}</div>
              </div>
              <div className="prev-col">
                <div className="prev-frame">
                  <div className="prev-bar"><i /><i /><i /></div>
                  <div className="prev-hero">{u.previewTitle}</div>
                  <div className="prev-lines"><i /><i /><i /><i /></div>
                </div>
                <div className="rewind-demo">
                  <span className="chip"><Icon name="rewind" size={14} /> {u.rewind}: {u.before}</span>
                  <span className="chip">{u.now}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="caption" key={i}>{t.showcase.captions[i]}</p>
      </div>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────────────── */

const FEATURE_ICONS: IconName[] = ["rewind", "shield", "expand", "folderSort", "repeat", "plug"];

export function Features({ t }: { t: Copy }) {
  return (
    <section className="features wrap" id="features">
      <Reveal><span className="kicker">{t.features.kicker}</span></Reveal>
      <Reveal delay={80}><h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{t.features.title}</h2></Reveal>
      <div className="feat-grid">
        {t.features.items.map((f, k) => (
          <Reveal as="div" className="feat" delay={(k % 3) * 110} key={f.t}>
            <span className="tile"><Icon name={FEATURE_ICONS[k]} size={20} /></span>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Gallery: what it makes, each with a small drawn vignette ───── */

const GALLERY_MINIS: Record<string, string> = { page: "m-page", list: "m-list", grid: "m-grid-mini", files: "m-files", table: "m-table", cards: "m-cards" };

export function Gallery({ t }: { t: Copy }) {
  return (
    <section className="gallery wrap" id="makes">
      <Reveal><span className="kicker">{t.gallery.kicker}</span></Reveal>
      <Reveal delay={80}>
        <h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{t.gallery.title}</h2>
        <p className="lead" style={{ marginTop: "var(--space-4)", maxWidth: "56ch" }}>{t.gallery.lead}</p>
      </Reveal>
      <div className="gallery-grid">
        {t.gallery.items.map((g, k) => (
          <Reveal as="div" className="g-card" delay={(k % 3) * 110} key={g.t}>
            <div className={["mini", GALLERY_MINIS[g.v]].join(" ")} aria-hidden="true">
              {g.v === "page" && <><div className="m-bar"><i /><i /><i /></div><div className="m-title" /><div className="m-line" /><div className="m-line short" /><div className="m-line" /></>}
              {g.v === "list" && <><div className="m-row" /><div className="m-row" /><div className="m-row" /><div className="m-row" /><div className="m-row" /></>}
              {g.v === "grid" && <><div className="m-cell" /><div className="m-cell" /><div className="m-cell" /><div className="m-cell" /></>}
              {g.v === "files" && <><div className="m-file"><Icon name="folder" size={12} /><i /><Icon name="arrowRight" size={11} /><Icon name="folder" size={12} /><b /></div><div className="m-file"><Icon name="folder" size={12} /><i /><Icon name="arrowRight" size={11} /><Icon name="folder" size={12} /><b /></div><div className="m-file"><Icon name="folder" size={12} /><i /><Icon name="arrowRight" size={11} /><Icon name="folder" size={12} /><b /></div></>}
              {g.v === "table" && <><div className="m-line" /><div className="m-line short" /><div className="m-line" /><div className="m-line short" /><div className="m-sum" /></>}
              {g.v === "cards" && <><div className="m-card" /><div className="m-card back" /><div className="m-card back2" /></>}
            </div>
            <h3>{g.t}</h3>
            <p>{g.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Jargon translator: other tools vs Encelium ─────────────────── */

export function Jargon({ t }: { t: Copy }) {
  return (
    <section className="jargon wrap">
      <Reveal><span className="kicker">{t.jargon.kicker}</span></Reveal>
      <Reveal delay={80}>
        <h2 className="h2" style={{ marginTop: "var(--space-4)", maxWidth: "22ch" }}>{t.jargon.title}</h2>
        <p className="lead" style={{ marginTop: "var(--space-4)" }}>{t.jargon.lead}</p>
      </Reveal>
      <div className="jargon-table">
        <Reveal className="jargon-head">
          <span className="jh them">{t.jargon.them}</span>
          <span className="jh-arrow" aria-hidden="true" />
          <span className="jh us">{t.jargon.us}</span>
        </Reveal>
        {t.jargon.rows.map((r, k) => (
          <Reveal className="jargon-row" delay={k * 80} key={r.us}>
            <span className="jr them">{r.them}</span>
            <span className="jr-arrow" aria-hidden="true"><Icon name="arrowRight" size={16} /></span>
            <span className="jr us">{r.us}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Roadmap ────────────────────────────────────────────────────── */

const TAG_CLASS = ["tag-now", "tag-next", "tag-later"];

export function Roadmap({ t }: { t: Copy }) {
  return (
    <section className="roadmap wrap">
      <Reveal><span className="kicker">{t.roadmap.kicker}</span></Reveal>
      <Reveal delay={80}><h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{t.roadmap.title}</h2></Reveal>
      <div className="roadmap-grid">
        {t.roadmap.items.map((r, k) => (
          <Reveal as="div" className="r-card" delay={k * 120} key={r.t}>
            <span className={["r-tag", TAG_CLASS[k]].join(" ")}>{r.tag}</span>
            <h3>{r.t}</h3>
            <p>{r.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Compare: honest axes + platforms ───────────────────────────── */

function Mark({ v }: { v: string }) {
  if (v === "yes") return <span className="mk yes" aria-label="✓"><Icon name="check" size={13} /></span>;
  if (v === "no") return <span className="mk no" aria-label="—">–</span>;
  return <span className="mk txt">{v}</span>;
}

export function Compare({ t }: { t: Copy }) {
  const c = t.compare;
  return (
    <section className="compare wrap">
      <Reveal><span className="kicker">{c.kicker}</span></Reveal>
      <Reveal delay={80}>
        <h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{c.title}</h2>
        <p className="lead" style={{ marginTop: "var(--space-4)", maxWidth: "62ch" }}>{c.lead}</p>
      </Reveal>
      <Reveal delay={160}>
        <div className="cmp-scroll">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">{c.kicker}</span></th>
                <th scope="col" className="us">{c.colUs}</th>
                <th scope="col">{c.colA}</th>
                <th scope="col">{c.colB}</th>
                <th scope="col">{c.colC}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td className="us"><Mark v={r.us} /></td>
                  <td><Mark v={r.a} /></td>
                  <td><Mark v={r.b} /></td>
                  <td><Mark v={r.c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='cmp-note' dir='auto'>{c.note}</p>
      </Reveal>
    </section>
  );
}

/* ── Sign-in bonus band ────────────────────────────────────────────── */

// Where sign-in requests go: the local simulator while developing, the real
// gateway once it has a public domain. One constant to change at launch.
const AUTH_URL = 'http://127.0.0.1:8790';

/** The site's working sign-in card: Google, or an emailed code, against AUTH_URL. */
function SigninCard({ t }: { t: Copy }) {
  const s = t.bonus.signin;
  const [step, setStep] = useState<'pick' | 'code' | 'done'>('pick');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const google = async () => {
    setBusy(true); setFailed(false);
    try {
      const res = await fetch(AUTH_URL + '/auth/google');
      const body = await res.json();
      if (body.token) { setToken(body.token); setStep('done'); } else setFailed(true);
    } catch { setFailed(true); }
    setBusy(false);
  };

  const start = async () => {
    setBusy(true); setFailed(false);
    try {
      const res = await fetch(AUTH_URL + '/auth/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const body = await res.json();
      if (body.ok) { if (body.devCode) setDevCode(body.devCode); setStep('code'); } else setFailed(true);
    } catch { setFailed(true); }
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true); setFailed(false);
    try {
      const res = await fetch(AUTH_URL + '/auth/verify?email=' + encodeURIComponent(email) + '&code=' + encodeURIComponent(code));
      const body = await res.json();
      if (body.token) { setToken(body.token); setStep('done'); } else setFailed(true);
    } catch { setFailed(true); }
    setBusy(false);
  };

  const copy = async () => { try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* refused */ } };

  return (
    <div className='signin-card'>
      {step === 'pick' && (
        <>
          <button className='btn btn-primary' onClick={google} disabled={busy}>{busy ? s.busy : s.google}</button>
          <span className='signin-or'>{s.or}</span>
          <div className='signin-row'>
            <input type='email' dir='ltr' placeholder={s.email} value={email} onChange={(e) => setEmail(e.target.value.trim())} aria-label={s.email} />
            <button className='btn btn-ghost' onClick={start} disabled={busy || !email.includes('@')}>{s.send}</button>
          </div>
        </>
      )}
      {step === 'code' && (
        <>
          <p className='signin-note'>{devCode ? s.codeDev.replace('{code}', devCode) : s.codeSent}</p>
          <div className='signin-row'>
            <input inputMode='numeric' dir='ltr' placeholder={s.code} value={code} onChange={(e) => setCode(e.target.value.trim())} aria-label={s.code} />
            <button className='btn btn-ghost' onClick={verify} disabled={busy || code.length < 4}>{s.verify}</button>
          </div>
          <button className='signin-back' onClick={() => setStep('pick')}>{s.back}</button>
        </>
      )}
      {step === 'done' && (
        <div className='signin-done'>
          <p dir='auto'>{s.gotKey}</p>
          <div className='signin-key'>
            <code dir='ltr'>{token}</code>
            <button className='btn btn-ghost' onClick={copy}>{copied ? s.copied : s.copy}</button>
          </div>
        </div>
      )}
      {failed && <p className='signin-failed' role='alert'>{s.failed}</p>}
    </div>
  );
}

export function Bonus({ t }: { t: Copy }) {
  return (
    <section className='bonus wrap' id='account'>
      <Reveal className='bonus-card'>
        <span className='kicker'>{t.bonus.kicker}</span>
        <h2 className='h2'>{t.bonus.title}</h2>
        <p className='lead'>{t.bonus.body}</p>
        <SigninCard t={t} />
        <div className='bonus-chips'>{t.bonus.chips.map((c) => <span className='chip' key={c}>{c}</span>)}</div>
      </Reveal>
    </section>
  );
}

/* ── Ocean band ────────────────────────────────────────────────────────────────── */

export function Ocean({ t }: { t: Copy }) {
  const moon = useParallax(0.06);
  return (
    <section className="ocean" data-theme="dark">
      <div className="ocean-moon">
        <div ref={moon}>
          {/* h > 2r + 16: the sphere's crown keeps headroom inside the canvas,
              so nothing slices through the top of the moon. */}
          <Moon theme="dark" w={1100} h={840} r={350} plates={120} jets={12} speed={90} rate={2.6} seed={11} />
        </div>
      </div>
      <div className="wrap ocean-in ocean-content">
        <Reveal><h2 className="big">{t.ocean.big}</h2></Reveal>
        <Reveal delay={140}><p className="lead">{t.ocean.sub}</p></Reveal>
        <Reveal delay={260}>
          <div className="ocean-chips">
            {t.ocean.facts.map((f) => <span className="chip" key={f.t}><Icon name={f.icon as IconName} size={14} /> {f.t}</span>)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────── */

/** One FAQ row: opens and closes with a height animation. */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={["faq-item", open ? "open" : ""].join(" ")}>
      <button className="faq-q" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <i className="faq-x" aria-hidden="true" />
      </button>
      <div className="faq-body">
        <div className="faq-body-clip">
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq({ t }: { t: Copy }) {
  return (
    <section className="faq wrap" id="faq">
      <Reveal><span className="kicker">{t.faq.kicker}</span></Reveal>
      <Reveal delay={80}><h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{t.faq.title}</h2></Reveal>
      <div className="faq-list">
        {t.faq.items.map((f, k) => (
          <Reveal as="div" delay={k * 60} key={f.q}>
            <FaqItem q={f.q} a={f.a} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Download ───────────────────────────────────────────────────── */

export function Download({ t, theme }: { t: Copy; theme: "light" | "dark" }) {
  return (
    <section className="download wrap" id="download">
      <Reveal className="dl-card">
        <div>
          <span className="kicker">{t.download.kicker}</span>
          <h2 className="h2">{t.download.title}</h2>
          <p className="lead" style={{ marginTop: "var(--space-4)" }}>{t.download.sub}</p>
          <p className="dl-note">{t.download.note}</p>
        </div>
        <div className="dl-side">
          <a className="btn btn-primary btn-lg" href={INSTALLER} download>
            <Icon name="download" size={18} /> {t.download.cta}
          </a>
          <span className="dl-meta">{t.download.version}</span>
          <Moon theme={theme} w={220} h={190} r={64} plates={80} jets={6} speed={70} rate={1.8} seed={3} />
        </div>
      </Reveal>
      <ol className="dl-steps">
        {t.download.steps.map((s, k) => (
          <Reveal as="li" className="dl-step" delay={k * 110} key={s.t}>
            <span className="n">{k + 1}</span>
            <div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          </Reveal>
        ))}
      </ol>
      <Reveal delay={200}>
        <div className="cmp-platforms">
          <span className="cmp-pt">{t.download.platformsTitle}</span>
          {t.download.platforms.map((p) =>
            p.state === "now" ? (
              <a className="chip chip-dl" href={INSTALLER} download key={p.name}>
                <Icon name="download" size={13} /> {p.name} · {t.download.get}
              </a>
            ) : (
              <span className="chip chip-soon" key={p.name}>{p.name} · {t.download.soon}</span>
            ),
          )}
        </div>
      </Reveal>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────── */

export function Footer({ t }: { t: Copy }) {
  const hrefs = ["#features", "#how", "#makes", "#faq"];
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <a className="brand" href="#top"><Logo size={18} /> Encelium</a>
        <span className="tag">{t.footer.tagline}</span>
        <nav className="footer-links">
          {t.footer.links.map((l, k) => <a key={l} href={hrefs[k] ?? "#top"}>{l}</a>)}
          <a href="./contact.html">{t.nav.contact}</a>
        </nav>
        <span>{t.footer.opensource}</span>
        <span>{t.footer.rights}</span>
      </div>
    </footer>
  );
}
