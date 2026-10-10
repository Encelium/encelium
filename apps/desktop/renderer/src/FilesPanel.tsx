import { useEffect, useState } from "react";
import { Button, Icon } from "@enceladus/ui";
import { bridge, type FileView, type TaskFile } from "./bridge";
import type { Strings } from "./i18n";
import s from "./FilesPanel.module.css";

const IMAGE = /\.(png|jpe?g|gif|webp|svg|ico)$/i;

function sizeText(bytes: number, t: Strings) {
  if (bytes < 1024) return `${bytes} ${t.files.bytes}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** The task folder's files, and a read-only look inside one. Never runs anything. */
export function FilesPanel({ t, taskId, version }: { t: Strings; taskId: string; version: number }) {
  const tasks = bridge.tasks;
  const [files, setFiles] = useState<TaskFile[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<FileView | null>(null);

  useEffect(() => {
    if (!tasks) return;
    let live = true;
    tasks.listFiles({ taskId }).then((list) => { if (live) setFiles(list); });
    return () => { live = false; };
  }, [tasks, taskId, version]);

  useEffect(() => {
    if (!tasks || !open) { setView(null); return; }
    let live = true;
    tasks.readFile({ taskId, path: open }).then((v) => { if (live) setView(v); });
    return () => { live = false; };
  }, [tasks, taskId, open, version]);

  if (!tasks) return null;

  if (open) {
    return (
      <div className={s.viewer}>
        <div className={s.bar}>
          <Button variant="ghost" size="sm" icon="arrowRight" className={s.back} onClick={() => setOpen(null)}>{t.files.back}</Button>
          <span className={s.name} dir="ltr" title={open}>{open}</span>
          <Button variant="ghost" size="sm" icon="folder" onClick={() => tasks.showFile({ taskId, path: open })}>{t.files.showInFolder}</Button>
        </div>
        <div className={s.content}>
          {!view ? null
            : view.kind === "text" ? <pre className={s.code} dir="ltr">{view.text}</pre>
            : view.kind === "image" ? <img className={s.image} src={`enceladus-preview://${taskId}/${open.split("/").map(encodeURIComponent).join("/")}`} alt={open} />
            : <p className={s.message}>{view.kind === "missing" ? t.files.missing : view.kind === "large" ? t.files.tooLarge : t.files.binary}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={s.list}>
      <div className={s.bar}>
        <span className={s.count}>{files ? `${files.length} ${files.length === 1 ? t.files.file : t.files.filesWord}` : ""}</span>
        <Button variant="ghost" size="sm" icon="folder" onClick={() => tasks.openFolder({ taskId })}>{t.files.openFolder}</Button>
      </div>
      {files && files.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="folder" size={24} /></span>
          <p>{t.files.empty}</p>
        </div>
      ) : (
        <ul className={s.items}>
          {files?.map((f) => {
            const slash = f.path.lastIndexOf("/");
            return (
              <li key={f.path}>
                <button type="button" className={s.item} onClick={() => setOpen(f.path)}>
                  <Icon name={IMAGE.test(f.path) ? "image" : "file"} size={16} />
                  <span className={s.path} dir="ltr">
                    {slash > 0 && <span className={s.dir}>{f.path.slice(0, slash + 1)}</span>}
                    {f.path.slice(slash + 1)}
                  </span>
                  <span className={s.size}>{sizeText(f.size, t)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
