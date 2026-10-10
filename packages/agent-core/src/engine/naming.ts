// A short, descriptive English folder name for a new task, chosen by the model.
import { streamChat } from "../providers/index.ts";
import type { ModelConnection } from "../providers/types.ts";

const SYSTEM = "You name project folders. Reply with only a folder name for the person's request: 2 to 4 English words in lowercase, joined by hyphens, describing what is being made (for example sweet-crumb-bakery-site or budget-tracker-app). Always English, even if the request is in another language. No quotes, no explanation.";

/** Turns any text into a safe folder name, or "" if nothing usable is left. */
export function toFolderName(text: string): string {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .split("-").filter(Boolean).slice(0, 5).join("-").slice(0, 48).replace(/-+$/, "");
}

/** Asks the model for a name. Returns "" if it fails or takes too long; the caller has a fallback. */
export async function suggestFolderName(connection: ModelConnection, request: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let text = "";
  try {
    for await (const ev of streamChat(connection, { system: SYSTEM, messages: [{ role: "user", content: request.slice(0, 2000) }], maxTokens: 40 }, controller.signal)) {
      if (ev.type === "text") text += ev.text;
    }
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
  return toFolderName(text.replace(/<think>[\s\S]*?<\/think>/g, ""));
}
