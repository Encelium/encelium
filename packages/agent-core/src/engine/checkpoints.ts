// Rewind: before the agent changes a file, keep a copy of how it was.
//
// Each checkpoint holds the original state of every file changed *after* it was made
// (content, or "did not exist"). Restoring checkpoint C replays the saved originals
// from the newest checkpoint back to C, so every file ends up exactly as it was at C.
// Works without Git, so it works on every user's PC.
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Files bigger than this are not copied; the agent is told it can't safely change them. */
export const MAX_REWIND_BYTES = 5 * 1024 * 1024;

/** How a file was: its content (base64), "did not exist", or "was moved to movedTo" (moves keep no copy, so big files can move too). */
interface Saved { existed: boolean; content?: string; movedTo?: string }
interface Checkpoint { id: string; label: string; at: number; files: Record<string, Saved> }

export class Checkpoints {
  private list: Checkpoint[] = [];
  private readonly file: string;
  private loaded = false;

  /** `storeDir` is outside the task folder (e.g. app data), so the agent can't touch it. */
  constructor(storeDir: string) {
    this.file = path.join(storeDir, "checkpoints.json");
  }

  private async load() {
    if (this.loaded) return;
    this.loaded = true;
    try { this.list = JSON.parse(await readFile(this.file, "utf8")); } catch { this.list = []; }
  }
  private async persist() {
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(this.list));
  }

  async create(label: string): Promise<{ id: string; label: string; at: number }> {
    await this.load();
    const cp: Checkpoint = { id: `cp-${Date.now().toString(36)}-${this.list.length}`, label, at: Date.now(), files: {} };
    this.list.push(cp);
    await this.persist();
    return { id: cp.id, label: cp.label, at: cp.at };
  }

  /** Call before changing or deleting `fullPath`. Only the first change after a checkpoint is recorded. */
  async remember(fullPath: string): Promise<void> {
    await this.load();
    const cp = this.list[this.list.length - 1];
    if (!cp) throw new Error("No Rewind point yet: create one before changing files.");
    if (fullPath in cp.files) return;
    try {
      const buf = await readFile(fullPath);
      if (buf.length > MAX_REWIND_BYTES) throw new Error(`This file is too large to keep a Rewind copy of (${Math.round(buf.length / 1048576)} MB).`);
      cp.files[fullPath] = { existed: true, content: buf.toString("base64") };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      cp.files[fullPath] = { existed: false };
    }
    await this.persist();
  }

  /** Call before moving `from` to `to`. Undoing a move just moves it back, so no copy is kept. */
  async rememberMove(from: string, to: string): Promise<void> {
    await this.load();
    const cp = this.list[this.list.length - 1];
    if (!cp) throw new Error("No Rewind point yet: create one before changing files.");
    if (!(from in cp.files)) cp.files[from] = { existed: true, movedTo: to };
    if (!(to in cp.files)) cp.files[to] = { existed: false };
    await this.persist();
  }

  /** Put every file back the way it was when checkpoint `id` was made. Returns the files restored.
   * With `undoLabel`, the files as they are now are kept first, in a new point with that name,
   * so going back can itself be undone.
   */
  async restore(id: string, undoLabel?: string): Promise<string[]> {
    await this.load();
    const index = this.list.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("That Rewind point no longer exists.");
    let undo: Checkpoint | null = null;
    if (undoLabel) {
      undo = { id: `cp-${Date.now().toString(36)}-u${this.list.length}`, label: undoLabel, at: Date.now(), files: {} };
      for (let i = index; i < this.list.length; i++) {
        for (const file of Object.keys(this.list[i]!.files)) {
          if (file in undo.files) continue;
          try {
            const buf = await readFile(file);
            if (buf.length > MAX_REWIND_BYTES) continue;
            undo.files[file] = { existed: true, content: buf.toString("base64") };
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
            undo.files[file] = { existed: false };
          }
        }
      }
    }
    const restored = new Set<string>();
    for (let i = this.list.length - 1; i >= index; i--) {
      for (const [file, saved] of Object.entries(this.list[i]!.files)) {
        if (saved.movedTo) {
          // Moved away during this step: move it back (if it's still where it went).
          if (await access(saved.movedTo).then(() => true, () => false)) {
            await mkdir(path.dirname(file), { recursive: true });
            await rename(saved.movedTo, file);
          }
        } else if (saved.existed) {
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, Buffer.from(saved.content ?? "", "base64"));
        } else {
          await rm(file, { force: true });
        }
        restored.add(file);
      }
    }
    // Later checkpoints describe a future that no longer exists.
    if (undo) {
      this.list = [...this.list.slice(0, index), undo];
    } else {
      this.list = this.list.slice(0, index + 1);
      this.list[index]!.files = {};
    }
    await this.persist();
    return [...restored];
  }

  /** The newest point (after a restore with undo, that's the "before going back" point). */
  async latest() {
    await this.load();
    const cp = this.list[this.list.length - 1];
    return cp ? { id: cp.id, label: cp.label, at: cp.at } : null;
  }

  async all() {
    await this.load();
    return this.list.map(({ id, label, at }) => ({ id, label, at }));
  }
}
