import { Button, EnergyBar, Icon, IconButton } from "@enceladus/ui";
import type { Strings } from "./i18n";
import s from "./Sidebar.module.css";

export function Sidebar({ t, onNewTask, onOpenSettings }: { t: Strings; onNewTask: () => void; onOpenSettings: () => void }) {
  return (
    <aside className={s.sidebar}>
      <Button variant="primary" size="lg" icon="plus" className={s.newTask} onClick={onNewTask}>{t.newTask}</Button>

      <nav className={s.recent} aria-labelledby="recent-heading">
        <h2 id="recent-heading" className={s.heading}>{t.recent}</h2>
        <p className={s.empty}>{t.recentEmpty}</p>
      </nav>

      <div className={s.footer}>
        {/* Placeholder value until the server reports real usage. */}
        <EnergyBar value={100} label={t.energy} caption={t.energyCaption} />
        <div className={s.links}>
          <button type="button" className={s.link}>
            <Icon name="plug" size={16} />
            {t.connections}
          </button>
          <IconButton icon="settings" label={t.settings} onClick={onOpenSettings} />
        </div>
      </div>
    </aside>
  );
}
