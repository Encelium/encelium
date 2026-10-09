import { Logo } from "@enceladus/ui";
import type { Strings } from "./i18n";
import s from "./TitleBar.module.css";

/**
 * Custom title bar. Windows draws the minimize/maximize/close buttons itself
 * (titleBarOverlay); our content stays inside the area Windows leaves free.
 */
export function TitleBar({ t }: { t: Strings }) {
  return (
    <header className={s.bar}>
      <div className={s.inner}>
        <span className={s.brand}>
          <Logo size={18} />
          <span>{t.appName}</span>
        </span>
      </div>
    </header>
  );
}
