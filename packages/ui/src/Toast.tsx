import { Icon, type IconName } from "./icons";
import { IconButton } from "./Button";
import s from "./Toast.module.css";

export type ToastTone = "neutral" | "safe" | "careful" | "risky";

const toneIcon: Record<ToastTone, IconName> = { neutral: "info", safe: "check", careful: "alert", risky: "alert" };

export interface ToastProps {
  tone?: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
  /** Name for the close button, e.g. "Close". */
  dismissLabel: string;
  className?: string;
}

export function Toast({ tone = "neutral", message, action, onDismiss, dismissLabel, className }: ToastProps) {
  return (
    <div role="status" aria-live="polite" className={[s.toast, s[tone], className].filter(Boolean).join(" ")}>
      <span className={s.icon}><Icon name={toneIcon[tone]} size={18} /></span>
      <span className={s.message} dir="auto">{message}</span>
      {action && <button type="button" className={s.action} onClick={action.onClick}>{action.label}</button>}
      <IconButton icon="close" label={dismissLabel} size="sm" onClick={onDismiss} />
    </div>
  );
}
