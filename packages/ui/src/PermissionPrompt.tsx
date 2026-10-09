import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Tag } from "./Tag";
import s from "./PermissionPrompt.module.css";

export type PermissionLevel = "safe" | "careful" | "risky";

const defaultIcon: Record<PermissionLevel, IconName> = { safe: "shield", careful: "download", risky: "trash" };

export interface PermissionPromptProps {
  level: PermissionLevel;
  /** The word shown next to the icon, e.g. "Careful". Required so color is never alone. */
  levelLabel: string;
  title: string;
  description: string;
  detailsLink?: { label: string; onClick: () => void };
  /** Buttons, e.g. "Install it" and "Not now". */
  actions: ReactNode;
  icon?: IconName;
  className?: string;
}

export function PermissionPrompt({ level, levelLabel, title, description, detailsLink, actions, icon, className }: PermissionPromptProps) {
  const titleId = useId();
  return (
    <section className={[s.prompt, s[level], className].filter(Boolean).join(" ")} aria-labelledby={titleId}>
      <span className={s.icon} aria-hidden="true">
        <Icon name={icon ?? defaultIcon[level]} size={20} />
      </span>
      <div className={s.body}>
        <div className={s.head}>
          <Tag tone={level} dot>{levelLabel}</Tag>
        </div>
        <h3 id={titleId} className={s.title} dir="auto">{title}</h3>
        <p className={s.description} dir="auto">{description}</p>
        {detailsLink && (
          <button type="button" className={s.link} onClick={detailsLink.onClick}>{detailsLink.label}</button>
        )}
        <div className={s.actions}>{actions}</div>
      </div>
    </section>
  );
}
