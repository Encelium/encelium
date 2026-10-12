import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, Icon, type IconName } from "@enceladus/ui";
import { bridge, type StatusInfo } from "./bridge";
import type { Strings } from "./i18n";
import s from "./StatusBar.module.css";

const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
function duration(ms: number, t: Strings) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} ${t.status.sec}`;
  const min = Math.round(sec / 60);
  return min < 60 ? `${min} ${t.status.min}` : `${Math.floor(min / 60)} ${t.status.hr} ${min % 60} ${t.status.min}`;
}

/** One status item: plain text, or a small button when there's something to do with it. */
function Item({ icon, title, onClick, tone, children }: { icon?: IconName; title: string; onClick?: () => void; tone?: "warn"; children: React.ReactNode }) {
  const content = <>{icon && <Icon name={icon} size={13} />}{children}</>;
  const cls = [s.item, onClick ? s.button : "", tone === "warn" ? s.warn : ""].filter(Boolean).join(" ");
  return onClick
    ? <button type="button" className={cls} title={title} onClick={onClick}>{content}</button>
    : <span className={cls} title={title}>{content}</span>;
}

/** A slim bar under a task: model, folder, Git, tokens, time waiting for the model, time worked, memory. */
export function StatusBar({ t, taskId, onOpenModel, onNotice }: { t: Strings; taskId: string; onOpenModel: () => void; onNotice: (message: string) => void }) {
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [confirm, setConfirm] = useState<"start" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => bridge.status?.({ taskId }).then(setInfo), [taskId]);
  useEffect(() => {
    if (!bridge.status) return;
    let live = true;
    const refresh = () => bridge.status?.({ taskId }).then((i) => { if (live) setInfo(i); });
    refresh();
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 2000);
    return () => { live = false; clearInterval(timer); };
  }, [taskId]);

  const runGit = async () => {
    if (!bridge.git || !confirm) return;
    setBusy(true);
    const stamp = new Date().toLocaleString();
    const result = confirm === "start"
      ? await bridge.git.start({ taskId, message: t.status.firstVersion })
      : await bridge.git.save({ taskId, message: `${t.status.savedVersion} (${stamp})` });
    setBusy(false);
    setConfirm(null);
    onNotice(result.ok ? (confirm === "start" ? t.status.started : t.status.saved) : result.reason === "not-installed" ? t.status.gitMissing : t.status.gitFailed);
    load();
  };

  if (!info) return null;
  const st = info.stats;
  const tokens = st ? st.tokensIn + st.tokensOut : 0;
  const git = info.git;
  const heavy = info.ramMB >= 1200; // well above what the app normally needs

  return (
    <footer className={s.bar} aria-label={t.status.label}>
      <Item icon="plug" title={t.status.modelHint} onClick={onOpenModel}><span dir="ltr">{info.model}</span></Item>
      <Item icon="folder" title={t.status.folderHint} onClick={() => bridge.tasks?.openFolder({ taskId })}>{t.status.folder}</Item>
      {git && !git.installed && <Item icon="repeat" title={t.status.gitMissingHint}><span className={s.dim}>{t.status.noGit}</span></Item>}
      {git?.installed && !git.branch && <Item icon="repeat" title={t.status.startHint} onClick={() => setConfirm("start")}>{t.status.start}</Item>}
      {git?.installed && git.branch && (
        <Item icon="repeat" title={git.changes ? t.status.saveHint : t.status.cleanHint} onClick={git.changes ? () => setConfirm("save") : undefined}>
          <span dir="ltr">{git.branch}</span>
          <span className={s.dim}>· {git.changes ? `${git.changes} ${t.status.unsaved}` : t.status.allSaved}</span>
        </Item>
      )}
      {st && (
        <Item icon="file" title={st.estimated ? t.status.tokensEstimatedHint : t.status.tokensHint}>
          {st.estimated ? "~" : ""}{compact(tokens)} {t.status.tokens}
          <span className={s.dim}>({compact(st.tokensIn)} {t.status.in} · {compact(st.tokensOut)} {t.status.out})</span>
        </Item>
      )}
      {st && <Item icon="info" title={t.status.waitHint}>{t.status.wait} {duration(st.apiMs, t)}</Item>}
      {st && <Item icon="check" title={t.status.workHint}>{t.status.worked} {duration(st.workMs, t)}</Item>}
      <span className={s.spacer} />
      <Item title={heavy ? t.status.ramHighHint : t.status.ramHint} tone={heavy ? "warn" : undefined}>{t.status.memory} {info.ramMB} MB</Item>
      {info.running && <span className={s.live} aria-label={t.status.working} />}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "start" ? t.status.startTitle : t.status.saveTitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>{t.cancel}</Button>
            <Button variant="primary" onClick={runGit} disabled={busy}>{confirm === "start" ? t.status.start : t.status.save}</Button>
          </>
        }
      >
        <p className="app-dialog-text">{confirm === "start" ? t.status.startBody : t.status.saveBody}</p>
      </Dialog>
    </footer>
  );
}
