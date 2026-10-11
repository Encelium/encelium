import { useEffect, useState } from "react";
import { Icon } from "@enceladus/ui";
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

/** A slim bar under a task: model, Git, tokens, time waiting for the model, time worked, memory. */
export function StatusBar({ t, taskId }: { t: Strings; taskId: string }) {
  const [info, setInfo] = useState<StatusInfo | null>(null);

  useEffect(() => {
    if (!bridge.status) return;
    let live = true;
    const load = () => bridge.status?.({ taskId }).then((i) => { if (live) setInfo(i); });
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 2000);
    return () => { live = false; clearInterval(timer); };
  }, [taskId]);

  if (!info) return null;
  const st = info.stats;
  const tokens = st ? st.tokensIn + st.tokensOut : 0;
  return (
    <footer className={s.bar} aria-label={t.status.label}>
      <span className={s.item} title={t.status.modelHint}><Icon name="plug" size={13} /><span dir="ltr">{info.model}</span></span>
      <span className={s.item} title={info.git ? t.status.gitHint : t.status.noGitHint}>
        <Icon name="repeat" size={13} />
        {info.git ? <><span dir="ltr">{info.git.branch}</span>{info.git.changes > 0 && <span className={s.dim}>· {info.git.changes} {t.status.changes}</span>}</> : <span className={s.dim}>{t.status.noGit}</span>}
      </span>
      {st && (
        <span className={s.item} title={st.estimated ? t.status.tokensEstimatedHint : t.status.tokensHint}>
          <Icon name="file" size={13} />
          {st.estimated ? "~" : ""}{compact(tokens)} {t.status.tokens}
          <span className={s.dim}>({compact(st.tokensIn)} {t.status.in} · {compact(st.tokensOut)} {t.status.out})</span>
        </span>
      )}
      {st && <span className={s.item} title={t.status.waitHint}><Icon name="info" size={13} />{t.status.wait} {duration(st.apiMs, t)}</span>}
      {st && <span className={s.item} title={t.status.workHint}><Icon name="check" size={13} />{t.status.worked} {duration(st.workMs, t)}</span>}
      <span className={s.spacer} />
      <span className={s.item} title={t.status.ramHint}>{info.ramMB} MB</span>
      {info.running && <span className={s.live} aria-label={t.status.working} />}
    </footer>
  );
}
