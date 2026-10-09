import { useId, type InputHTMLAttributes } from "react";
import { Icon } from "./icons";
import s from "./TextField.module.css";

export type TextFieldSize = "md" | "lg";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  hint?: string;
  /** When set, the field shows the error state and this message. */
  error?: string;
  size?: TextFieldSize;
}

export function TextField({ label, hint, error, size = "md", id, className, disabled, ...rest }: TextFieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return (
    <div className={[s.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={inputId} className={s.label}>{label}</label>
      <input
        {...rest}
        id={inputId}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[s.input, s[size], error ? s.invalid : ""].filter(Boolean).join(" ")}
      />
      {hint && <p id={hintId} className={s.hint}>{hint}</p>}
      {error && (
        <p id={errorId} className={s.error}>
          <Icon name="alert" size={14} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
