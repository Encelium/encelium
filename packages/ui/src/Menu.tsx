import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import s from "./Menu.module.css";

export interface MenuItem {
  label: string;
  icon?: IconName;
  /** Shown in red, e.g. Delete. */
  danger?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  /** Names the trigger button for screen readers, e.g. "More for: Bakery site". */
  label: string;
  items: MenuItem[];
  className?: string;
  /** Called when the menu opens or closes (e.g. to keep the row highlighted). */
  onOpenChange?: (open: boolean) => void;
}

/** A "⋯" button that opens a short list of actions. Arrow keys move, Escape closes. */
export function Menu({ label, items, className, onOpenChange }: MenuProps) {
  const [open, setOpenState] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const setOpen = (next: boolean) => { setOpenState(next); onOpenChange?.(next); };

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    else if (e.key === "ArrowDown") buttons[(at + 1) % buttons.length]?.focus();
    else if (e.key === "ArrowUp") buttons[(at - 1 + buttons.length) % buttons.length]?.focus();
    else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <div ref={rootRef} className={[s.root, open ? s.open : "", className].filter(Boolean).join(" ")} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={s.trigger}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <Icon name="more" size={16} />
      </button>
      {open && (
        <div ref={listRef} id={id} role="menu" className={s.menu}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={[s.item, item.danger ? s.danger : ""].filter(Boolean).join(" ")}
              onClick={() => { setOpen(false); item.onSelect(); }}
            >
              {item.icon && <Icon name={item.icon} size={16} />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
