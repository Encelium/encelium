// The agent loop: ask the model, run the tools it asks for (with permission where needed),
// feed the results back, repeat until it answers without tools.
import { streamChat } from "../providers/index.ts";
import { ProviderError } from "../providers/types.ts";
import type { ChatMessage, ModelConnection, ToolCall } from "../providers/types.ts";
import type { AgentEvent, AgentRun, Language } from "./events.ts";
import type { Checkpoints } from "./checkpoints.ts";
import type { Workspace } from "./workspace.ts";
import { TOOLS, failureActivity, permissionText, riskOf, runTool, workingText } from "./tools.ts";

export interface SessionOptions {
  connection: ModelConnection;
  workspace: Workspace;
  checkpoints: Checkpoints;
  language: Language;
  /** Earlier messages in this task (follow-ups continue the conversation). */
  history?: ChatMessage[];
  maxTurns?: number;
}

const S = {
  en: {
    thinking: "Thinking", finished: "Finished.", before: "Before: {what}",
    stopped: "Stopped. Nothing else will change.", stoppedHint: "You can continue whenever you like.",
    tooLong: "I’ve taken a lot of steps without finishing, so I stopped to be safe.", tooLongHint: "Tell me what to focus on, and I’ll continue from here.",
    errors: {
      "no-network": ["I couldn’t reach the AI model.", "Check your internet connection, then try again."],
      "bad-key": ["The AI model didn’t accept the key.", "Check the key in Settings → Advanced."],
      "not-found": ["The AI model wasn’t found at its address.", "Check the model settings in Settings → Advanced."],
      "rate-limited": ["You’ve reached today’s limit for the AI model.", "Try again later."],
      server: ["The AI model is having trouble right now.", "Try again in a few minutes."],
      "bad-response": ["The AI model sent an answer I couldn’t understand.", "Try again. If it keeps happening, try another model."],
      unknown: ["Something went wrong on my side.", "Try again. Your files are safe, and Rewind still works."],
    },
  },
  ar: {
    thinking: "أفكّر", finished: "انتهيت.", before: "قبل: {what}",
    stopped: "توقفتُ. لن يتغير شيء آخر.", stoppedHint: "يمكنك المتابعة متى شئت.",
    tooLong: "قمتُ بخطوات كثيرة دون أن أنتهي، فتوقفتُ احتياطًا.", tooLongHint: "أخبرني بما أركّز عليه، وسأتابع من هنا.",
    errors: {
      "no-network": ["تعذّر الوصول إلى نموذج الذكاء الاصطناعي.", "تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى."],
      "bad-key": ["لم يقبل النموذج المفتاح.", "تحقّق من المفتاح في الإعدادات ← متقدّم."],
      "not-found": ["لم يُعثر على النموذج في عنوانه.", "تحقّق من إعدادات النموذج في الإعدادات ← متقدّم."],
      "rate-limited": ["بلغتَ حدّ اليوم لاستخدام النموذج.", "حاول لاحقًا."],
      server: ["يواجه النموذج مشكلة الآن.", "حاول بعد بضع دقائق."],
      "bad-response": ["أرسل النموذج إجابة لم أفهمها.", "حاول مرة أخرى. إذا تكرر ذلك، جرّب نموذجًا آخر."],
      unknown: ["حدث خطأ من جهتي.", "حاول مرة أخرى. ملفاتك بأمان، والتراجع ما زال يعمل."],
    },
  },
};

/** Told to the model (not the person) when the person declines an action. */
const DENIED = "The person said no to this. Don't try it again; continue without it, or explain what you need and why.";

function systemPrompt(lang: Language, root: string) {
  return [
    "You are Enceladus, a friendly agent that does real work on the person's Windows computer, inside one task folder:",
    root,
    "",
    "The person is usually not a programmer. Rules:",
    `- Write to the person in ${lang === "ar" ? "Arabic (Modern Standard Arabic)" : "English"}. Use plain words and short sentences. No jargon; if a technical word is unavoidable, explain it in a few words.`,
    "- For anything with more than one step, first call update_plan with a short checklist in plain words, then keep it updated (mark the current step active, finished steps done).",
    "- Work only inside the task folder, using relative paths. Don't try to reach other folders.",
    "- Check your own work before saying it's done: read files back, run the program or its tests when you can, and fix problems you find.",
    "- Be honest. If something failed or you couldn't do it, say so plainly and say what the person can try.",
    "- Do the work yourself with the tools. Never ask the person to run commands or edit files.",
    "- Before asking to run a command, make sure it's needed. Give a plain reason the person will understand.",
    "- When you're finished, write a short summary: what you made or changed, and where it is.",
    "",
    `Today is ${new Date().toDateString()}. Commands run in Windows PowerShell.`,
  ].join("\n");
}

