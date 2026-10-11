import { useEffect, useRef, useState } from "react";
import { Button, EnergyBar, Icon, IconButton, Menu } from "@enceladus/ui";
import type { Strings } from "./i18n";
import s from "./Sidebar.module.css";

export interface SidebarTask { id: string; title: string; working?: boolean }

interface SidebarProps {
  t: Strings;
  tasks: SidebarTask[];
  currentTaskId: string | null;
  onNewTask: () => void;
  onOpenTask: (id: string) => void;
  /** Leave out to hide the delete button (e.g. nothing is saved in the browser demo). */
  onDeleteTask?: (id: string) => void;
  /** Leave out to hide renaming. */
  onRenameTask?: (id: string, title: string) => void;
  /** "Save as recipe" (leave out to hide). */
  onSaveRecipe?: (id: string) => void;
  onOpenSettings: () => void;
  /** Bumped by Ctrl+K: move the keyboard into the search box. */
  searchRequest?: number;
}

export function Sidebar({ t, tasks, currentTaskId, onNewTask, onOpenTask, onDeleteTask, onRenameTask, onSaveRecipe, onOpenSettings, searchRequest }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (searchRequest) searchRef.current?.focus(); }, [searchRequest]);

  const q = query.trim().toLocaleLowerCase();
  const shown = q ? tasks.filter((task) => task.title.toLocaleLowerCase().includes(q)) : tasks;

  return (
    <aside className={s.sidebar}>
      <Button variant="primary" size="lg" icon="plus" className={s.newTask} onClick={onNewTask} title={`${t.newTask} (Ctrl+N)`}>{t.newTask}</Button>

      <nav className={s.recent} aria-labelledby="recent-heading">
        <h2 id="recent-heading" className={s.heading}>{t.recent}</h2>
        {tasks.length > 0 && (
          <label className={s.search}>
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={t.searchChats}
              aria-label={t.searchChats}
              title="Ctrl+K"
              dir="auto"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setQuery(""); e.currentTarget.blur(); } }}
            />
          </label>
        )}
        {tasks.length === 0 ? (
          <p className={s.empty}>{t.recentEmpty}</p>
        ) : shown.length === 0 ? (
          <p className={s.empty}>{t.searchNoResults}</p>
        ) : (
          <ul className={s.tasks}>
            {shown.map((task) => (
              <li key={task.id} className={[s.taskRow, task.id === currentTaskId ? s.current : "", menuFor === task.id ? s.menuOpen : ""].filter(Boolean).join(" ")}>
                {renaming === task.id ? (
                  <RenameField
                    initial={task.title}
                    label={t.renameChat}
                    onDone={(title) => {
                      setRenaming(null);
                      if (title && title !== task.title) onRenameTask?.(task.id, title);
                    }}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className={s.task}
                      aria-current={task.id === currentTaskId ? "page" : undefined}
                      onClick={() => onOpenTask(task.id)}
                      onDoubleClick={onRenameTask ? () => setRenaming(task.id) : undefined}
                      onKeyDown={(e) => { if (e.key === "F2" && onRenameTask) { e.preventDefault(); setRenaming(task.id); } }}
                    >
                      <span className={s.taskTitle} dir="auto">{task.title}</span>
                      {task.working && <span className={s.workingDot} title={t.status.working} aria-label={t.status.working} />}
                    </button>
                    {(onRenameTask || onDeleteTask) && (
                      <Menu
                        className={s.rowMenu}
                        label={`${t.chatOptions}: ${task.title}`}
                        onOpenChange={(open) => setMenuFor(open ? task.id : null)}
                        items={[
                          ...(onRenameTask ? [{ label: t.renameChat, icon: "pencil" as const, onSelect: () => setRenaming(task.id) }] : []),
                          ...(onSaveRecipe ? [{ label: t.recipes.saveAs, icon: "repeat" as const, onSelect: () => onSaveRecipe(task.id) }] : []),
                          ...(onDeleteTask ? [{ label: t.deleteChat, icon: "trash" as const, danger: true, onSelect: () => onDeleteTask(task.id) }] : []),
                        ]}
                      />
                    )}
                  </>
                )}
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
          <IconButton icon="settings" label={`${t.settings} (Ctrl+,)`} onClick={onOpenSettings} />
        </div>
      </div>
    </aside>
  );
}

/** Inline rename: Enter saves, Escape cancels, clicking away saves. */
function RenameField({ initial, label, onDone }: { initial: string; label: string; onDone: (title: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const finish = (title: string | null) => { if (done.current) return; done.current = true; onDone(title); };
  return (
    <input
      ref={ref}
      className={s.rename}
      value={value}
      aria-label={label}
      dir="auto"
      maxLength={120}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(value.trim() || null);
        if (e.key === "Escape") finish(null);
      }}
      onBlur={() => finish(value.trim() || null)}
    />
  );
}

/**
 * The sidebar folded away: a slim bar that keeps the essentials in reach
 * (new task, search, connections, settings).
 */
export function SidebarRail({ t, onNewTask, onSearch, onOpenSettings }: { t: Strings; onNewTask: () => void; onSearch: () => void; onOpenSettings: () => void }) {
  return (
    <nav className={s.rail} aria-label={t.recent}>
      <IconButton icon="plus" label={`${t.newTask} (Ctrl+N)`} className={s.railNew} onClick={onNewTask} />
      <IconButton icon="search" label={`${t.searchChats} (Ctrl+K)`} onClick={onSearch} />
      <span className={s.railSpacer} />
      <IconButton icon="plug" label={t.connections} />
      <IconButton icon="settings" label={`${t.settings} (Ctrl+,)`} onClick={onOpenSettings} />
    </nav>
  );
}
