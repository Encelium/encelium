import { useLayoutEffect, useRef, useState } from "react";
import s from "./Segmented.module.css";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the whole group for screen readers. */
  ariaLabel: string;
  className?: string;
}

/** A row of choices. The highlight slides to the chosen one. */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel, className }: SegmentedProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const labels = options.map((o) => o.label).join("|");

  // Measure the chosen button (works in both directions; re-measured when the labels change, e.g. language).
  useLayoutEffect(() => {
    const group = groupRef.current;
    const button = group?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (!group || !button) { setThumb(null); return; }
    const measure = () => setThumb({ left: button.offsetLeft, width: button.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(group);
    return () => ro.disconnect();
  }, [value, labels]);

  return (
    <div ref={groupRef} role="group" aria-label={ariaLabel} className={[s.group, className].filter(Boolean).join(" ")}>
      {thumb && <span className={s.thumb} style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />}
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} className={[s.option, thumb ? s.onThumb : ""].filter(Boolean).join(" ")} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
