import { Icon, Logo, type IconName } from "@encelium/ui";
import type { Strings } from "./i18n";
import s from "./TitleBar.module.css";

interface TitleBarProps {
  t: Strings;
  /** Hidden in compact mode (there's no room for a sidebar). */
  sidebar?: { open: boolean; onToggle: () => void };
  /** Only on a task screen. */
  panel?: { open: boolean; onToggle: () => void };
  compact?: { on: boolean; onToggle: () => void };
  /** Only in compact mode. */
  onTop?: { on: boolean; onToggle: () => void };
}

function BarButton({ icon, label, pressed, onClick }: { icon: IconName; label: string; pressed?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={s.button} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      <Icon name={icon} size={16} />
    </button>
  );
}

/**
 * Custom title bar. Windows draws the minimize/maximize/close buttons itself
 * (titleBarOverlay); our content stays inside the area Windows leaves free.
 */
export function TitleBar({ t, sidebar, panel, compact, onTop }: TitleBarProps) {
  return (
    <header className={s.bar}>
      <div className={s.inner}>
        {sidebar && <BarButton icon="sidebarLeft" label={`${sidebar.open ? t.layout.hideSidebar : t.layout.showSidebar} (Ctrl+B)`} pressed={sidebar.open} onClick={sidebar.onToggle} />}
        <span className={s.brand}>
          <Logo size={18} />
          <span>{t.appName}</span>
        </span>
        <span className={s.spacer} />
        {panel && <BarButton icon="sidebarRight" label={`${panel.open ? t.layout.hidePanel : t.layout.showPanel} (Ctrl+\\)`} pressed={panel.open} onClick={panel.onToggle} />}
        {onTop && <BarButton icon="pin" label={onTop.on ? t.layout.unpin : t.layout.pin} pressed={onTop.on} onClick={onTop.onToggle} />}
        {compact && <BarButton icon={compact.on ? "expand" : "shrink"} label={`${compact.on ? t.layout.exitCompact : t.layout.compact} (Ctrl+Shift+M)`} onClick={compact.onToggle} />}
      </div>
    </header>
  );
}
