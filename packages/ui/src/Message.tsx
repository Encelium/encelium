import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import s from "./Message.module.css";

export type MessageRole = "user" | "assistant";

export interface MessageProps {
  role: MessageRole;
  children: ReactNode;
  className?: string;
}

/** Every paragraph decides its own direction, so Arabic and English can sit side by side. */
function withAutoDir(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") return <p dir="auto">{child}</p>;
    if (isValidElement<{ dir?: string }>(child) && typeof child.type === "string" && ["p", "li", "ul", "ol", "h1", "h2", "h3", "h4"].includes(child.type) && !child.props.dir) {
      return cloneElement(child, { dir: "auto" });
    }
    return child;
  });
}

export function Message({ role, children, className }: MessageProps) {
  return (
    <div className={[s.message, s[role], className].filter(Boolean).join(" ")}>
      <div className={s.content} dir="auto">{withAutoDir(children)}</div>
    </div>
  );
}
