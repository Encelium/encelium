import { useId } from "react";
import { Button } from "./Button";
import s from "./RewindTimeline.module.css";

export interface RewindItem {
  id: string;
  label: string;
  time: string;
  current?: boolean;
}

export interface RewindTimelineProps {
  items: RewindItem[];
  onRestore: (id: string) => void;
  /** e.g. "Restore here" */
  restoreLabel: string;
  className?: string;
}

export function RewindTimeline({ items, onRestore, restoreLabel, className }: RewindTimelineProps) {
  const uid = useId();
  return (
    <ol className={[s.timeline, className].filter(Boolean).join(" ")}>
      {items.map((item) => {
        const labelId = `${uid}-${item.id}`;
        return (
          <li key={item.id} className={[s.item, item.current ? s.current : ""].filter(Boolean).join(" ")} aria-current={item.current ? "step" : undefined}>
            <span className={s.dot} aria-hidden="true" />
            <div className={s.text}>
              <span id={labelId} className={s.label} dir="auto">{item.label}</span>
              <span className={s.time}>{item.time}</span>
            </div>
            {!item.current && (
              <Button variant="primary" size="sm" className={s.restore} aria-describedby={labelId} onClick={() => onRestore(item.id)}>
                {restoreLabel}
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
