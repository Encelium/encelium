import { useState } from "react";
import { Composer, Icon, type IconName } from "@enceladus/ui";
import type { Strings } from "./i18n";
import { bridge, type Attachment } from "./bridge";
import { useAttachments } from "./useAttachments";
import { MoonHero } from "./hero/MoonHero";
import s from "./Home.module.css";

const starterIcons: Record<keyof Strings["starters"], IconName> = {
  website: "browser",
  files: "folderSort",
  automate: "repeat",
  fix: "wrench",
};

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
}

export function Home({ t, onSubmit, onNotice, theme }: HomeProps) {
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

        <div className={s.starters}>
          {(Object.keys(starterIcons) as (keyof Strings["starters"])[]).map((key) => {
            const card = t.starters[key];
            return (
              <button key={key} type="button" className={s.card} onClick={() => { setDraft(card.prompt); setFocusRequest((n) => n + 1); }}>
                <span className={s.cardIcon}><Icon name={starterIcons[key]} size={20} /></span>
                <span className={s.cardTitle}>{card.title}</span>
                <span className={s.cardBody}>{card.body}</span>
              </button>
            );
          })}
        </div>

        <p className={s.privacy}>
          <Icon name="lock" size={14} />
          {t.privacy}
        </p>
      </div>
    </main>
  );
}
