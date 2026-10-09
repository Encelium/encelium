import s from "./EnergyBar.module.css";

export interface EnergyBarProps {
  /** 0 to 100 */
  value: number;
  /** e.g. "Today's energy" */
  label: string;
  /** e.g. "70% left" */
  caption: string;
  className?: string;
}

export function EnergyBar({ value, label, caption, className }: EnergyBarProps) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={[s.energy, v <= 20 ? s.low : "", className].filter(Boolean).join(" ")}>
      <div className={s.head}>
        <span className={s.label}>{label}</span>
        <span className={s.caption}>{caption}</span>
      </div>
      <div className={s.track} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-valuetext={caption}>
        <div className={s.fill} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
