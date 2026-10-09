import type { ReactNode } from "react";
import s from "./Tag.module.css";

export type TagTone = "neutral" | "accent" | "safe" | "careful" | "risky";

export function Tag({ tone = "neutral", dot = false, children }: { tone?: TagTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={[s.tag, s[tone]].join(" ")}>
      {dot && <span className={s.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
