// What the agent can do, how risky each action is, and how to describe it in plain words.
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ToolDefinition } from "../providers/types.ts";
import type { Language, RiskLevel, StepStatus } from "./events.ts";
import type { Checkpoints } from "./checkpoints.ts";
import type { Workspace } from "./workspace.ts";

export const TOOLS: ToolDefinition[] = [
  {
    name: "update_plan",
    description: "Show the user your plan as a short checklist, and update it as you go. Call it before starting a multi-step task and whenever a step's status changes. Use plain, non-technical words.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title, e.g. 'Making your bakery website'" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" }, status: { type: "string", enum: ["pending", "active", "done"] } },
            required: ["label", "status"],
          },
        },
      },
      required: ["title", "steps"],
    },
  },
  {
    name: "list_files",
    description: "List files and folders inside the task folder (or a sub-folder). Skips node_modules and .git.",
    parameters: { type: "object", properties: { path: { type: "string", description: "Folder relative to the task folder. Default: the task folder." } } },
  },
  {
    name: "read_file",
    description: "Read a text file inside the task folder.",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "write_file",
    description: "Create a file, or replace a file's whole content. Folders are created as needed. The user can rewind this.",
    parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
  },
  {
    name: "edit_file",
    description: "Replace one exact piece of text in a file with new text. `old_text` must appear exactly once. Prefer this over write_file for small changes.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, old_text: { type: "string" }, new_text: { type: "string" } },
      required: ["path", "old_text", "new_text"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file inside the task folder. Asks the user first. The user can rewind this.",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "run_command",
    description: "Run a Windows PowerShell command in the task folder (for example to install packages, run tests or start a build). Asks the user first. Commands time out after 2 minutes; don't start servers that run forever. Changes made by commands can't be rewound.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string" },
        reason: { type: "string", description: "One plain sentence the user will see, e.g. 'Install the tools your website needs.'" },
      },
      required: ["command", "reason"],
    },
  },
];

// ── Plain-language labels ───────────────────────────────────────────
const L = {
  en: {
    listed: "Looked through {path}", read: "Read {path}", created: "Created {path}", changed: "Changed {path}", deleted: "Deleted {path}",
    ran: "Ran a command", planUpdated: "Updated the plan", aFile: "a file",
    before: { write_file: "Before writing {path}", edit_file: "Before changing {path}", delete_file: "Before deleting {path}", other: "Before changing files" },
    failed: { list_files: "Couldn’t look at your files", read_file: "Couldn’t read {path}", write_file: "Couldn’t write {path}", edit_file: "Couldn’t change {path}", delete_file: "Couldn’t delete {path}", run_command: "Couldn’t run the command", update_plan: "Couldn’t update the plan" },
    askDeleteTitle: "Delete {path}?", askDeleteBody: "You can bring it back with Rewind.",
    askRunTitle: "Run a command?", askRunBody: "I need to run a command to continue.", allow: "Allow", deny: "Not now",
    working: { list_files: "Looking at your files", read_file: "Reading {path}", write_file: "Writing {path}", edit_file: "Changing {path}", delete_file: "Deleting {path}", run_command: "Running a command", update_plan: "Planning" },
  },
  ar: {
    listed: "اطّلعتُ على {path}", read: "قرأتُ {path}", created: "أنشأتُ {path}", changed: "عدّلتُ {path}", deleted: "حذفتُ {path}",
    ran: "شغّلتُ أمرًا", planUpdated: "حدّثتُ الخطة", aFile: "ملفًا",
    before: { write_file: "قبل كتابة {path}", edit_file: "قبل تعديل {path}", delete_file: "قبل حذف {path}", other: "قبل تغيير الملفات" },
    failed: { list_files: "تعذّر الاطلاع على ملفاتك", read_file: "تعذّرت قراءة {path}", write_file: "تعذّرت كتابة {path}", edit_file: "تعذّر تعديل {path}", delete_file: "تعذّر حذف {path}", run_command: "تعذّر تشغيل الأمر", update_plan: "تعذّر تحديث الخطة" },
    askDeleteTitle: "حذف {path}؟", askDeleteBody: "يمكنك استعادته بالتراجع.",
    askRunTitle: "تشغيل أمر؟", askRunBody: "أحتاج إلى تشغيل أمر للمتابعة.", allow: "اسمح", deny: "ليس الآن",
    working: { list_files: "أطّلع على ملفاتك", read_file: "أقرأ {path}", write_file: "أكتب {path}", edit_file: "أعدّل {path}", delete_file: "أحذف {path}", run_command: "أشغّل أمرًا", update_plan: "أخطّط" },
  },
};
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

export function workingText(lang: Language, tool: string, args: Record<string, unknown>) {
  const t = (L[lang].working as Record<string, string>)[tool];
  return t ? fill(t, { path: String(args.path ?? "") || L[lang].aFile }) : L[lang].working.update_plan;
}

