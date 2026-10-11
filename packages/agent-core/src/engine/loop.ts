// The agent loop: ask the model, run the tools it asks for (with permission where needed),
// feed the results back, repeat until it answers without tools.
import { streamChat } from "../providers/index.ts";
import { ProviderError } from "../providers/types.ts";
import type { ChatMessage, ContentPart, ModelConnection, ToolCall } from "../providers/types.ts";
import type { AgentEvent, AgentRun, Language } from "./events.ts";
import type { Checkpoints } from "./checkpoints.ts";
import type { Workspace } from "./workspace.ts";
import { TOOLS, checkpointLabel, failureActivity, permissionText, riskOf, runTool, workingText } from "./tools.ts";

export interface SessionOptions {
  /** "Allow for this task": careful requests from these tools run without asking. Risky ones always ask. */
  preApproved?: (tool: string) => boolean;
  /** "Check the result" (default true). */
  check?: boolean;
  /** How much to explain (default "full"). */
  detail?: "full" | "short";
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
    thinking: "Thinking", finished: "Finished.",
    stopped: "Stopped. Nothing else will change.", stoppedHint: "You can continue whenever you like.",
    tooLong: "I’ve taken a lot of steps without finishing, so I stopped to be safe.", tooLongHint: "Tell me what to focus on, and I’ll continue from here.",
    errors: {
      "no-network": ["I couldn’t reach the AI model.", "Check your internet connection, then try again."],
      "bad-key": ["The AI model didn’t accept the key.", "Check the key in Settings → Advanced."],
      "not-found": ["The AI model’s address didn’t answer.", "Check the address in Settings → Advanced."],
      "model-unavailable": ["This AI model isn’t available with your key.", "Pick another model in Settings → Advanced. Some models in the list need a paid plan."],
      "no-tools": ["This AI model can’t use tools, and I need them to work on files.", "Pick another model in Settings → Advanced."],
      "too-long": ["This conversation is too long for the AI model.", "Start a new task, or ask me to sum up what we did so far."],
      "rate-limited": ["You’ve reached today’s limit for the AI model.", "Try again later."],
      server: ["The AI model is having trouble right now.", "Try again in a few minutes."],
      "bad-response": ["The AI model turned down the request.", "Try again. If it keeps happening, pick another model in Settings → Advanced."],
      unknown: ["Something went wrong on my side.", "Try again. Your files are safe, and Rewind still works."],
    },
  },
  ar: {
    thinking: "أفكّر", finished: "انتهيت.",
    stopped: "توقفتُ. لن يتغير شيء آخر.", stoppedHint: "يمكنك المتابعة متى شئت.",
    tooLong: "قمتُ بخطوات كثيرة دون أن أنتهي، فتوقفتُ احتياطًا.", tooLongHint: "أخبرني بما أركّز عليه، وسأتابع من هنا.",
    errors: {
      "no-network": ["تعذّر الوصول إلى نموذج الذكاء الاصطناعي.", "تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى."],
      "bad-key": ["لم يقبل النموذج المفتاح.", "تحقّق من المفتاح في الإعدادات ← متقدّم."],
      "not-found": ["لم يستجب عنوان النموذج.", "تحقّق من العنوان في الإعدادات ← متقدّم."],
      "model-unavailable": ["هذا النموذج غير متاح بمفتاحك.", "اختر نموذجًا آخر في الإعدادات ← متقدّم. بعض النماذج في القائمة تحتاج إلى خطة مدفوعة."],
      "no-tools": ["هذا النموذج لا يستطيع استخدام الأدوات، وأنا أحتاجها للعمل على الملفات.", "اختر نموذجًا آخر في الإعدادات ← متقدّم."],
      "too-long": ["هذه المحادثة أطول مما يستطيع النموذج قراءته.", "ابدأ مهمة جديدة، أو اطلب مني تلخيص ما أنجزناه حتى الآن."],
      "rate-limited": ["بلغتَ حدّ اليوم لاستخدام النموذج.", "حاول لاحقًا."],
      server: ["يواجه النموذج مشكلة الآن.", "حاول بعد بضع دقائق."],
      "bad-response": ["رفض النموذج الطلب.", "حاول مرة أخرى. إذا تكرر ذلك، اختر نموذجًا آخر في الإعدادات ← متقدّم."],
      unknown: ["حدث خطأ من جهتي.", "حاول مرة أخرى. ملفاتك بأمان، والتراجع ما زال يعمل."],
    },
  },
};

/** Told to the model (not the person) when the person declines an action. */
const DENIED = "The person said no to this. Don't try it again; continue without it, or explain what you need and why.";

