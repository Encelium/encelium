import type { RefObject } from "react";
import s from "./Work.module.css";

const MIN_CHAT = 340;
const MIN_PANEL = 320;

/**
 * The handle between the chat and the right panel: drag it, or focus it and use the arrow keys.
 * Works in both directions (in Arabic the chat is on the right).
 */
export function Splitter({ label, width, onChange, containerRef }: {
  label: string;
  width: number;
  onChange: (width: number) => void;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const clamp = (w: number) => {
    const total = containerRef.current?.clientWidth ?? 1200;
    return Math.round(Math.max(MIN_CHAT, Math.min(w, total - MIN_PANEL)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => onChange(clamp(rtl ? box.right - ev.clientX : ev.clientX - box.left));
    const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const grow = rtl ? "ArrowLeft" : "ArrowRight";
    const shrink = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === grow) onChange(clamp(width + 32));
    else if (e.key === shrink) onChange(clamp(width - 32));
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={s.splitter}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={MIN_CHAT}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onChange(480)}
      title={label}
    />
  );
}
