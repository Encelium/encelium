import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "./icons";
import { IconButton } from "./Button";
import s from "./Composer.module.css";

export interface ComposerFolder {
  /** e.g. "Working in" */
  label: string;
  /** Short folder name, e.g. "SweetCrumb" */
  name: string;
  /** Full path. Always shown left-to-right. */
  path: string;
}

export interface ComposerProps {
  placeholder: string;
  sendLabel: string;
  attachLabel: string;
  /** Names the text box for screen readers. Defaults to the placeholder. */
  inputLabel?: string;
  folder?: ComposerFolder;
  /** Controlled value. Leave out to let the composer keep its own text. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text on Enter or Send. */
  onSubmit: (text: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Composer({
  placeholder, sendLabel, attachLabel, inputLabel, folder, value, onValueChange, onSubmit, onAttach, disabled, className,
}: ComposerProps) {
  const [inner, setInner] = useState("");
  const text = value ?? inner;
  const ref = useRef<HTMLTextAreaElement>(null);
  const empty = text.trim().length === 0;

  // Grow with the text. The CSS max-height caps it at 8 rows, then it scrolls.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const setText = (next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const submit = () => {
    if (empty || disabled) return;
    onSubmit(text.trim());
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className={[s.composer, disabled ? s.disabled : "", className].filter(Boolean).join(" ")}>
      <textarea
        ref={ref}
        rows={1}
        // Empty: follow the app's direction so the placeholder reads correctly.
        // Typed text: detect it, so Arabic flows right-to-left even in the English UI.
        dir={text ? "auto" : undefined}
        className={s.input}
        value={text}
        placeholder={placeholder}
        aria-label={inputLabel ?? placeholder}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={s.bar}>
        <IconButton icon="paperclip" label={attachLabel} onClick={onAttach} disabled={disabled} />
        {folder && (
          <span className={s.folder}>
            <Icon name="folder" size={14} />
            <span className={s.folderLabel}>{folder.label}</span>
            <span className={s.folderName}>{folder.name}</span>
            <span className={s.folderPath} dir="ltr" title={folder.path}>{folder.path}</span>
          </span>
        )}
        <IconButton
          icon="arrowUp"
          label={sendLabel}
          variant="accent"
          className={s.send}
          disabled={disabled || empty}
          onClick={submit}
        />
      </div>
    </div>
  );
}