/** The Rewind point's name, e.g. "Before changing index.html". */
export function checkpointLabel(lang: Language, tool: string, args: Record<string, unknown>) {
  const b = L[lang].before as Record<string, string>;
  return fill(b[tool] ?? b.other ?? "", { path: String(args.path ?? "") || L[lang].aFile });
}

/** Fields a tool can't work without. Checked before running, so a model that leaves one out gets a clear retry hint. */
export function missingFields(tool: string, args: Record<string, unknown>): string[] {
  if (tool === "update_plan") return []; // lenient: a bad plan just shows fewer steps
  const def = TOOLS.find((d) => d.name === tool);
  const required = ((def?.parameters as { required?: string[] } | undefined)?.required ?? []).filter((f) => f !== "reason");
  return required.filter((f) => typeof args[f] !== "string" || (f !== "new_text" && f !== "content" && !(args[f] as string).trim()));
}

// ── Risk ────────────────────────────────────────────────────────────
// Things that destroy data, touch the system, or download-and-run code.
const DANGEROUS = [
  /\brm\s+(-\w*r\w*f|-\w*f\w*r)\b/i, /\bRemove-Item\b.*-Recurse/i, /\b(del|erase)\b.*\s\/s\b/i, /\brmdir\b.*\s\/s\b/i, /\brd\s+\/s\b/i,
  /\bformat(\.com)?\s+[a-z]:/i, /\bdiskpart\b/i, /\bShutdown\b|\bStop-Computer\b|\bRestart-Computer\b/i,
  /\breg(\.exe)?\s+(delete|add)\b/i, /\bSet-ItemProperty\b.*\bHK(LM|CU):/i, /\bSet-ExecutionPolicy\b/i,
  /\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod|curl|wget)\b.*\|\s*(iex|Invoke-Expression)\b/i, /\bInvoke-Expression\b|\biex\b/i,
  /\bgit\s+(push\s+.*--force|reset\s+--hard|clean\s+-\w*f)/i, /\btakeown\b|\bicacls\b/i, /\bcipher\s+\/w\b/i,
];
const READ_ONLY = /^\s*((node|npm|npx|python|py|pip|git|dotnet|java)\s+(--version|-v|-V|version)|git\s+(status|log|diff)\b[^;|&>]*|(dir|ls|pwd|Get-ChildItem|Get-Location)\b[^;|&>]*)\s*$/i;

export function riskOf(tool: string, args: Record<string, unknown>): RiskLevel {
  if (tool === "run_command") {
    const cmd = String(args.command ?? "");
    if (DANGEROUS.some((r) => r.test(cmd))) return "risky";
    return READ_ONLY.test(cmd) ? "safe" : "careful";
  }
  if (tool === "delete_file") return "careful";
  return "safe"; // reading, planning, and rewindable file changes inside the task folder
}

export function permissionText(lang: Language, tool: string, args: Record<string, unknown>) {
  const t = L[lang];
  if (tool === "delete_file") return { title: fill(t.askDeleteTitle, { path: String(args.path) }), description: t.askDeleteBody, allowLabel: t.allow, denyLabel: t.deny };
  // A short plain reason up front; the exact command only if the person wants to see it.
  const reason = String(args.reason ?? "").trim();
  return { title: t.askRunTitle, description: reason || t.askRunBody, details: String(args.command ?? ""), allowLabel: t.allow, denyLabel: t.deny };
}

// ── Running tools ───────────────────────────────────────────────────
export interface ToolContext {
  workspace: Workspace;
  checkpoints: Checkpoints;
  language: Language;
  signal: AbortSignal;
  /** Make a Rewind point before the first change in each model turn. */
  ensureCheckpoint(): Promise<void>;
  onPlan(title: string, steps: { label: string; status: StepStatus }[]): void;
}

export interface ToolResult {
  /** What the model sees. */
  output: string;
  isError?: boolean;
  /** What the person sees (an activity line), if anything. */
  activity?: { text: string; details?: string };
}

