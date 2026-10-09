// The task's folder. Every file the agent touches must be inside it.
import { realpath } from "node:fs/promises";
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

  /** Resolve a path the model gave us (relative or absolute) and refuse anything outside the folder. */
  async resolve(p: string): Promise<string> {
    const full = path.resolve(this.root, p || ".");
    if (!inside(this.root, full)) throw new OutsideWorkspaceError(p);
    // Follow links for the part of the path that exists, so a link can't point outside.
    let existing = full;
    while (existing !== this.root && !(await exists(existing))) existing = path.dirname(existing);
    const real = await realpath(existing).catch(() => existing);
    const realRoot = await realpath(this.root).catch(() => this.root);
    if (!inside(realRoot, real)) throw new OutsideWorkspaceError(p);
    return full;
  }

  /** Path as shown to people and the model: relative, with forward slashes. */
  display(full: string): string {
    return path.relative(this.root, full).split(path.sep).join("/") || ".";
  }
}

function inside(root: string, p: string) {
  const rel = path.relative(root, p);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function exists(p: string) {
  try { await realpath(p); return true; } catch { return false; }
}
