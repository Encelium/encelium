// Small facts for the status bar that need the system: is the task folder a Git project?
import { execFile } from "node:child_process";

function git(args, cwd) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd, timeout: 3000, windowsHide: true }, (err, stdout) => resolve(err ? null : String(stdout)));
  });
}

/** { branch, changes } if the folder is in a Git repository, null if not (or Git isn't installed). */
export async function gitStatus(folder) {
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], folder);
  if (branch === null) return null;
  const status = (await git(["status", "--porcelain"], folder)) ?? "";
  return { branch: branch.trim(), changes: status.split("\n").filter(Boolean).length };
}
