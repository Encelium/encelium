import { useCallback, useEffect, useRef, useState } from "react";
import {
  BidiText, Button, Composer, Icon, IconButton, Markdown, Message, PermissionPrompt, PlanCard, RewindTimeline, Segmented, StatusIcon, Toast,
  type RewindItem,
} from "@enceladus/ui";
import { bridge, type Attachment, type Language, type StoredEvent } from "./bridge";
import { useAttachments } from "./useAttachments";
import { FilesPanel } from "./FilesPanel";
import { useRememberedNumber } from "./useLayout";
import { Splitter } from "./Splitter";
import { Compare } from "./Compare";
import { CheckToggle, useCheckResult } from "./CheckToggle";
import { QuestionCard } from "./QuestionCard";
import { SmartActions } from "./SmartActions";
import type { Strings } from "./i18n";
import type { AgentEngine, AgentEvent, AgentRun } from "./agent/types";
import type { FileChange } from "@enceladus/agent-core/events";
import s from "./Work.module.css";

type PermissionEvent = Extract<AgentEvent, { type: "permission" }>;
type PlanEvent = Extract<AgentEvent, { type: "plan" }>;

type Item =
  | { kind: "user"; id: string; text: string; attachments?: string[]; pointed?: string }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "plan"; id: string; plan: PlanEvent }
  | { kind: "activity"; id: string; text: string; details?: string; file?: FileChange }
  | { kind: "permission"; id: string; event: PermissionEvent; answer?: boolean; remember?: boolean }
  | { kind: "error"; id: string; message: string; suggestion?: string; details?: string }
  | { kind: "suggestions"; id: string; items: string[] }
  | { kind: "question"; id: string; requestId: string; question: string; options: string[]; answer?: string };

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
  /** New task only: a folder name to use (from a recipe). */
  folderName?: string;
  language: Language;
  engine: AgentEngine;
  /** How much the agent explains (from Settings). */
  detail?: "full" | "short";
  /** The right panel: docked beside the chat, or slid over it in small windows. */
  panel?: { open: boolean; mode: "docked" | "overlay"; onClose: () => void; onOpen: () => void };
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

/**
 * A picture sent with a request, shown from its copy in the task folder. Right after sending,
 * the copy may not exist yet, so it tries again once; if it still can't, it shows the name.
 */
function SentPicture({ taskId, name }: { taskId: string; name: string }) {
  const [attempt, setAttempt] = useState(0);
  const failed = attempt > 1;
  if (failed) return <li><Icon name="image" size={14} /><span dir="auto">{name}</span></li>;
  return (
    <li className={s.sentPicture}>
      <img
        key={attempt}
        src={`enceladus-preview://${taskId}/attachments/${encodeURIComponent(name)}${attempt ? `?retry=${attempt}` : ""}`}
        alt={name}
        title={name}
        onError={() => setTimeout(() => setAttempt((n) => n + 1), attempt ? 0 : 1500)}
      />
    </li>
  );
}

/** What the server said, hidden until asked for (useful when reporting a problem). */
function ErrorDetails({ t, details }: { t: Strings; details: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={s.errorDetails}>
      <button type="button" className={s.detailsToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? t.work.hideDetails : t.work.showDetails}</button>
      {open && <pre className={s.code} dir="ltr">{details}</pre>}
    </div>
  );
}

const CHANGE_ICON: Record<FileChange["change"], "plus" | "pencil" | "trash" | "arrowRight"> = { created: "plus", changed: "pencil", deleted: "trash", moved: "arrowRight" };

