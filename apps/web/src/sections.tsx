import { useEffect, useRef, useState } from "react";
import { Icon, Logo, Message, PermissionPrompt, PlanCard, StatusIcon } from "@encelium/ui";
import type { IconName } from "@encelium/ui";
import type { Copy } from "./strings.ts";
import { Moon } from "./Moon.tsx";
import { Reveal, useParallax } from "./Reveal.tsx";

const INSTALLER = "./download/Encelium-Setup-0.1.0.exe";

/* ── Nav ────────────────────────────────────────────────────────── */

export function Nav({ t, onLang }: { t: Copy; onLang: () => void }) {
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
          <a href="#faq">{t.nav.faq}</a>
        </div>
        <button className="lang" onClick={onLang} aria-label="Switch language">{t.nav.langName}</button>
        <a className="btn btn-primary" href="#download">{t.nav.download}</a>
      </div>
    </nav>
  );
}

/* ── Hero ───────────────────────────────────────────────────────── */

export function Hero({ t }: { t: Copy }) {
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
        </div>
        <div className="hero-moon">
          <div className="moon-par" ref={moon}>
            <Moon theme="light" w={420} h={380} r={148} plates={100} jets={9} speed={85} rate={2.4} seed={7} />
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

/* ── Ocean band ─────────────────────────────────────────────────── */

export function Ocean({ t }: { t: Copy }) {
  const moon = useParallax(0.06);
  return (
    <section className="ocean" data-theme="dark">
      <div className="ocean-moon">
        <div ref={moon}>
          <Moon theme="dark" w={980} h={640} r={320} plates={120} jets={12} speed={90} rate={2.6} seed={11} />
        </div>
      </div>
      <div className="wrap ocean-in ocean-content">
        <Reveal><h2 className="big">{t.ocean.big}</h2></Reveal>
        <Reveal delay={140}><p className="lead">{t.ocean.sub}</p></Reveal>
        <Reveal delay={260}>
          <div className="ocean-chips">{t.ocean.chips.map((c) => <span className="chip" key={c}>{c}</span>)}</div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────── */

export function Faq({ t }: { t: Copy }) {
  return (
    <section className="faq wrap" id="faq">
      <Reveal><span className="kicker">{t.faq.kicker}</span></Reveal>
      <Reveal delay={80}><h2 className="h2" style={{ marginTop: "var(--space-4)" }}>{t.faq.title}</h2></Reveal>
      <div className="faq-list">
        {t.faq.items.map((f, k) => (
          <Reveal as="div" delay={k * 60} key={f.q}>
            <details>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Download ───────────────────────────────────────────────────── */

export function Download({ t }: { t: Copy }) {
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
          <Moon theme="light" w={220} h={190} r={64} plates={80} jets={6} speed={70} rate={1.8} seed={3} />
        </div>
      </Reveal>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────── */

export function Footer({ t }: { t: Copy }) {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <a className="brand" href="#top"><Logo size={18} /> Encelium</a>
        <span className="tag">{t.footer.tagline}</span>
        <span>{t.footer.opensource}</span>
        <span>{t.footer.rights}</span>
      </div>
    </footer>
  );
}