const MAX_READ = 200 * 1024;
const MAX_OUTPUT = 20 * 1024;
const COMMAND_TIMEOUT_MS = 120_000;
const SKIP = new Set(["node_modules", ".git", ".enceladus"]);

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const missing = missingFields(name, args);
  if (missing.length) return { output: `Missing ${missing.map((f) => `"${f}"`).join(", ")}. Send the call again with every required field.`, isError: true };
  const t = L[ctx.language];
  const ws = ctx.workspace;
  const p = typeof args.path === "string" ? args.path : "";
  switch (name) {
    case "update_plan": {
      const steps = Array.isArray(args.steps) ? args.steps.filter((s): s is { label: string; status: StepStatus } =>
        !!s && typeof s.label === "string" && ["pending", "active", "done"].includes(s.status)) : [];
      ctx.onPlan(String(args.title ?? ""), steps);
      return { output: "Plan shown to the user." };
    }
    case "list_files": {
      const dir = await ws.resolve(p);
      const lines: string[] = [];
      await walk(dir, 0, lines, ws);
      const label = ws.display(dir) === "." ? path.basename(ws.root) : ws.display(dir);
      return { output: lines.length ? lines.join("\n") : "(empty folder)", activity: { text: fill(t.listed, { path: label }), details: lines.slice(0, 60).join("\n") } };
    }
    case "read_file": {
      const file = await ws.resolve(p);
      const info = await stat(file);
      if (info.size > MAX_READ) return { output: `The file is ${Math.round(info.size / 1024)} KB, too large to read whole. Read a smaller file or ask the user.`, isError: true };
      const text = await readFile(file, "utf8");
      return { output: text, activity: { text: fill(t.read, { path: ws.display(file) }) } };
    }
    case "write_file": {
      const file = await ws.resolve(p);
      const content = String(args.content ?? "");
      const existed = await stat(file).then(() => true, () => false);
      await ctx.ensureCheckpoint();
      await ctx.checkpoints.remember(file);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
      const rel = ws.display(file);
      return { output: `${existed ? "Replaced" : "Created"} ${rel} (${content.length} characters).`, activity: { text: fill(existed ? t.changed : t.created, { path: rel }) } };
    }
    case "edit_file": {
      const file = await ws.resolve(p);
      const before = await readFile(file, "utf8");
      const oldText = String(args.old_text ?? "");
      const count = oldText ? before.split(oldText).length - 1 : 0;
      if (count !== 1) return { output: count === 0 ? "old_text was not found. Read the file again and copy the text exactly." : `old_text appears ${count} times. Include more surrounding text so it appears once.`, isError: true };
      await ctx.ensureCheckpoint();
      await ctx.checkpoints.remember(file);
      await writeFile(file, before.replace(oldText, () => String(args.new_text ?? "")));
      return { output: `Changed ${ws.display(file)}.`, activity: { text: fill(t.changed, { path: ws.display(file) }) } };
    }
    case "delete_file": {
      const file = await ws.resolve(p);
      if ((await stat(file)).isDirectory()) return { output: "That is a folder. Only single files can be deleted.", isError: true };
      await ctx.ensureCheckpoint();
      await ctx.checkpoints.remember(file);
      await rm(file);
      return { output: `Deleted ${ws.display(file)}.`, activity: { text: fill(t.deleted, { path: ws.display(file) }) } };
    }
    case "run_command": {
      const command = String(args.command ?? "");
      const r = await runPowerShell(command, ws.root, ctx.signal);
      const details = `> ${command}\n${r.output}`.trim();
      const summary = r.timedOut ? "The command was stopped after 2 minutes." : `Exit code ${r.code}.`;
      return { output: `${summary}\n${r.output}`, isError: r.code !== 0, activity: { text: t.ran, details } };
    }
    default:
      return { output: `Unknown tool "${name}".`, isError: true };
  }
}

export function failureActivity(lang: Language, tool: string, args: Record<string, unknown>) {
  const f = (L[lang].failed as Record<string, string>)[tool] ?? L[lang].failed.update_plan;
  return { text: fill(f, { path: String(args.path ?? "") || L[lang].aFile }) };
}

async function walk(dir: string, depth: number, out: string[], ws: Workspace) {
  if (out.length >= 500) return;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    out.push(`${"  ".repeat(depth)}${ws.display(full)}${e.isDirectory() ? "/" : ""}`);
    if (e.isDirectory() && depth < 3) await walk(full, depth + 1, out, ws);
    if (out.length >= 500) { out.push("… (more files not shown)"); return; }
  }
}

function runPowerShell(command: string, cwd: string, signal: AbortSignal): Promise<{ code: number; output: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { cwd, windowsHide: true });
    let output = "";
    let timedOut = false;
    const add = (b: Buffer) => { if (output.length < MAX_OUTPUT) output += b.toString("utf8"); };
    child.stdout.on("data", add);
    child.stderr.on("data", add);
    const kill = () => { if (child.pid) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }); };
    const timer = setTimeout(() => { timedOut = true; kill(); }, COMMAND_TIMEOUT_MS);
    signal.addEventListener("abort", kill, { once: true });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", kill);
      if (output.length >= MAX_OUTPUT) output = output.slice(0, MAX_OUTPUT) + "\n… (output cut short)";
      resolve({ code: code ?? 1, output: output.trim(), timedOut });
    });
    child.on("error", (e) => { clearTimeout(timer); resolve({ code: 1, output: e.message, timedOut: false }); });
  });
}
