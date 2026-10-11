// The prompt system: instructions kept on the server and added to every request, tuned for our
// model. Edit the files and the next request uses them (no restart). The person's own words are
// never changed; only the system instructions around them.
//
//   prompts/system-prefix.md  → before the app's system prompt
//   prompts/system-suffix.md  → after it
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

type Msg = { role: string; content?: unknown; [k: string]: unknown };

export class Prompts {
  private cache = new Map<string, { mtime: number; text: string }>();
  private readonly dir: string;
  constructor(dir: string) { this.dir = dir; }

  /** A prompt file's text ("" if it doesn't exist), re-read when it changes. */
  private read(name: string): string {
    const file = path.join(this.dir, name);
    let mtime: number;
    try { mtime = statSync(file).mtimeMs; } catch { this.cache.delete(name); return ""; }
    const hit = this.cache.get(name);
    if (hit && hit.mtime === mtime) return hit.text;
    const text = readFileSync(file, "utf8").trim();
    this.cache.set(name, { mtime, text });
    return text;
  }

  /** The messages with the server's instructions added around the system prompt. */
  apply(messages: Msg[]): Msg[] {
    const prefix = this.read("system-prefix.md");
    const suffix = this.read("system-suffix.md");
    if (!prefix && !suffix) return messages;
    const first = messages[0];
    if (first?.role === "system" && typeof first.content === "string") {
      return [{ ...first, content: [prefix, first.content, suffix].filter(Boolean).join("\n\n") }, ...messages.slice(1)];
    }
    return [{ role: "system", content: [prefix, suffix].filter(Boolean).join("\n\n") }, ...messages];
  }
}
