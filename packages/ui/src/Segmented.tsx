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

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={[s.group, className].filter(Boolean).join(" ")}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} className={s.option} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
