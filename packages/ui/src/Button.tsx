import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import s from "./Button.module.css";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  children: ReactNode;
}

export function Button({ variant = "secondary", size = "md", icon, iconEnd, className, children, type = "button", ...rest }: ButtonProps) {
  const iconSize = size === "lg" ? 18 : size === "sm" ? 14 : 16;
  return (
    <button type={type} className={[s.button, s[variant], s[size], className].filter(Boolean).join(" ")} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} size={iconSize} />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  /** Required: icon-only buttons need a name for screen readers. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function IconButton({ icon, label, variant = "ghost", size = "md", className, type = "button", ...rest }: IconButtonProps) {
  const iconSize = size === "lg" ? 20 : size === "sm" ? 15 : 17;
  return (
    <button type={type} aria-label={label} title={label}
      className={[s.button, s.iconOnly, s[variant], s[size], className].filter(Boolean).join(" ")} {...rest}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
