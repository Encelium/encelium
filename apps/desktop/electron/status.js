// Small facts for the status bar that need the system, and its two Git actions.
import { execFile } from "node:child_process";

function git(args, cwd, timeout = 15000) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd, timeout, windowsHide: true }, (err, stdout, stderr) => resolve(err ? { ok: false, out: String(stderr || err.message) } : { ok: true, out: String(stdout) }));
  });
}

// A name and email for commits made from the app, only if the person hasn't set their own.
const IDENTITY = ["-c", "user.name=Encelium", "-c", "user.email=encelium@localhost"];

let installed = null;
async function gitInstalled() {
  if (installed === null) installed = (await git(["--version"], process.cwd(), 3000)).ok;
  return installed;
}

/** { installed, branch, changes } — branch is null when the folder isn't a Git project. */
export async function gitStatus(folder) {
  if (!(await gitInstalled())) return { installed: false, branch: null, changes: 0 };
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], folder, 3000);
  if (!branch.ok) return { installed: true, branch: null, changes: 0 };
  const status = await git(["status", "--porcelain"], folder, 3000);
  return { installed: true, branch: branch.out.trim(), changes: status.ok ? status.out.split("\n").filter(Boolean).length : 0 };
}

async function hasOwnIdentity(folder) {
  return (await git(["config", "user.email"], folder, 3000)).ok;
}

/** "Start version history": a Git project in the task folder, with everything saved as the first version. */
export async function gitStart(folder, message) {
  if (!(await gitInstalled())) return { ok: false, reason: "not-installed" };
  const init = await git(["init"], folder);
  if (!init.ok) return { ok: false, reason: "failed", detail: init.out };
  return gitSave(folder, message);
}

/** "Save a version": a commit of everything as it is now. */
export async function gitSave(folder, message) {
  const id = (await hasOwnIdentity(folder)) ? [] : IDENTITY;
  const add = await git(["add", "-A"], folder);
  if (!add.ok) return { ok: false, reason: "failed", detail: add.out };
  const commit = await git([...id, "commit", "-m", message, "--allow-empty"], folder);
  return commit.ok ? { ok: true } : { ok: false, reason: "failed", detail: commit.out };
}
