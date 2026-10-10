import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button, Composer, Icon, IconButton, Markdown, Message, PermissionPrompt, PlanCard, RewindTimeline, Segmented, StatusIcon, Toast,
  type RewindItem,
} from "@enceladus/ui";
import { bridge, type Attachment, type Language, type StoredEvent } from "./bridge";
import { useAttachments } from "./useAttachments";
import { FilesPanel } from "./FilesPanel";
import { useRememberedNumber } from "./useLayout";
import { Splitter } from "./Splitter";
import type { Strings } from "./i18n";
import type { AgentEngine, AgentEvent, AgentRun } from "./agent/types";
import s from "./Work.module.css";

type PermissionEvent = Extract<AgentEvent, { type: "permission" }>;
type PlanEvent = Extract<AgentEvent, { type: "plan" }>;

type Item =
  | { kind: "user"; id: string; text: string; attachments?: string[] }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "plan"; id: string; plan: PlanEvent }
  | { kind: "activity"; id: string; text: string; details?: string }
  | { kind: "permission"; id: string; event: PermissionEvent; answer?: boolean }
  | { kind: "error"; id: string; message: string; suggestion?: string };

interface Checkpoint { id: string; label: string; at: number }
interface Status { phase: "thinking" | "working"; text: string }

export interface WorkProps {
  t: Strings;
  taskId: string;
  /** A new task: start with this request. Leave out to re-open a saved task. */
  prompt?: string;
  /** New task only: work in this folder instead of a new one. */
  folder?: string;
  /** New task only: files attached to the first request. */
  attachments?: Attachment[];
  language: Language;
  engine: AgentEngine;
  /** The right panel: docked beside the chat, or slid over it in small windows. */
  panel?: { open: boolean; mode: "docked" | "overlay"; onClose: () => void };
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

function CopyButton({ t, text }: { t: Strings; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await (bridge.copyText ? bridge.copyText(text) : navigator.clipboard.writeText(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable: nothing to do */ }
  };
  return (
    <Button variant="ghost" size="sm" icon={copied ? "check" : "copy"} onClick={copy} aria-live="polite">
      {copied ? t.work.copied : t.work.copy}
    </Button>
  );
}

export function Work({ t, taskId, prompt, folder, attachments, language, engine, panel = { open: true, mode: "docked", onClose: () => {} } }: WorkProps) {
  const [chatWidth, setChatWidth] = useRememberedNumber("enceladus.chatWidth", 480);
  const workRef = useRef<HTMLElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [tab, setTab] = useState<"preview" | "files" | "rewind">("files");
  const [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState<string | null>(null);
  const [pageVersion, setPageVersion] = useState(0);
  const files = useAttachments(t, setNotice);

  const runRef = useRef<AgentRun | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const counter = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const firstRun = useRef(true);
  const alive = useRef(true);
  const pendingLeave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plans = useRef(new Map<string, PlanEvent>());
  const planTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Apply one event (live or replayed) for run number `n`. */
  const apply = useCallback((e: AgentEvent | StoredEvent, n: number, live = false) => {
    const planId = `plan-${n}`;
    switch (e.type) {
      case "user":
        setItems((prev) => [...prev, { kind: "user", id: `user-${n}`, text: e.text, attachments: e.attachments }]);
        break;
      case "status":
        setStatus({ phase: e.phase, text: e.text });
        break;
      case "plan": {
        const show = (plan: PlanEvent) => setItems((prev) =>
          prev.some((i) => i.id === planId)
            ? prev.map((i) => (i.id === planId ? { kind: "plan", id: planId, plan } : i))
            : [...prev, { kind: "plan", id: planId, plan }],
        );
        const before = plans.current.get(planId);
        plans.current.set(planId, e);
        planTimers.current.forEach(clearTimeout);
        planTimers.current = [];
        // Several steps finished at once: tick them off one by one, so progress reads as progress.
        const ticked = live && before ? e.steps.flatMap((st, i) => (st.status === "done" && before.steps[i]?.label === st.label && before.steps[i]?.status !== "done" ? [i] : [])) : [];
        if (ticked.length < 2) { show(e); break; }
        ticked.forEach((_, k) => {
          const last = k === ticked.length - 1;
          const step: PlanEvent = last ? e : {
            ...e,
            steps: e.steps.map((st, i) => {
              const at = ticked.indexOf(i);
              return at > k ? { ...st, status: at === k + 1 ? "active" : before!.steps[i]!.status } : st;
            }),
          };
          planTimers.current.push(setTimeout(() => show(step), k * 450));
        });
        break;
      }
      case "message-delta":
        setItems((prev) => {
          const id = `msg-${n}-${e.id}`;
          return prev.some((i) => i.id === id)
            ? prev.map((i) => (i.id === id && i.kind === "assistant" ? { ...i, text: i.text + e.text } : i))
            : [...prev, { kind: "assistant", id, text: e.text }];
        });
        break;
      case "message":
        setItems((prev) => [...prev, { kind: "assistant", id: `msg-${n}-${prev.length}`, text: e.text }]);
        break;
      case "message-done":
        break;
      case "permission":
        setStatus(null);
        setItems((prev) => [...prev, { kind: "permission", id: `perm-${n}-${e.requestId}`, event: e }]);
        break;
      case "permission-answer":
        setItems((prev) => prev.map((i) => (i.kind === "permission" && i.event.requestId === e.requestId ? { ...i, answer: e.allowed } : i)));
        break;
      case "checkpoint":
        setCheckpoints((prev) => [...prev, { id: e.id, label: e.label, at: e.at }]);
        break;
      case "restored":
        setCheckpoints((prev) => { const i = prev.findIndex((c) => c.id === e.checkpointId); return i === -1 ? prev : prev.slice(0, i); });
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
  }, []);

  const startRun = useCallback((text: string, files?: Attachment[]) => {
    const n = ++counter.current;
    unsubRef.current?.();
    apply({ type: "user", text, attachments: files?.length ? files.map((f) => f.name) : undefined }, n);
    setRunning(true);
    setStatus(null);
    stuck.current = true;
    const run = engine.start(text, { language, folder: firstRun.current ? folder : undefined, attachments: files });
    firstRun.current = false;
    runRef.current = run;
    unsubRef.current = run.onEvent((e) => apply(e, n, true));
  }, [engine, language, folder, apply]);

  // New task: start it. Saved task: show what happened, then wait for a follow-up.
  useEffect(() => {
    // Leaving the screen stops the run, but only on the next tick: React's development mode
    // unmounts and remounts every screen once, and that must not start the task twice.
    const leave = () => {
      pendingLeave.current = setTimeout(() => {
        pendingLeave.current = null;
        alive.current = false;
        unsubRef.current?.();
        unsubRef.current = null;
        runRef.current?.stop(); // quiet: no "stopped" message if the screen goes away
        runRef.current = null;
      }, 0);
    };
    if (pendingLeave.current) { // the development-mode remount: carry on as if nothing happened
      clearTimeout(pendingLeave.current);
      pendingLeave.current = null;
      return leave;
    }
    alive.current = true;
    counter.current = 0;
    setItems([]);
    setCheckpoints([]);
    if (prompt !== undefined) {
      startRun(prompt, attachments);
    } else if (bridge.tasks) {
      firstRun.current = false;
      bridge.tasks.events({ taskId }).then((events) => {
        if (!alive.current) return;
        for (const e of events) {
          if (e.type === "user") counter.current++;
          apply(e, Math.max(counter.current, 1));
        }
        // A question left unanswered when the app closed can't be answered any more.
        setItems((prev) => prev.map((i) => (i.kind === "permission" && i.answer === undefined ? { ...i, answer: false } : i)));
        setStatus(null);
        setRunning(false);
      });
    }
    return leave;
    // The task is fixed for this screen; App re-mounts it for another task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live preview: find the page, and reload it whenever the task's files change.
  const hadPage = useRef(false);
  useEffect(() => {
    if (!bridge.tasks) return;
    const tasks = bridge.tasks;
    const refresh = async () => {
      const found = await tasks.findPreview({ taskId });
      setPage(found);
      setPageVersion((v) => v + 1);
      if (found && !hadPage.current) setTab("preview"); // first time there's something to see
      if (!found) setTab((current) => (current === "preview" ? "files" : current)); // the page went away
      hadPage.current = !!found;
    };
    refresh();
    return tasks.onFilesChanged((id) => { if (id === taskId) refresh(); });
  }, [taskId]);

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

  const lastRequest = [...items].reverse().find((i): i is Extract<Item, { kind: "user" }> => i.kind === "user")?.text;
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
    <main
      ref={workRef}
      className={[s.work, !panel.open || panel.mode === "overlay" ? s.chatOnly : ""].filter(Boolean).join(" ")}
      style={{ "--chat-width": `${chatWidth}px` } as React.CSSProperties}
    >
      <section className={s.chat}>
        <div ref={listRef} className={s.list} role="log" aria-live="polite" aria-label={t.work.messages} onScroll={onScroll}>
          {items.map((item, index) => {
            switch (item.kind) {
              case "user":
                return (
                  <div key={item.id} className={s.userTurn}>
                    {item.text && <Message role="user">{item.text}</Message>}
                    {item.attachments?.length ? (
                      <ul className={s.sentFiles} aria-label={t.attachedFiles}>
                        {item.attachments.map((name) => (
                          <li key={name}><Icon name={/\.(png|jpe?g|gif|webp)$/i.test(name) ? "image" : "file"} size={14} /><span dir="auto">{name}</span></li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              case "assistant": {
                // A note made while working (more work follows) is quiet; the final answer is full size.
                const next = items[index + 1];
                const note = !!next && (next.kind === "plan" || next.kind === "permission" || (next.kind === "activity" && !next.id.startsWith("done-")));
                if (note) return <Message key={item.id} role="assistant" className={s.note}><Markdown text={item.text} /></Message>;
                return (
                  <div key={item.id} className={s.answer}>
                    <Message role="assistant"><Markdown text={item.text} /></Message>
                    {(next || !running) && <div className={s.answerActions}><CopyButton t={t} text={item.text} /></div>}
                  </div>
                );
              }
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
                    details={ev.details}
                    detailsLabels={{ show: t.work.showCommand, hide: t.work.hideCommand }}
                    icon={ev.details ? "terminal" : undefined}
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
                    {/* The last request failed (no connection, a limit…): one click sends it again. */}
                    {index === items.length - 1 && !running && lastRequest && (
                      <div className={s.answerActions}>
                        <Button variant="secondary" size="sm" icon="repeat" onClick={() => startRun(lastRequest)}>{t.work.tryAgain}</Button>
                      </div>
                    )}
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
            onSubmit={(text) => { startRun(text, files.files); files.clear(); }}
            onAttach={files.available ? files.choose : undefined}
            onDropFiles={files.available ? files.drop : undefined}
            onPasteImages={files.available ? files.paste : undefined}
            attachments={files.chips}
            onRemoveAttachment={files.remove}
            removeLabel={t.removeAttachment}
          />
        </div>
      </section>

      {panel.open && panel.mode === "docked" && (
        <Splitter label={t.layout.resize} width={chatWidth} onChange={setChatWidth} containerRef={workRef} />
      )}
      {panel.open && panel.mode === "overlay" && <div className={s.scrim} onClick={panel.onClose} />}
      {panel.open && <aside className={[s.panel, panel.mode === "overlay" ? s.panelOver : ""].filter(Boolean).join(" ")}>
        <div className={s.panelHead}>
          <Segmented
            ariaLabel={t.work.panelTabs}
            value={tab}
            onChange={setTab}
            options={[
              // No page to preview: no Preview tab, rather than an empty panel.
              ...(page && bridge.tasks ? [{ value: "preview" as const, label: t.work.tabPreview }] : []),
              { value: "files", label: t.work.tabFiles },
              { value: "rewind", label: t.work.tabRewind },
            ]}
          />
          <IconButton icon="close" size="sm" label={t.layout.hidePanel} className={s.panelClose} onClick={panel.onClose} />
        </div>
        <div className={s.panelBody}>
          {tab === "files" && bridge.tasks ? (
            <FilesPanel t={t} taskId={taskId} version={pageVersion} />
          ) : tab === "preview" || tab === "files" ? (
            page && bridge.tasks ? (
              <div className={s.preview}>
                <div className={s.previewBar}>
                  <span className={s.previewPage} dir="ltr">{page}</span>
                  <Button variant="ghost" size="sm" iconEnd="arrowRight" onClick={() => bridge.tasks?.openPreview({ taskId, page })}>{t.work.openInBrowser}</Button>
                </div>
                {/* Sandboxed: the page can run its own scripts but can't reach the app. */}
                <iframe
                  key={pageVersion}
                  className={s.frame}
                  title={t.work.previewTitle}
                  src={`enceladus-preview://${taskId}/${page}`}
                  sandbox="allow-scripts allow-forms allow-modals"
                />
              </div>
            ) : (
              <div className={s.empty}>
                <span className={s.emptyIcon}><Icon name="browser" size={24} /></span>
                <p>{t.work.previewEmpty}</p>
              </div>
            )
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
                // We're back before that point: it and everything after it are replaced by one
                // "before going back" point, which brings the newer work back if needed.
                const undo = result.checkpoint;
                setCheckpoints((prev) => [...prev.slice(0, prev.findIndex((c) => c.id === id)), ...(undo ? [undo] : [])]);
                setNotice(t.work.rewindDone);
              }}
            />
          )}
        </div>
      </aside>}

      {notice && (
        <div className="app-toast">
          <Toast tone="neutral" message={notice} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss} />
        </div>
      )}
    </main>
  );
}