export class AgentSession implements AgentRun {
  private listeners = new Set<(e: AgentEvent) => void>();
  private pending = new Map<string, (allowed: boolean) => void>();
  private controller = new AbortController();
  private readonly opts: SessionOptions;
  /** The full conversation, including this run (pass it as `history` for a follow-up). */
  readonly messages: ChatMessage[];
  /** Resolves when the run ends, for any reason. */
  readonly finished: Promise<void>;

  constructor(prompt: string, opts: SessionOptions) {
    this.opts = opts;
    this.messages = [...(opts.history ?? []), { role: "user", content: prompt }];
    // Start on the next tick so callers can subscribe first.
    this.finished = new Promise<void>((r) => setTimeout(r, 0)).then(() => this.run());
  }

  onEvent(listener: (e: AgentEvent) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  respond(requestId: string, allowed: boolean) { this.pending.get(requestId)?.(allowed); this.pending.delete(requestId); }
  stop() { this.controller.abort(); for (const answer of this.pending.values()) answer(false); this.pending.clear(); }

  private emit(e: AgentEvent) { for (const l of this.listeners) l(e); }

  private ask(e: Omit<Extract<AgentEvent, { type: "permission" }>, "type" | "requestId">): Promise<boolean> {
    const requestId = `ask-${Date.now().toString(36)}-${this.pending.size}`;
    return new Promise((resolve) => {
      this.pending.set(requestId, resolve);
      this.emit({ type: "permission", requestId, ...e });
    });
  }

  private async run() {
    const { connection, workspace, checkpoints, language } = this.opts;
    const s = S[language];
    const signal = this.controller.signal;
    const system = systemPrompt(language, workspace.root);
    const maxTurns = this.opts.maxTurns ?? 40;

    try {
      for (let turn = 0; turn < maxTurns; turn++) {
        if (signal.aborted) throw new DOMException("stopped", "AbortError");
        this.emit({ type: "status", phase: "thinking", text: s.thinking });

        const id = `msg-${Date.now().toString(36)}-${turn}`;
        let text = "";
        const calls: ToolCall[] = [];
        for await (const ev of streamChat(connection, { system, messages: this.messages, tools: TOOLS, maxTokens: 8192 }, signal)) {
          if (ev.type === "text") { text += ev.text; this.emit({ type: "message-delta", id, text: ev.text }); }
          else if (ev.type === "tool-call") calls.push(ev.call);
        }
        if (text) this.emit({ type: "message-done", id });
        this.messages.push({ role: "assistant", content: text, ...(calls.length ? { toolCalls: calls } : {}) });

        if (!calls.length) {
          this.emit({ type: "done", summary: s.finished });
          return;
        }

        // One Rewind point per model turn, made just before its first change.
        let checkpointMade = false;
        for (const call of calls) {
          let args: Record<string, unknown> = {};
          try { args = call.arguments ? JSON.parse(call.arguments) : {}; } catch {
            this.messages.push({ role: "tool", toolCallId: call.id, content: "Your arguments were not valid JSON. Send the call again with valid JSON.", isError: true });
            continue;
          }
          if (signal.aborted) throw new DOMException("stopped", "AbortError");

          const risk = riskOf(call.name, args);
          if (risk !== "safe") {
            const allowed = await this.ask({ level: risk, ...permissionText(language, call.name, args) });
            if (!allowed) {
              if (signal.aborted) throw new DOMException("stopped", "AbortError");
              this.messages.push({ role: "tool", toolCallId: call.id, content: DENIED, isError: true });
              continue;
            }
          }

          const what = workingText(language, call.name, args);
          if (call.name !== "update_plan") this.emit({ type: "status", phase: "working", text: what });
          try {
            const result = await runTool(call.name, args, {
              workspace, checkpoints, language, signal,
              ensureCheckpoint: async () => {
                if (checkpointMade) return;
                checkpointMade = true;
                const cp = await checkpoints.create(s.before.replace("{what}", what));
                this.emit({ type: "checkpoint", ...cp });
              },
              onPlan: (title, steps) => this.emit({ type: "plan", title, steps }),
            });
            if (result.activity) this.emit({ type: "activity", ...result.activity });
            this.messages.push({ role: "tool", toolCallId: call.id, content: result.output, ...(result.isError ? { isError: true } : {}) });
          } catch (e) {
            if ((e as Error).name === "AbortError") throw e;
            const message = (e as Error).message || String(e);
            this.emit({ type: "activity", ...failureActivity(language, call.name, args), details: message });
            this.messages.push({ role: "tool", toolCallId: call.id, content: `Error: ${message}`, isError: true });
          }
        }
      }
      this.emit({ type: "error", message: s.tooLong, suggestion: s.tooLongHint });
    } catch (e) {
      if ((e as Error).name === "AbortError" || signal.aborted) {
        this.emit({ type: "error", message: s.stopped, suggestion: s.stoppedHint });
        return;
      }
      const reason = e instanceof ProviderError ? e.reason : "unknown";
      const [message = "", suggestion] = s.errors[reason as keyof typeof s.errors] ?? s.errors.unknown;
      this.emit({ type: "error", message, suggestion });
    }
  }
}
