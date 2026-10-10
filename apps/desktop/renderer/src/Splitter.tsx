import type { RefObject } from "react";
import s from "./Work.module.css";

interface SplitterProps {
  label: string;
  /** Width of the part before the handle (the sidebar, or the chat). */
  width: number;
  onChange: (width: number) => void;
  /** Measured from this element's start edge. */
  containerRef: RefObject<HTMLElement | null>;
  min: number;
  /** Room to leave after the handle. */
  minAfter: number;
  max?: number;
  /** Double-click goes back to this width. */
  initial: number;
  className?: string;
}

/**
 * A drag handle between two parts: drag it, or focus it and use the arrow keys.
 * Works in both directions (in Arabic the start edge is on the right).
 */
export function Splitter({ label, width, onChange, containerRef, min, minAfter, max = Infinity, initial, className }: SplitterProps) {
  const clamp = (w: number) => {
    const total = containerRef.current?.clientWidth ?? 1200;
    return Math.round(Math.max(min, Math.min(w, max, total - minAfter)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add("is-resizing");
    const move = (ev: PointerEvent) => onChange(clamp(rtl ? box.right - ev.clientX : ev.clientX - box.left));
    const up = () => {
      document.body.classList.remove("is-resizing");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const grow = rtl ? "ArrowLeft" : "ArrowRight";
    const shrink = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === grow) onChange(clamp(width + 24));
    else if (e.key === shrink) onChange(clamp(width - 24));
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={[s.splitter, className].filter(Boolean).join(" ")}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onChange(clamp(initial))}
      title={label}
    />
  );
}