function systemPrompt(lang: Language, root: string, check: boolean, detail: "full" | "short") {
  return [
    "You are Enceladus, a friendly agent that does real work on the person's Windows computer, inside one task folder:",
    root,
    "",
    "The person is usually not a programmer. Rules:",
    `- Write to the person in ${lang === "ar" ? "Arabic (Modern Standard Arabic)" : "English"}. Use plain words and short sentences. No jargon; if a technical word is unavoidable, explain it in a few words.`,
    "- If the request is vague or a key detail is missing (what it's for, who it's for, the style, the content), first ask one short question with ask_user, giving 2 to 4 clickable answers with your recommendation first. Ask at most 2 questions per request, one at a time. If the request is already clear, don't ask: just start.",
    "- For anything with more than one step, first call update_plan with a short checklist in plain words. Keep it updated as you go: mark a step done as soon as it's finished and the next one active, in the same reply as your next action. Don't save all the ticks for the end.",
    "- While working, say little: at most one short sentence before a group of actions, or nothing. Save explanations for the final summary, and don't repeat there what you already said.",
    "- Work only inside the task folder, using relative paths. Don't try to reach other folders, not even with commands. If the person asks for a file somewhere else (like the Desktop), make it in the task folder, tell them where it is, and explain that they can pick another folder for a task on the home screen. Only Rewind protects the task folder.",
    "- To move or rename files, use move_file (the person can undo it). Don't use commands for moving, renaming or deleting files.",
    check
      ? "- Check your own work before saying it's done: read files back, run the program or its tests when you can, and fix problems you find."
      : "- The person asked you to be quick: don't spend extra steps re-reading or testing your work. Only check something if it looks wrong. Say in your summary that you didn't test it.",
    "- Be honest. If something failed or you couldn't do it, say so plainly and say what the person can try.",
    "- Do the work yourself with the tools. Never ask the person to run commands or edit files.",
    "- Before asking to run a command, make sure it's needed. Give a plain reason the person will understand.",
    "- The app shows web pages from the task folder in a live preview next to the chat, and refreshes it when files change. Don't open browsers or start web servers to show a page; just say it's in the preview.",
    "- Every request needs model calls, so be efficient: group related small edits, and don't re-check work that already passed.",
    detail === "short"
      ? "- The person asked for short answers: reply in one or two sentences plus, if files changed, a very short list of them. Explain more only if they ask."
      : "- Explain what you did in a way a beginner understands: what you made, where it is, and how to use or open it.",
    "- When you're finished, write a short summary: what you made or changed, and where it is. Formatting: short paragraphs, simple lists, **bold** for key words. No headings, no tables.",
    `- End your final summary with one last line: "NEXT: " followed by 3 short follow-up requests the person might want, separated by " | ", in ${lang === "ar" ? "Arabic" : "English"}, at most 7 words each, written as the person would type them. The app turns this line into buttons and hides it.`,
    "",
    `Today is ${new Date().toDateString()}. Commands run in Windows PowerShell.`,
  ].join("\n");
}

export class AgentSession implements AgentRun {
  private listeners = new Set<(e: AgentEvent) => void>();
  private pending = new Map<string, (allowed: boolean) => void>();
  private questions = new Map<string, (text: string | null) => void>();
  private controller = new AbortController();
  private readonly opts: SessionOptions;
  /** The full conversation, including this run (pass it as `history` for a follow-up). */
  readonly messages: ChatMessage[];
  /** Resolves when the run ends, for any reason. */
  readonly finished: Promise<void>;

  /** `prompt` is text, or text plus images (attachments the model can look at). */
  constructor(prompt: string | ContentPart[], opts: SessionOptions) {
    this.opts = opts;
    this.messages = [...(opts.history ?? []), { role: "user", content: prompt }];
    // Start on the next tick so callers can subscribe first.
    this.finished = new Promise<void>((r) => setTimeout(r, 0)).then(() => this.run());
  }