/** "What changed": the files one request created, changed, moved or deleted. */
function ChangesCard({ t, changes, onOpen, onUndo }: { t: Strings; changes: FileChange[]; onOpen: (path: string) => void; onUndo?: () => void }) {
  // One line per file (its last change wins), in the order they first changed.
  const byPath = new Map<string, FileChange>();
  for (const c of changes) byPath.set(c.change === "moved" && c.to ? c.to : c.path, c);
  const list = [...byPath.entries()];
  const counts = (["created", "changed", "moved", "deleted"] as const).map((k) => [k, list.filter(([, c]) => c.change === k).length] as const).filter(([, n]) => n > 0);
  return (
    <div className={s.changes}>
      <div className={s.changesHead}>
        <span className={s.changesTitle}>{t.work.whatChanged}</span>
        <span className={s.changesCounts}>{counts.map(([k, n]) => `${n} ${t.work.changeWords[k]}`).join(" · ")}</span>
        {onUndo && <Button variant="ghost" size="sm" icon="rewind" className={s.undo} onClick={onUndo}>{t.work.undo}</Button>}
      </div>
      <ul className={s.changesList}>
        {list.slice(0, 8).map(([path, c]) => (
          <li key={path}>
            <button type="button" className={s.changeRow} disabled={c.change === "deleted"} onClick={() => onOpen(path)}>
              <Icon name={CHANGE_ICON[c.change]} size={14} />
              <span className={s.changePath} dir="ltr">{c.change === "moved" ? `${c.path} → ${c.to}` : path}</span>
            </button>
          </li>
        ))}
        {list.length > 8 && <li className={s.changeMore}>+{list.length - 8}</li>}
      </ul>
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

export function Work({ t, taskId, prompt, folder, attachments, folderName, language, engine, detail = "full", panel = { open: true, mode: "docked", onClose: () => {}, onOpen: () => {} } }: WorkProps) {
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
  const [comparing, setComparing] = useState(false);
  const [draft, setDraft] = useState("");
  const [check, setCheck] = useCheckResult();
  const [focusRequest, setFocusRequest] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);
  // "Point at it": picking a part of the preview, and the part picked for the next message.
  const [picking, setPicking] = useState(false);
  const [pointed, setPointed] = useState<{ tag: string; text: string; path: string } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [fileToOpen, setFileToOpen] = useState<{ path: string; n: number } | null>(null);
  const pointOfRun = useRef(new Map<number, string>());
  // Live thinking text (models that stream it), and how much the model has written in this step.
  const [thinking, setThinking] = useState("");
  const written = useRef(0);
  const [writtenShown, setWrittenShown] = useState(0);
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
        setItems((prev) => [...prev, { kind: "user", id: `user-${n}`, text: e.text, attachments: e.attachments, pointed: "pointed" in e ? e.pointed : undefined }]);
        break;
      case "status":
        setStatus({ phase: e.phase, text: e.text });
        if (e.phase === "working") { written.current += 300; setThinking(""); }
        break;
      case "thinking-delta":
        written.current += e.text.length;
        setThinking((prev) => (prev + e.text).slice(-1200));
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
        written.current += e.text.length;
        setThinking("");
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
        setItems((prev) => prev.map((i) => (i.kind === "permission" && i.event.requestId === e.requestId ? { ...i, answer: e.allowed, remember: e.remember } : i)));
        break;
      case "checkpoint":
        pointOfRun.current.set(n, e.id); // "Undo" under that request's answer goes back to here
        setCheckpoints((prev) => [...prev, { id: e.id, label: e.label, at: e.at }]);
        break;
      case "restored":
        setCheckpoints((prev) => { const i = prev.findIndex((c) => c.id === e.checkpointId); return i === -1 ? prev : prev.slice(0, i); });
        break;
      case "activity":
        setItems((prev) => [...prev, { kind: "activity", id: `act-${n}-${prev.length}`, text: e.text, details: e.details, file: "file" in e ? e.file : undefined }]);
        break;
      case "question":
        setStatus(null);
        setItems((prev) => [...prev, { kind: "question", id: `q-${n}-${e.requestId}`, requestId: e.requestId, question: e.question, options: e.options }]);
        break;
      case "answer":
        setItems((prev) => prev.map((i) => (i.kind === "question" && i.requestId === e.requestId ? { ...i, answer: e.text } : i)));
        break;
      case "retried":
        // "Try again": the error it answers disappears; the same request carries on below.
        setItems((prev) => { const at = prev.map((i) => i.kind).lastIndexOf("error"); return at === -1 ? prev : [...prev.slice(0, at), ...prev.slice(at + 1)]; });
        break;
      case "suggestions":
        // Only the newest set is useful; older ones were answered already.
        setItems((prev) => [...prev.filter((i) => i.kind !== "suggestions"), { kind: "suggestions", id: `next-${n}`, items: e.items }]);
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
        setItems((prev) => [...prev, { kind: "error", id: `err-${n}`, message: e.message, suggestion: e.suggestion, details: "details" in e ? e.details : undefined }]);
        break;
    }
  }, []);

  const startRun = useCallback((text: string, files?: Attachment[], retry = false, point?: { label: string; context: string }) => {
    // A retry belongs to the same request: same number, no new message, the error goes away.
    const n = retry ? Math.max(counter.current, 1) : ++counter.current;
    unsubRef.current?.();
    setItems((prev) => prev.filter((i) => i.kind !== "suggestions"));
    if (retry) apply({ type: "retried" }, n);
    else apply({ type: "user", text, attachments: files?.length ? files.map((f) => f.name) : undefined, pointed: point?.label }, n);
    setRunning(true);
    setStatus(null);
    stuck.current = true;
    const run = engine.start(text, { language, folder: firstRun.current ? folder : undefined, folderName: firstRun.current ? folderName : undefined, attachments: files, check, retry, pointed: point, detail });
    firstRun.current = false;
    runRef.current = run;
    unsubRef.current = run.onEvent((e) => apply(e, n, true));
  }, [engine, language, folder, folderName, apply, check, detail]);

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
        setItems((prev) => prev.map((i) => (i.kind === "permission" && i.answer === undefined ? { ...i, answer: false } : i.kind === "question" && i.answer === undefined ? { ...i, answer: "—" } : i)));
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

  const answer = (item: Extract<Item, { kind: "permission" }>, allowed: boolean, remember = false) => {
    setItems((prev) => prev.map((i) => (i.id === item.id && i.kind === "permission" ? { ...i, answer: allowed, remember } : i)));
    runRef.current?.respond(item.event.requestId, allowed, remember);
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

  useEffect(() => {
    if (!picking) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return; // only our preview
      const data = e.data as { type?: string; tag?: string; text?: string; path?: string };
      if (data?.type === "enceladus-pick" && data.tag) {
        setPointed({ tag: data.tag, text: String(data.text ?? ""), path: String(data.path ?? "") });
        setPicking(false);
        setFocusRequest((x) => x + 1);
      } else if (data?.type === "enceladus-pick-cancel") setPicking(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [picking]);
  const pointLabel = pointed ? `${t.work.partNames[pointed.tag as keyof typeof t.work.partNames] ?? `<${pointed.tag}>`}${pointed.text ? `: “${pointed.text.slice(0, 40)}${pointed.text.length > 40 ? "…" : ""}”` : ""}` : "";
  const pointContext = pointed && page ? `[The person pointed at a part of ${page} in the preview: a <${pointed.tag}> element${pointed.text ? ` with the text "${pointed.text}"` : ""}${pointed.path ? ` (CSS path: ${pointed.path})` : ""}. Their request is about that part.]` : "";

  // Rewind to a point (from the Rewind tab, or "Undo" under an answer).
  const restoreTo = async (id: string) => {
    if (!engine.restore) { setNotice(t.work.rewindSoon); return; }
    if (running) { setNotice(t.work.rewindWhileWorking); return; }
    const result = await engine.restore(id);
    if (!result.ok) { setNotice(result.message); return; }
    // We're back before that point: it and everything after it are replaced by one
    // "before going back" point, which brings the newer work back if needed.
    const undo = result.checkpoint;
    setCheckpoints((prev) => [...prev.slice(0, prev.findIndex((c) => c.id === id)), ...(undo ? [undo] : [])]);
    setNotice(t.work.rewindDone);
  };

  // Requests typed while the agent works wait here, and start one by one when it's done.
  useEffect(() => {
    if (running || queue.length === 0) return;
    const last = items[items.length - 1];
    const finishedWell = !!last && (last.kind === "suggestions" || (last.kind === "activity" && last.id.startsWith("done-")));
    if (!finishedWell) return; // after an error or a stop, the queue waits for the person
    const [next, ...rest] = queue;
    setQueue(rest);
    startRun(next!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, queue, items]);

  const lastRequest = [...items].reverse().find((i): i is Extract<Item, { kind: "user" }> => i.kind === "user")?.text;

  // Rough progress for the current request, from its plan: done steps count fully, the active one half.
  const plan = running ? items.find((i): i is Extract<Item, { kind: "plan" }> => i.kind === "plan" && i.id === `plan-${counter.current}`)?.plan : undefined;
  const steps = plan?.steps ?? [];
  const doneCount = steps.filter((st) => st.status === "done").length;
  const active = steps.find((st) => st.status === "active");
  // The bar moves with what the model writes (thinking, answers, files): each step fills toward
  // its end and slows down near it, since nobody knows in advance how long the output will be.
  const creep = (scale: number) => 1 - Math.exp(-writtenShown / scale);
  const fraction = !running ? null : steps.length
    ? Math.min(0.97, (doneCount + 0.92 * creep(1500)) / steps.length)
    : 0.6 * creep(3000);
  const stepNumber = Math.min(steps.length, doneCount + 1);
  const waiting = items.some((i) => (i.kind === "question" && i.answer === undefined) || (i.kind === "permission" && i.answer === undefined));
  const progressLabel = !running ? "" : waiting ? t.work.progressWaiting : steps.length
    ? t.work.progressStep.replace("{n}", String(stepNumber)).replace("{total}", String(steps.length)) + (active ? `: ${active.label}` : "")
    : t.work.progressStarting;
  const progressKey = running ? `${fraction ?? "x"}|${progressLabel}` : "";
  useEffect(() => {
    // The same progress under the app's taskbar icon.
    bridge.window?.setProgress(running ? { value: fraction ?? undefined, label: progressLabel } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey]);
  useEffect(() => () => { bridge.window?.setProgress(null); }, []);
  // A new step starts its own fill; the written count is sampled a few times a second.
  useEffect(() => { written.current = 0; setWrittenShown(0); }, [doneCount, counter.current]);
  useEffect(() => {
    if (!running) { setThinking(""); return; }
    const timer = setInterval(() => setWrittenShown(written.current), 300);
    return () => clearInterval(timer);
  }, [running]);
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
                    {(() => {
                      // "Undo from here": files back to how they were before this request (Rewind keeps a way back).
                      const n = Number(item.id.slice(5));
                      const point = pointOfRun.current.get(n);
                      return point && !running && checkpoints.some((c) => c.id === point) ? (
                        <button type="button" className={s.undoFromHere} onClick={() => restoreTo(point)} title={t.work.undoFromHereHint}>
                          <Icon name="rewind" size={12} />{t.work.undoFromHere}
                        </button>
                      ) : null;
                    })()}
                    {item.text && <Message role="user"><p dir="auto"><BidiText text={item.text} /></p></Message>}
                    {item.pointed && <span className={s.pointedSent} dir="auto"><Icon name="search" size={12} />{item.pointed}</span>}
                    {item.attachments?.length ? (
                      <ul className={s.sentFiles} aria-label={t.attachedFiles}>
                        {item.attachments.map((name) => (
                          /\.(png|jpe?g|gif|webp)$/i.test(name) && bridge.tasks
                            ? <SentPicture key={name} taskId={taskId} name={name} />
                            : <li key={name}><Icon name="file" size={14} /><span dir="auto">{name}</span></li>
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
              case "activity": {
                const line = <ActivityLine key={item.id} t={t} text={item.text} details={item.details} />;
                if (!item.id.startsWith("done-")) return line;
                // After "Finished": what this request changed, and one-click Undo for the latest one.
                const n = Number(item.id.slice(5));
                const changes = items.flatMap((i) => (i.kind === "activity" && i.file && i.id.startsWith(`act-${n}-`) ? [i.file] : []));
                const point = pointOfRun.current.get(n);
                const canUndo = !!point && checkpoints.length > 0 && checkpoints[checkpoints.length - 1]!.id === point && !running;
                return (
                  <div key={item.id} className={s.doneBlock}>
                    {line}
                    {changes.length > 0 && (
                      <ChangesCard
                        t={t}
                        changes={changes}
                        onOpen={(path) => { setTab("files"); setFileToOpen({ path, n: Date.now() }); panel.onOpen(); }}
                        onUndo={canUndo ? () => restoreTo(point!) : undefined}
                      />
                    )}
                  </div>
                );
              }
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
                          {/* Careful requests only: risky ones always ask. */}
                          {ev.tool && bridge.agent && <Button variant="secondary" onClick={() => answer(item, true, true)}>{t.work.allowForTask}</Button>}
                          <Button variant="ghost" onClick={() => answer(item, false)}>{ev.denyLabel}</Button>
                        </>
                      ) : (
                        <span className={s.answered}>
                          <Icon name={item.answer ? "check" : "close"} size={14} />
                          {item.answer ? (item.remember ? t.work.allowedForTask : t.work.allowed) : t.work.notAllowed}
                        </span>
                      )
                    }
                  />
                );
              }
              case "question":
                return (
                  <QuestionCard
                    key={item.id}
                    t={t}
                    question={item.question}
                    options={item.options}
                    answer={item.answer}
                    disabled={!running}
                    onAnswer={(text) => {
                      setItems((prev) => prev.map((i) => (i.id === item.id && i.kind === "question" ? { ...i, answer: text } : i)));
                      runRef.current?.answer?.(item.requestId, text);
                    }}
                  />
                );
              case "suggestions":
                return (
                  <div key={item.id} className={s.nextSteps}>
                    <span className={s.nextLabel}>{t.work.whatNext}</span>
                    <div className={s.nextChips}>
                      {item.items.map((text) => (
                        <button key={text} type="button" className={s.nextChip} dir="auto" disabled={running} onClick={() => { setDraft(text); setFocusRequest((x) => x + 1); }}>
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              case "error":
                return (
                  <div key={item.id} className={s.errorBlock}>
                    <Message role="assistant">{item.message}</Message>
                    {item.suggestion && <p className={s.suggestion} dir="auto">{item.suggestion}</p>}
                    {item.details && <ErrorDetails t={t} details={item.details} />}
                    {/* The last request failed (no connection, a limit…): one click sends it again. */}
                    {index === items.length - 1 && !running && lastRequest && (
                      <div className={s.answerActions}>
                        <Button variant="secondary" size="sm" icon="repeat" onClick={() => startRun(lastRequest, undefined, true)}>{t.work.tryAgain}</Button>
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
          {status && thinking && (
            // The model's thinking as it happens: the last few lines, quiet, fading at the top.
            <div className={s.thinking} dir="auto" aria-live="off">{thinking.split("\n").filter(Boolean).slice(-4).join("\n")}</div>
          )}
        </div>

        <div className={s.footer}>
          {running && (
            <div className={s.progressRow}>
              <div className={s.progress} role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fraction === null ? undefined : Math.round(fraction * 100)}>
                <div className={s.progressTrack}>
                  <div className={fraction === null ? s.progressMoving : s.progressFill} style={fraction === null ? undefined : { width: `${Math.max(4, fraction * 100)}%` }} />
                </div>
                <span className={s.progressLabel} dir="auto">{progressLabel}</span>
              </div>
              <Button variant="secondary" size="sm" icon="close" onClick={() => runRef.current?.stop()}>{t.work.stop}</Button>
            </div>
          )}
          {!draft.trim() && <SmartActions t={t} files={files.files} onPick={(text) => { setDraft(text); setFocusRequest((x) => x + 1); }} />}
          {pointed && (
            <div className={s.queued}>
              <span className={s.pointChip}>
                <Icon name="search" size={14} />
                <span dir="auto">{t.work.pointingAt} {pointLabel}</span>
                <IconButton icon="close" size="sm" label={t.work.removeQueued} onClick={() => setPointed(null)} />
              </span>
            </div>
          )}
          {queue.length > 0 && (
            <div className={s.queued}>
              {queue.map((q, i) => (
                <span key={`${i}-${q}`} className={s.queuedChip}>
                  <span dir="auto">{t.work.queued}: {q}</span>
                  <IconButton icon="close" size="sm" label={`${t.work.removeQueued}: ${q}`} onClick={() => setQueue((list) => list.filter((_, j) => j !== i))} />
                </span>
              ))}
            </div>
          )}
          <Composer
            value={draft}
            onValueChange={setDraft}
            focusRequest={focusRequest}
            placeholder={running ? t.work.queuePlaceholder : t.work.followUpPlaceholder}
            inputLabel={t.work.followUpPlaceholder}
            sendLabel={t.send}
            attachLabel={t.attach}
            onSubmit={(text) => {
              if (running) { setQueue((q) => [...q, text]); return; } // waits its turn
              startRun(text, files.files, false, pointed ? { label: pointLabel, context: pointContext } : undefined);
              files.clear(); setPointed(null);
            }}
            onAttach={files.available ? files.choose : undefined}
            onDropFiles={files.available ? files.drop : undefined}
            onPasteImages={files.available ? files.paste : undefined}
            extra={<CheckToggle t={t} on={check} onChange={setCheck} disabled={running} />}
            attachments={files.chips}
            onRemoveAttachment={files.remove}
            removeLabel={t.removeAttachment}
          />
        </div>
      </section>

      {panel.open && panel.mode === "docked" && (
        <Splitter label={t.layout.resize} width={chatWidth} onChange={setChatWidth} containerRef={workRef} min={340} minAfter={320} initial={480} />
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
        <div key={tab} className={`${s.panelBody} ${s.tabBody}`}>
          {tab === "files" && bridge.tasks ? (
            <FilesPanel t={t} taskId={taskId} version={pageVersion} onNotice={setNotice} openRequest={fileToOpen} />
          ) : tab === "preview" || tab === "files" ? (
            page && bridge.tasks ? (
              <div className={s.preview}>
                <div className={s.previewBar}>
                  <span className={s.previewPage} dir="ltr">{page}</span>
                  <span className={s.previewActions}>
                    {!comparing && (
                      <Button variant={picking ? "secondary" : "ghost"} size="sm" icon="search" aria-pressed={picking} onClick={() => setPicking((p) => !p)} title={t.work.pointHint}>
                        <span className={s.btnLabel}>{picking ? t.work.pointCancel : t.work.point}</span>
                      </Button>
                    )}
                    {/* Before / after: compares with the newest Rewind point (just before the last change). */}
                    {checkpoints.length > 0 && (
                      <Button variant={comparing ? "secondary" : "ghost"} size="sm" icon="rewind" aria-pressed={comparing} onClick={() => setComparing((c) => !c)} title={t.work.compare}>
                        <span className={s.btnLabel}>{t.work.compare}</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" iconEnd="arrowRight" onClick={() => bridge.tasks?.openPreview({ taskId, page })} title={t.work.openInBrowser}><span className={s.btnLabel}>{t.work.openInBrowser}</span></Button>
                  </span>
                </div>
                {comparing && checkpoints.length > 0 ? (
                  <Compare
                    taskId={taskId}
                    page={page}
                    pointId={checkpoints[checkpoints.length - 1]!.id}
                    version={pageVersion}
                    labels={{ before: t.work.before, after: t.work.after, handle: t.work.compareHandle }}
                  />
                ) : (
                /* Sandboxed: the page can run its own scripts but can't reach the app. */
                <iframe
                  ref={frameRef}
                  key={`${pageVersion}-${picking}`}
                  className={[s.frame, picking ? s.framePicking : ""].filter(Boolean).join(" ")}
                  title={t.work.previewTitle}
                  src={`enceladus-preview://${taskId}/${page}${picking ? "?enceladus-pick=1" : ""}`}
                  sandbox="allow-scripts allow-forms allow-modals"
                />
                )}
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
              onRestore={restoreTo}
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
