import { useRef, useState } from "react";
import s from "./Compare.module.css";

/**
 * Before / after: the page as it was at a Rewind point, laid over the page as it is now.
 * Drag the handle (or use the arrow keys) to wipe between them.
 */
export function Compare({ taskId, page, pointId, version, labels }: {
  taskId: string;
  page: string;
  pointId: string;
  version: number;
  labels: { before: string; after: string; handle: string };
}) {
  const [split, setSplit] = useState(50); // percent of the width showing "before"
  const boxRef = useRef<HTMLDivElement>(null);
  const encoded = page.split("/").map(encodeURIComponent).join("/");

  const fromPointer = (clientX: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    setSplit(Math.max(0, Math.min(100, ((clientX - box.left) / box.width) * 100)));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add("is-resizing"); // iframes stop catching the pointer while dragging
    const move = (ev: PointerEvent) => fromPointer(ev.clientX);
    const up = () => {
      document.body.classList.remove("is-resizing");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };

  return (
    // Always left = before, right = after (like a photo slider), in both languages.
    <div ref={boxRef} className={s.box} dir="ltr">
      <iframe key={`after-${version}`} className={s.frame} title={labels.after} src={`enceladus-preview://${taskId}/${encoded}`} sandbox="allow-scripts allow-forms allow-modals" />
      <iframe
        key={`before-${pointId}-${version}`}
        className={`${s.frame} ${s.before}`}
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        title={labels.before}
        src={`enceladus-preview://${taskId}/@before/${pointId}/${encoded}`}
        sandbox="allow-scripts allow-forms allow-modals"
      />
      <span className={`${s.tag} ${s.tagBefore}`} style={{ opacity: split > 8 ? 1 : 0 }}>{labels.before}</span>
      <span className={`${s.tag} ${s.tagAfter}`} style={{ opacity: split < 92 ? 1 : 0 }}>{labels.after}</span>
      <div
        className={s.handle}
        style={{ left: `${split}%` }}
        role="slider"
        tabIndex={0}
        aria-label={labels.handle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split)}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setSplit((v) => Math.max(0, v - 5));
          else if (e.key === "ArrowRight") setSplit((v) => Math.min(100, v + 5));
          else return;
          e.preventDefault();
        }}
      >
        <span className={s.knob} aria-hidden="true">‹ ›</span>
      </div>
    </div>
  );
}
