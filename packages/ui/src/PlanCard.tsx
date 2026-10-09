import { useId } from "react";
import { Icon } from "./icons";
import { StatusIcon } from "./StatusIcon";
import s from "./PlanCard.module.css";

export type PlanStepStatus = "done" | "active" | "pending";

export interface PlanStep {
  label: string;
  status: PlanStepStatus;
}

export interface PlanCardProps {
  title?: string;
  steps: PlanStep[];
  /** Spoken names for each status, so state is never shown by look alone. */
  statusLabels: Record<PlanStepStatus, string>;
  className?: string;
}

export function PlanCard({ title, steps, statusLabels, className }: PlanCardProps) {
  const titleId = useId();
  return (
    <section className={[s.card, className].filter(Boolean).join(" ")} aria-labelledby={title ? titleId : undefined}>
      {title && <h3 id={titleId} className={s.title}>{title}</h3>}
      <ol className={s.list}>
        {steps.map((step, i) => (
          <li key={i} className={[s.step, s[step.status]].join(" ")} aria-current={step.status === "active" ? "step" : undefined}>
            <span className={s.marker}>
              {step.status === "done" && <span className={s.doneCircle} role="img" aria-label={statusLabels.done}><Icon name="check" size={12} strokeWidth={2.6} /></span>}
              {step.status === "active" && <StatusIcon status="working" label={statusLabels.active} size={22} />}
              {step.status === "pending" && <span className={s.ring} role="img" aria-label={statusLabels.pending} />}
            </span>
            <span className={s.text} dir="auto">{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
