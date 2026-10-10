// "What next?": after a task finishes, three short follow-ups the person might want.
// One small request with no tools and no history beyond the request and the answer.
import { streamChat } from "../providers/index.ts";
import type { ModelConnection } from "../providers/types.ts";
import type { Language } from "./events.ts";

const SYSTEM = {
  en: "Suggest what the person might ask next. Reply with exactly 3 lines, nothing else. Each line is one short request in plain words (at most 7 words), written as the person would type it, like \"Add a contact form\". No numbering, no quotes.",
  ar: "اقترح ما قد يطلبه الشخص بعد ذلك. أجب بثلاثة أسطر بالضبط، ولا شيء غيرها. كل سطر طلب قصير بكلمات بسيطة (٧ كلمات على الأكثر)، مكتوب كما سيكتبه الشخص، مثل «أضف نموذج تواصل». بلا ترقيم ولا علامات تنصيص.",
};

/** Up to 3 follow-up requests, or [] if the model can't give clean ones in time. */
export async function suggestNext(connection: ModelConnection, request: string, answer: string, language: Language, timeoutMs = 12000): Promise<string[]> {
  const signal = AbortSignal.timeout(timeoutMs);
  let text = "";
  try {
    const content = `Request:\n${request.slice(0, 1500)}\n\nWhat was done:\n${answer.slice(0, 1500)}`;
    for await (const ev of streamChat(connection, { system: SYSTEM[language], messages: [{ role: "user", content }], maxTokens: 120 }, signal)) {
      if (ev.type === "text") text += ev.text;
    }
  } catch {
    return [];
  }
  return cleanSuggestions(text);
}

/** Keeps short, single-line requests; drops numbering, bullets, quotes and anything chatty. */
export function cleanSuggestions(text: string): string[] {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .split("\n")
    .map((l) => l.trim().replace(/^(\d+[.)]|[-*•])\s*/, "").replace(/^["“«']+|["”»'.]+$/g, "").trim())
    .filter((l) => l.length >= 3 && l.length <= 70 && l.split(/\s+/).length <= 10 && !/:$/.test(l))
    .slice(0, 3);
}
