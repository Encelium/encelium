import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button, Composer, Icon, Message, PermissionPrompt, PlanCard, RewindTimeline, Segmented, StatusIcon, Toast,
  type RewindItem,
} from "@enceladus/ui";
import type { Language } from "./bridge";
import type { Strings } from "./i18n";
import type { AgentEngine, AgentEvent, AgentRun } from "./agent/types";
import s from "./Work.module.css";

type PermissionEvent = Extract<AgentEvent, { type: "permission" }>;
type PlanEvent = Extract<AgentEvent, { type: "plan" }>;

type Item =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "plan"; id: string; plan: PlanEvent }
  | { kind: "activity"; id: string; text: string; details?: string }
  | { kind: "permission"; id: string; event: PermissionEvent; answer?: boolean }
  | { kind: "error"; id: string; message: string; suggestion?: string };

interface Checkpoint { id: string; label: string; at: number }
interface Status { phase: "thinking" | "working"; text: string }

export interface WorkProps {
  t: Strings;
  prompt: string;
  language: Language;
  engine: AgentEngine;
  onNewTask?: () => void;
}

function ActivityLine({ t, text, details }: { t: Strings; text: string; details?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={s.activity}>
      <div className={s.activityRow}>
        <span className={s.activityIcon}><Icon name="check" size={14} strokeWidth={2.6} /></span>
        <span className={s.activityText} dir="auto">{text}</span>
        {details && (
          <button type="button" className={s.detailsToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? t.work.hideDetails : t.work.showDetails}
          </button>
        )}
      </div>
      {details && open && <pre className={s.code} dir="ltr">{details}</pre>}
    </div>
  );
}

