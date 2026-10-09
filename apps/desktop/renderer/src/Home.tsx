import { useState } from "react";
import { Composer, Icon, type IconName } from "@enceladus/ui";
import type { Strings } from "./i18n";
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

export function Home({ t, onSubmit }: { t: Strings; onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  return (
    <main className={s.main}>
      <div className={s.column}>
        <div className={s.titles}>
          <p className={s.greeting}>{greeting(t)}</p>
          <h1 className={s.heading}>{t.heading}</h1>
        </div>

        <Composer
          placeholder={t.composerPlaceholder}
          inputLabel={t.heading}
          sendLabel={t.send}
          attachLabel={t.attach}
          value={draft}
          onValueChange={setDraft}
          onSubmit={onSubmit}
        />

        <div className={s.starters}>
          {(Object.keys(starterIcons) as (keyof Strings["starters"])[]).map((key) => {
            const card = t.starters[key];
            return (
              <button key={key} type="button" className={s.card} onClick={() => setDraft(card.prompt)}>
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
