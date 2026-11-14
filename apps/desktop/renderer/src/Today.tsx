import { useEffect, useState } from "react";
import { Icon } from "@encelium/ui";
import { bridge } from "./bridge";
import type { Strings } from "./i18n";
import s from "./Today.module.css";

type Day = Awaited<ReturnType<NonNullable<typeof bridge.tasks>["today"]>>;

/** What the agent did today, across chats. Hidden on a day with nothing yet. */
export function Today({ t, onOpenTask }: { t: Strings; onOpenTask: (id: string) => void }) {
  const [day, setDay] = useState<Day>([]);
  useEffect(() => { bridge.tasks?.today().then(setDay); }, []);
  if (!day.length) return null;
  const requests = day.reduce((n, d) => n + d.requests, 0);
  const files = day.reduce((n, d) => n + d.files, 0);
  return (
    <section className={s.today} aria-labelledby="today-heading">
      <div className={s.head}>
        <h2 id="today-heading" className={s.title}>{t.today.title}</h2>
        <span className={s.sum}>{t.today.sum.replace("{chats}", String(day.length)).replace("{requests}", String(requests)).replace("{files}", String(files))}</span>
      </div>
      <ul className={s.list}>
        {day.map((d) => (
          <li key={d.id}>
            <button type="button" className={s.row} onClick={() => onOpenTask(d.id)}>
              <span className={s.name} dir="auto">{d.title}</span>
              <span className={s.meta}>
                {d.files > 0 && <><Icon name="file" size={12} />{d.files}</>}
                <Icon name="arrowUp" size={12} />{d.requests}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
