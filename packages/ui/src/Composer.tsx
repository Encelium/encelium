import { useLayoutEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
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
  /** Makes the chip a button (e.g. "choose another folder"). */
  onClick?: () => void;
  /** Screen-reader name for the button, e.g. "Choose a folder". */
  actionLabel?: string;
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
  /** Change this number to move the cursor into the box, at the end of the text
   *  (e.g. after a starter card fills it in). */
  focusRequest?: number;
  /** Files waiting to be sent with the next message. */
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
  /** e.g. "Remove" — combined with the file name for screen readers. */
  removeLabel?: string;
  /** Files dropped onto the composer. Leave out to disable dropping. */
  onDropFiles?: (files: FileList) => void;
  /** Pictures pasted with Ctrl+V. Pasted text still goes into the box as usual. */
  onPasteImages?: (files: File[]) => void;
  className?: string;
}

export interface ComposerAttachment { id: string; name: string; kind: "image" | "file" }

export function Composer({
  placeholder, sendLabel, attachLabel, inputLabel, folder, value, onValueChange, onSubmit, onAttach, disabled, focusRequest,
  attachments = [], onRemoveAttachment, removeLabel = "Remove", onDropFiles, onPasteImages, className,
}: ComposerProps) {
  const [inner, setInner] = useState("");
  const [dragging, setDragging] = useState(false);
  const text = value ?? inner;
  const ref = useRef<HTMLTextAreaElement>(null);
  // Attachments alone are enough to send (e.g. "here's a screenshot").
  const empty = text.trim().length === 0 && attachments.length === 0;

  // Grow with the text. The CSS max-height caps it at 8 rows, then it scrolls.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!focusRequest || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [focusRequest]);

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

  const dropProps = onDropFiles && !disabled ? {
    onDragOver: (e: DragEvent<HTMLDivElement>) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } },
    onDragLeave: (e: DragEvent<HTMLDivElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); },
    onDrop: (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) onDropFiles(e.dataTransfer.files); },
  } : {};

  return (
    <div className={[s.composer, disabled ? s.disabled : "", dragging ? s.dragging : "", className].filter(Boolean).join(" ")} {...dropProps}>
      {attachments.length > 0 && (
        <ul className={s.attachments}>
          {attachments.map((a) => (
            <li key={a.id} className={s.attachment}>
              <Icon name={a.kind === "image" ? "image" : "file"} size={14} />
              <span className={s.attachmentName} dir="auto" title={a.name}>{a.name}</span>
              {onRemoveAttachment && (
                <button type="button" className={s.removeAttachment} aria-label={`${removeLabel}: ${a.name}`} onClick={() => onRemoveAttachment(a.id)} disabled={disabled}>
                  <Icon name="close" size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
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
        onPaste={onPasteImages && ((e) => {
          const images = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
          if (!images.length) return;
          e.preventDefault();
          onPasteImages(images);
        })}
      />
      <div className={s.bar}>
        <IconButton icon="paperclip" label={attachLabel} onClick={onAttach} disabled={disabled} />
        {folder && (() => {
          const content = (
            <>
              <Icon name="folder" size={14} />
              <span className={s.folderLabel}>{folder.label}</span>
              <span className={s.folderName} dir="auto">{folder.name}</span>
              <span className={s.folderPath} dir="ltr" title={folder.path}>{folder.path}</span>
            </>
          );
          return folder.onClick ? (
            <button type="button" className={[s.folder, s.folderButton].join(" ")} onClick={folder.onClick} disabled={disabled}
              aria-label={folder.actionLabel ? `${folder.actionLabel}: ${folder.name}` : undefined} title={folder.actionLabel}>
              {content}
            </button>
          ) : <span className={s.folder}>{content}</span>;
        })()}
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
