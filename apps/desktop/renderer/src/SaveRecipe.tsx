import { useEffect, useState } from "react";
import { Button, Dialog, TextField } from "@encelium/ui";
import { bridge } from "./bridge";
import type { Strings } from "./i18n";
import s from "./Recipes.module.css";

/** "Save as recipe": the chat's first request becomes a reusable recipe (name and text editable). */
export function SaveRecipeDialog({ t, task, onClose, onSaved }: {
  t: Strings;
  task: { id: string; title: string } | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task || !bridge.tasks) return;
    setTitle(task.title.replace(/…$/, ""));
    setPrompt("");
    bridge.tasks.events({ taskId: task.id }).then((events) => {
      const first = events.find((e) => e.type === "user");
      if (first && "text" in first) setPrompt(first.text);
    });
  }, [task]);

  const save = async () => {
    if (!bridge.recipes || !title.trim() || !prompt.trim()) return;
    setSaving(true);
    const saved = await bridge.recipes.save({ title, prompt });
    setSaving(false);
    if (saved) { onSaved(t.recipes.savedMine); onClose(); }
  };

  return (
    <Dialog
      open={!!task}
      onClose={onClose}
      title={t.recipes.saveTitle}
      size="lg"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={saving || !title.trim() || !prompt.trim()}>{t.recipes.save}</Button>
        </>
      }
    >
      <div className={s.form}>
        <p className={s.intro}>{t.recipes.saveIntro}</p>
        <TextField label={t.recipes.name} value={title} dir="auto" maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <label className={s.longField}>
          <span className={s.label}>{t.recipes.request}</span>
          <textarea rows={6} dir="auto" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
      </div>
    </Dialog>
  );
}
