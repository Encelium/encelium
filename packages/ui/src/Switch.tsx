import type { ButtonHTMLAttributes } from "react";
import s from "./Switch.module.css";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "children"> {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ label, checked, onChange, disabled, className, type = "button", ...rest }: SwitchProps) {
  return (
    <button
      {...rest}
      type={type}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={[s.switch, className].filter(Boolean).join(" ")}
      onClick={() => onChange(!checked)}
    >
      <span className={s.label}>{label}</span>
      <span className={s.track} aria-hidden="true">
        <span className={s.thumb} />
      </span>
    </button>
  );
}
