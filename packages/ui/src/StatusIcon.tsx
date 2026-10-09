import { Icon } from "./icons";
import s from "./StatusIcon.module.css";

export type AgentStatus = "thinking" | "working" | "done";

/**
 * The agent's state, in the brand's motion language:
 * thinking = mist breathes, working = small jets erupt from a crack, done = a check.
 */
export function StatusIcon({ status, label, size = 20 }: { status: AgentStatus; label: string; size?: number }) {
  return (
    <span className={s.root} style={{ width: size, height: size, fontSize: size }} role="img" aria-label={label}>
      {status === "thinking" && <span className={s.mist} />}
      {status === "working" && (
        <span className={s.jets}>
          <span className={s.base} />
          <span className={s.jet} style={{ insetInlineStart: "25%", animationDelay: "0s" }} />
          <span className={s.jet} style={{ insetInlineStart: "45%", animationDelay: ".5s", height: ".72em" }} />
          <span className={s.jet} style={{ insetInlineStart: "65%", animationDelay: "1s" }} />
          <span className={s.drop} style={{ insetInlineStart: "40%", ["--dx" as string]: "-.15em", animationDelay: ".3s" }} />
          <span className={s.drop} style={{ insetInlineStart: "55%", ["--dx" as string]: ".15em", animationDelay: ".9s" }} />
        </span>
      )}
      {status === "done" && <Icon name="check" size={size} strokeWidth={2.4} />}
    </span>
  );
}