  onEvent(listener: (e: AgentEvent) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  respond(requestId: string, allowed: boolean) { this.pending.get(requestId)?.(allowed); this.pending.delete(requestId); }
  answer(requestId: string, text: string) { this.questions.get(requestId)?.(text); this.questions.delete(requestId); }
  stop() {
    this.controller.abort();
    for (const answer of this.pending.values()) answer(false);
    this.pending.clear();
    for (const answer of this.questions.values()) answer(null);
    this.questions.clear();
  }

  private emit(e: AgentEvent) { for (const l of this.listeners) l(e); }

  private ask(e: Omit<Extract<AgentEvent, { type: "permission" }>, "type" | "requestId">): Promise<boolean> {
    const requestId = `ask-${Date.now().toString(36)}-${this.pending.size}`;
    return new Promise((resolve) => {
      this.pending.set(requestId, resolve);
      this.emit({ type: "permission", requestId, ...e });
    });
  }

  private question(question: string, options: string[]): Promise<string | null> {
    const requestId = `q-${Date.now().toString(36)}-${this.questions.size}`;
    return new Promise((resolve) => {
      this.questions.set(requestId, resolve);
      this.emit({ type: "question", requestId, question, options });
    });
  }

  private async run() {
    const { connection, workspace, checkpoints, language } = this.opts;
    const s = S[language];
    const signal = this.controller.signal;
    const system = systemPrompt(language, workspace.root, this.opts.check !== false, this.opts.detail === "short" ? "short" : "full");
    const maxTurns = this.opts.maxTurns ?? 40;

    try {
      // One Rewind point per request from the person, made just before the first change.
      let checkpointMade = false;
      for (let turn = 0; turn < maxTurns; turn++) {
        if (signal.aborted) throw new DOMException("stopped", "AbortError");
        this.emit({ type: "status", phase: "thinking", text: s.thinking });

        const id = `msg-${Date.now().toString(36)}-${turn}`;
        let text = "";
        let lastStatus = "";
        let thought = 0;
        let usage: { inputTokens?: number; outputTokens?: number } | undefined;
        const started = Date.now();
        const calls: ToolCall[] = [];
        for await (const ev of streamChat(connection, { system, messages: this.messages, tools: TOOLS, maxTokens: 8192 }, signal)) {
          if (ev.type === "text") { text += ev.text; this.emit({ type: "message-delta", id, text: ev.text }); }
          else if (ev.type === "reasoning") { thought += ev.text.length; this.emit({ type: "thinking-delta", text: ev.text }); }
          else if (ev.type === "done") usage = ev.usage;
          else if (ev.type === "tool-call") calls.push(ev.call);
          else if (ev.type === "tool-progress" && ev.name !== "update_plan") {
            // Long file writes stream for a while: say what's happening instead of "Thinking".
            const path = ev.partial.match(/"path"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
            const working = workingText(language, ev.name, path ? { path: path.replace(/\\\\/g, "\\") } : {});
            if (working !== lastStatus) { lastStatus = working; this.emit({ type: "status", phase: "working", text: working }); }
          }
        }
        if (text) this.emit({ type: "message-done", id });
        // About 4 characters per token when the server doesn't report usage.
        const estimated = !usage?.inputTokens;
        const inputTokens = usage?.inputTokens ?? Math.round((system.length + JSON.stringify(this.messages).length) / 4);
        const outputTokens = usage?.outputTokens ?? Math.round((text.length + thought + calls.reduce((n, c) => n + c.arguments.length, 0)) / 4);
        this.emit({ type: "usage", inputTokens, outputTokens, estimated, ms: Date.now() - started });
        this.messages.push({ role: "assistant", content: text, ...(calls.length ? { toolCalls: calls } : {}) });

        if (!calls.length) {
          this.emit({ type: "done", summary: s.finished });
          return;
        }

        for (const call of calls) {
          let args: Record<string, unknown> = {};
          try { args = call.arguments ? JSON.parse(call.arguments) : {}; } catch {
            this.messages.push({ role: "tool", toolCallId: call.id, content: "Your arguments were not valid JSON. Send the call again with valid JSON.", isError: true });
            continue;
          }
          if (signal.aborted) throw new DOMException("stopped", "AbortError");

          const risk = riskOf(call.name, args);
          if (risk !== "safe" && !(risk === "careful" && this.opts.preApproved?.(call.name))) {
            const allowed = await this.ask({ level: risk, ...permissionText(language, call.name, args), ...(risk === "careful" ? { tool: call.name } : {}) });
            if (!allowed) {
              if (signal.aborted) throw new DOMException("stopped", "AbortError");
              this.messages.push({ role: "tool", toolCallId: call.id, content: DENIED, isError: true });
              continue;
            }
          }

          // A question for the person: wait for their answer, which becomes the tool's result.
          if (call.name === "ask_user") {
            const q = String(args.question ?? "").trim();
            const options = (Array.isArray(args.options) ? args.options : []).map(optionText).filter(Boolean).slice(0, 4);
            if (!q) { this.messages.push({ role: "tool", toolCallId: call.id, content: "Ask a question (the question field was empty).", isError: true }); continue; }
            const answer = await this.question(q, options);
            if (answer === null || signal.aborted) throw new DOMException("stopped", "AbortError");
            this.messages.push({ role: "tool", toolCallId: call.id, content: `The person answered: ${answer}` });
            continue;
          }

          const what = workingText(language, call.name, args);
          if (call.name !== "update_plan") this.emit({ type: "status", phase: "working", text: what });
          try {
            const result = await runTool(call.name, args, {
              workspace, checkpoints, language, signal,
              ensureCheckpoint: async () => {
                if (checkpointMade) return;
                checkpointMade = true;
                const cp = await checkpoints.create(checkpointLabel(language, call.name, args));
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
      this.emit({ type: "error", message, suggestion, ...(e instanceof Error && e.message ? { details: e.message } : {}) });
    }
  }
}

/** An answer option as text, however the model shaped it ("Shop", or { label: "Shop", ... }). */
export function optionText(o: unknown): string {
  if (typeof o === "string" || typeof o === "number") return String(o).trim();
  if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    for (const k of ["label", "text", "title", "option", "value", "name", "answer"]) if (typeof r[k] === "string" && (r[k] as string).trim()) return (r[k] as string).trim();
  }
  return "";
}
