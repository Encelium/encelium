import { Icon } from "@enceladus/ui";
import type { Strings } from "./i18n";
import { useRemembered } from "./useLayout";
import s from "./CheckToggle.module.css";

/** "Check the result": whether the agent tests its own work. Remembered on this computer. */
export function useCheckResult() {
  return useRemembered("enceladus.checkResult", true);
}

export function CheckToggle({ t, on, onChange, disabled }: { t: Strings; on: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={s.toggle}
      aria-pressed={on}
      disabled={disabled}
      title={on ? t.check.onHint : t.check.offHint}
      onClick={() => onChange(!on)}
    >
      <span className={s.box} aria-hidden="true">{on && <Icon name="check" size={12} strokeWidth={3} />}</span>
      {t.check.label}
    </button>
  );
}