export function Work({ t, prompt, language, engine }: WorkProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [tab, setTab] = useState<"preview" | "rewind">("preview");
  const [notice, setNotice] = useState<string | null>(null);

  const runRef = useRef<AgentRun | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const counter = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);

  const startRun = useCallback((text: string) => {
    const n = ++counter.current;
    const planId = `plan-${n}`;
    unsubRef.current?.();
    setItems((prev) => [...prev, { kind: "user", id: `user-${n}`, text }]);
    setRunning(true);
    setStatus(null);
    stuck.current = true;

    const run = engine.start(text, { language });
    runRef.current = run;
    unsubRef.current = run.onEvent((e) => {
      switch (e.type) {
        case "status":
          setStatus({ phase: e.phase, text: e.text });
          break;
        case "plan":
          setItems((prev) =>
            prev.some((i) => i.id === planId)
              ? prev.map((i) => (i.id === planId ? { kind: "plan", id: planId, plan: e } : i))
              : [...prev, { kind: "plan", id: planId, plan: e }],
          );
          break;
        case "message-delta":
          setItems((prev) => {
            const id = `msg-${n}-${e.id}`;
            return prev.some((i) => i.id === id)
              ? prev.map((i) => (i.id === id && i.kind === "assistant" ? { ...i, text: i.text + e.text } : i))
              : [...prev, { kind: "assistant", id, text: e.text }];
          });
          break;
        case "message-done":
          break;
        case "permission":
          setStatus(null);
          setItems((prev) => [...prev, { kind: "permission", id: `perm-${n}-${e.requestId}`, event: e }]);
          break;
        case "checkpoint":
          setCheckpoints((prev) => [...prev, { id: e.id, label: e.label, at: e.at }]);
          break;
        case "activity":
          setItems((prev) => [...prev, { kind: "activity", id: `act-${n}-${prev.length}`, text: e.text, details: e.details }]);
          break;
        case "done":
          setStatus(null);
          setRunning(false);
          // A quiet check-mark line, not a second message (the final message already says it in full).
          setItems((prev) => [...prev, { kind: "activity", id: `done-${n}`, text: e.summary }]);
          break;
        case "error":
          setStatus(null);
          setRunning(false);
          setItems((prev) => [...prev, { kind: "error", id: `err-${n}`, message: e.message, suggestion: e.suggestion }]);
          break;
      }
    });
  }, [engine, language]);

  // Start the first run. Quiet cleanup (no "stopped" message) if the screen goes away.
  useEffect(() => {
    counter.current = 0;
    setItems([]);
    setCheckpoints([]);
    startRun(prompt);
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
      runRef.current?.stop();
      runRef.current = null;
    };
    // The prompt is fixed for this screen; App re-mounts it for a different task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (item: Extract<Item, { kind: "permission" }>, allowed: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === item.id && i.kind === "permission" ? { ...i, answer: allowed } : i)));
    runRef.current?.respond(item.event.requestId, allowed);
  };

  // Follow new content unless the person scrolled up to read.
  const onScroll = () => {
    const el = listRef.current;
    if (el) stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };
  useEffect(() => {
    const el = listRef.current;
    if (el && stuck.current) el.scrollTop = el.scrollHeight;
  }, [items, status]);

  const timeFormat = new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" });
  // Rewind points are "how things were before a change", so none of them is "now":
  // a "Now" entry sits on top, and every point below it can be restored.
  const rewindItems: RewindItem[] = checkpoints.length
    ? [
        { id: "__now", label: t.work.rewindNow, time: "", current: true },
        ...[...checkpoints].reverse().map((c) => ({ id: c.id, label: c.label, time: timeFormat.format(c.at) })),
      ]
    : [];

  return (
    <main className={s.work}>
      <section className={s.chat}>
        <div ref={listRef} className={s.list} role="log" aria-live="polite" aria-label={t.work.messages} onScroll={onScroll}>
          {items.map((item) => {
            switch (item.kind) {
              case "user":
                return <Message key={item.id} role="user">{item.text}</Message>;
              case "assistant":
                return <Message key={item.id} role="assistant">{item.text}</Message>;
              case "plan":
                return <PlanCard key={item.id} title={item.plan.title} steps={item.plan.steps} statusLabels={t.work.planStatus} />;
              case "activity":
                return <ActivityLine key={item.id} t={t} text={item.text} details={item.details} />;
              case "permission": {
                const ev = item.event;
                return (
                  <PermissionPrompt
                    key={item.id}
                    level={ev.level}
                    levelLabel={t.work.levels[ev.level]}
                    title={ev.title}
                    description={ev.description}
                    actions={
                      item.answer === undefined ? (
                        <>
                          <Button variant="primary" onClick={() => answer(item, true)}>{ev.allowLabel}</Button>
                          <Button variant="secondary" onClick={() => answer(item, false)}>{ev.denyLabel}</Button>
                        </>
                      ) : (
                        <span className={s.answered}>
                          <Icon name={item.answer ? "check" : "close"} size={14} />
                          {item.answer ? t.work.allowed : t.work.notAllowed}
                        </span>
                      )
                    }
                  />
                );
              }
              case "error":
                return (
                  <div key={item.id} className={s.errorBlock}>
                    <Message role="assistant">{item.message}</Message>
                    {item.suggestion && <p className={s.suggestion} dir="auto">{item.suggestion}</p>}
                  </div>
                );
            }
          })}
          {status && (
            <div className={s.status}>
              <StatusIcon status={status.phase} label={status.text} size={20} />
              <span dir="auto">{status.text}</span>
            </div>
          )}
        </div>

        <div className={s.footer}>
          {running && (
            <div className={s.stopRow}>
              <Button variant="secondary" size="sm" icon="close" onClick={() => runRef.current?.stop()}>{t.work.stop}</Button>
            </div>
          )}
          <Composer
            placeholder={running ? t.work.followUpBusy : t.work.followUpPlaceholder}
            inputLabel={t.work.followUpPlaceholder}
            sendLabel={t.send}
            attachLabel={t.attach}
            disabled={running}
            onSubmit={startRun}
          />
        </div>
      </section>

      <aside className={s.panel}>
        <div className={s.panelHead}>
          <Segmented
            ariaLabel={t.work.panelTabs}
            value={tab}
            onChange={setTab}
            options={[
              { value: "preview", label: t.work.tabPreview },
              { value: "rewind", label: t.work.tabRewind },
            ]}
          />
        </div>
        <div className={s.panelBody}>
          {tab === "preview" ? (
            <div className={s.empty}>
              <span className={s.emptyIcon}><Icon name="browser" size={24} /></span>
              <p>{t.work.previewEmpty}</p>
            </div>
          ) : rewindItems.length === 0 ? (
            <div className={s.empty}>
              <span className={s.emptyIcon}><Icon name="rewind" size={24} /></span>
              <p>{t.work.rewindEmpty}</p>
            </div>
          ) : (
            <RewindTimeline
              items={rewindItems}
              restoreLabel={t.work.restoreHere}
              onRestore={async (id) => {
                if (!engine.restore) { setNotice(t.work.rewindSoon); return; }
                if (running) { setNotice(t.work.rewindWhileWorking); return; }
                const result = await engine.restore(id);
                if (!result.ok) { setNotice(result.message); return; }
                // We're back before that point: it and everything after it no longer exist.
                setCheckpoints((prev) => prev.slice(0, prev.findIndex((c) => c.id === id)));
                setNotice(t.work.rewindDone);
              }}
            />
          )}
        </div>
      </aside>

      {notice && (
        <div className="app-toast">
          <Toast tone="neutral" message={notice} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss} />
        </div>
      )}
    </main>
  );
}
