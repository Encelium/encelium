import { Button, EnergyBar, Icon, IconButton } from "@enceladus/ui";
import type { Strings } from "./i18n";
import s from "./Sidebar.module.css";

export interface SidebarTask { id: string; title: string }

interface SidebarProps {
  t: Strings;
  tasks: SidebarTask[];
  currentTaskId: string | null;
  onNewTask: () => void;
  onOpenTask: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ t, tasks, currentTaskId, onNewTask, onOpenTask, onOpenSettings }: SidebarProps) {
  return (
    <aside className={s.sidebar}>
      <Button variant="primary" size="lg" icon="plus" className={s.newTask} onClick={onNewTask}>{t.newTask}</Button>

      <nav className={s.recent} aria-labelledby="recent-heading">
        <h2 id="recent-heading" className={s.heading}>{t.recent}</h2>
        {tasks.length === 0 ? (
          <p className={s.empty}>{t.recentEmpty}</p>
        ) : (
          <ul className={s.tasks}>
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className={[s.task, task.id === currentTaskId ? s.current : ""].filter(Boolean).join(" ")}
                  aria-current={task.id === currentTaskId ? "page" : undefined}
                  onClick={() => onOpenTask(task.id)}
                >
                  <span className={s.taskTitle} dir="auto">{task.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
