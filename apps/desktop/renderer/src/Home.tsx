import { useState } from "react";
import { Composer, Icon } from "@enceladus/ui";
import type { Strings } from "./i18n";
import { bridge, type Attachment } from "./bridge";
import { useAttachments } from "./useAttachments";
import { MoonHero } from "./hero/MoonHero";
import { CheckToggle, useCheckResult } from "./CheckToggle";
import { RecipeCard, RecipesDialog } from "./Recipes";
import { RECIPES, type Recipe } from "./recipeList";
import type { Language } from "./bridge";
import s from "./Home.module.css";

function greeting(t: Strings) {
  const h = new Date().getHours();
  return h < 12 ? t.greeting.morning : h < 18 ? t.greeting.afternoon : t.greeting.evening;
}

interface HomeProps {
  t: Strings;
  /** `folder` is set when the person chose one; otherwise a new folder is made. */
  onSubmit: (text: string, folder?: string, attachments?: Attachment[]) => void;
  onNotice: (message: string) => void;
  theme: "light" | "dark";
  language: Language;
}

export function Home({ t, onSubmit, onNotice, theme, language }: HomeProps) {
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [check, setCheck] = useCheckResult();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [draft, setDraft] = useState("");
  const files = useAttachments(t, onNotice);
  const [focusRequest, setFocusRequest] = useState(0);
  const [folder, setFolder] = useState<{ path: string; name: string } | null>(null);

  const chooseFolder = async () => {
    if (!bridge.tasks) return;
    const result = await bridge.tasks.chooseFolder();
    if (result.ok) setFolder({ path: result.path, name: result.name });
    else if (result.reason === "too-broad") onNotice(t.folderTooBroad);
  };

  return (
    <main className={s.main}>
      <div className={s.column}>
        <div className={s.hero}>
          <div className={s.titles}>
            <p className={s.greeting}>{greeting(t)}</p>
            <h1 className={s.heading}>{t.heading}</h1>
          </div>
          {/* Vapor rises while the person types. */}
          <MoonHero className={s.moon} theme={theme} active={draft.trim().length > 0} />
        </div>

        <Composer
          className={s.composer}
          placeholder={t.composerPlaceholder}
          inputLabel={t.heading}
          sendLabel={t.send}
          attachLabel={t.attach}
          value={draft}
          onValueChange={setDraft}
          focusRequest={focusRequest}
          onSubmit={(text) => { onSubmit(text, folder?.path, files.files); files.clear(); }}
          onAttach={files.available ? files.choose : undefined}
          onDropFiles={files.available ? files.drop : undefined}
          onPasteImages={files.available ? files.paste : undefined}
          extra={<CheckToggle t={t} on={check} onChange={setCheck} />}
          attachments={files.chips}
          onRemoveAttachment={files.remove}
          removeLabel={t.removeAttachment}
          folder={bridge.tasks ? {
            label: t.workingIn,
            name: folder?.name ?? t.newFolder,
            path: folder?.path ?? t.newFolderPath,
            onClick: chooseFolder,
            actionLabel: t.chooseFolder,
          } : undefined}
        />

        <section className={s.recipes} aria-labelledby="recipes-heading">
          <div className={s.recipesHead}>
            <h2 id="recipes-heading" className={s.recipesTitle}>{t.recipes.homeTitle}</h2>
            <button type="button" className={s.allRecipes} onClick={() => { setRecipe(null); setRecipesOpen(true); }}>
              {t.recipes.all}<Icon name="arrowRight" size={14} />
            </button>
          </div>
          <div className={s.recipeGrid}>
            {RECIPES.filter((r) => r.featured).map((r) => (
              <RecipeCard key={r.id} recipe={r} language={language} onClick={() => { setRecipe(r); setRecipesOpen(true); }} />
            ))}
          </div>
        </section>
        <RecipesDialog
          t={t}
          language={language}
          open={recipesOpen}
          initial={recipe}
          onClose={() => setRecipesOpen(false)}
          onStart={(prompt, recipeFolder) => onSubmit(prompt, recipeFolder ?? folder?.path)}
          onNotice={onNotice}
        />

        <p className={s.privacy}>
          <Icon name="lock" size={14} />
          {t.privacy}
        </p>
      </div>
    </main>
  );
}
