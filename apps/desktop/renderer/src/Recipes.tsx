import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Icon, Segmented, TextField } from "@enceladus/ui";
import { bridge, type Language } from "./bridge";
import type { Strings } from "./i18n";
import { RECIPES, recipeText, type Recipe, type RecipeCategory } from "./recipeList";
import s from "./Recipes.module.css";

/** A small recipe card: icon, name, one line. */
export function RecipeCard({ recipe, language, onClick }: { recipe: Recipe; language: Language; onClick: () => void }) {
  const r = recipeText(recipe, language);
  return (
    <button type="button" className={s.card} onClick={onClick}>
      <span className={s.cardIcon}><Icon name={recipe.icon} size={18} /></span>
      <span className={s.cardText}>
        <span className={s.cardTitle}>{r.title}</span>
        <span className={s.cardHint}>{r.hint}</span>
      </span>
    </button>
  );
}

interface RecipesDialogProps {
  t: Strings;
  language: Language;
  open: boolean;
  /** Open straight on one recipe's form (from a card on the home screen). */
  initial?: Recipe | null;
  onClose: () => void;
  onStart: (prompt: string, folder?: string) => void;
  onNotice: (message: string) => void;
}

/** All recipes by category, and the short form that turns one into a request. */
export function RecipesDialog({ t, language, open, initial, onClose, onStart, onNotice }: RecipesDialogProps) {
  const [picked, setPicked] = useState<Recipe | null>(null);
  const [category, setCategory] = useState<"all" | RecipeCategory>("all");

  useEffect(() => { if (open) { setPicked(initial ?? null); setCategory("all"); } }, [open, initial]);

  const shown = category === "all" ? RECIPES : RECIPES.filter((r) => r.category === category);
  const title = picked ? recipeText(picked, language).title : t.recipes.title;

  return (
    <Dialog open={open} onClose={onClose} title={title} size="lg">
      {picked ? (
        <RecipeForm
          key={picked.id}
          t={t}
          recipe={picked}
          language={language}
          onBack={initial ? undefined : () => setPicked(null)}
          onStart={(prompt, folder) => { onClose(); onStart(prompt, folder); }}
          onNotice={onNotice}
        />
      ) : (
        <div className={s.gallery}>
          <p className={s.intro}>{t.recipes.intro}</p>
          <Segmented<"all" | RecipeCategory>
            ariaLabel={t.recipes.title}
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: t.recipes.all },
              { value: "web", label: t.recipes.categories.web },
              { value: "files", label: t.recipes.categories.files },
              { value: "tools", label: t.recipes.categories.tools },
              { value: "help", label: t.recipes.categories.help },
            ]}
          />
          <div className={s.grid} key={category}>
            {shown.map((r) => <RecipeCard key={r.id} recipe={r} language={language} onClick={() => setPicked(r)} />)}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function RecipeForm({ t, recipe, language, onBack, onStart, onNotice }: {
  t: Strings;
  recipe: Recipe;
  language: Language;
  onBack?: () => void;
  onStart: (prompt: string, folder?: string) => void;
  onNotice: (message: string) => void;
}) {
  const r = recipeText(recipe, language);
  const [values, setValues] = useState<Record<string, string>>({});
  const [folder, setFolder] = useState<{ path: string; name: string } | null>(null);
  const [showRequest, setShowRequest] = useState(false);

  const missing = r.fields.some((f) => !f.optional && !values[f.key]?.trim()) || (recipe.folder === "required" && !folder);
  const prompt = useMemo(() => r.prompt(Object.fromEntries(r.fields.map((f) => [f.key, values[f.key]?.trim() || (f.optional ? "" : f.placeholder)]))), [r, values]);

  const chooseFolder = async () => {
    if (!bridge.tasks) return;
    const result = await bridge.tasks.chooseFolder();
    if (result.ok) setFolder({ path: result.path, name: result.name });
    else if (result.reason === "too-broad") onNotice(t.folderTooBroad);
  };

  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); if (!missing) onStart(prompt, folder?.path); }}>
      {onBack && (
        <button type="button" className={s.back} onClick={onBack}>
          <Icon name="arrowRight" size={16} />{t.recipes.back}
        </button>
      )}
      <p className={s.intro}>{r.hint}</p>

      {recipe.folder && (
        <div className={s.folder}>
          <span className={s.label}>{recipe.folder === "required" ? t.recipes.folder : t.recipes.folderOptional}</span>
          <button type="button" className={s.folderButton} onClick={chooseFolder}>
            <Icon name="folder" size={16} />
            <span className={s.folderName} dir="auto">{folder ? folder.name : t.recipes.chooseFolder}</span>
            {folder && <span className={s.folderPath} dir="ltr">{folder.path}</span>}
          </button>
        </div>
      )}

      {r.fields.map((f, i) => f.long ? (
        <label key={f.key} className={s.longField}>
          <span className={s.label}>{f.label}{f.optional && <span className={s.optional}> · {t.recipes.optional}</span>}</span>
          <textarea
            rows={3}
            dir="auto"
            value={values[f.key] ?? ""}
            placeholder={f.placeholder}
            autoFocus={i === 0 && !recipe.folder}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </label>
      ) : (
        <TextField
          key={f.key}
          label={f.optional ? `${f.label} · ${t.recipes.optional}` : f.label}
          value={values[f.key] ?? ""}
          placeholder={f.placeholder}
          dir="auto"
          autoFocus={i === 0 && !recipe.folder}
          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
        />
      ))}

      <div className={s.request}>
        <button type="button" className={s.requestToggle} aria-expanded={showRequest} onClick={() => setShowRequest((o) => !o)}>
          {showRequest ? t.recipes.hideRequest : t.recipes.showRequest}
        </button>
        {showRequest && <p className={s.requestText} dir="auto">{prompt}</p>}
      </div>

      <div className={s.actions}>
        <Button type="submit" variant="primary" size="lg" disabled={missing}>{t.recipes.start}</Button>
      </div>
    </form>
  );
}
