// The task's folder — the agent's home base for a task, shown to the person and
// used for previews and Rewind.
//
// Note: file paths are NOT confined to the folder (the team's decision for this
// phase, 2026-11-28). The model may write anywhere the person's account can
// reach. Rewind and the live preview only cover the task folder, so changes
// elsewhere are on the person and the model.
import path from "node:path";

export class OutsideWorkspaceError extends Error {
  constructor(p: string) {
    super(`"${p}" is outside the task folder.`);
    this.name = "OutsideWorkspaceError";
  }
}

export class Workspace {
  readonly root: string;
  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Resolve a path the model gave us (relative to the task folder, or absolute as-is). */
  async resolve(p: string): Promise<string> {
    return path.resolve(this.root, p || ".");
  }

  /** Path as shown to people and the model: relative to the task folder, forward slashes. */
  display(full: string): string {
    return path.relative(this.root, full).split(path.sep).join("/") || ".";
  }
}
