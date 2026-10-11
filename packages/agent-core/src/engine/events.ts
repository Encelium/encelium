// The contract between the agent engine and the screen.
// The engine emits these events; the Work view only renders them.

export type StepStatus = "done" | "active" | "pending";
export type RiskLevel = "safe" | "careful" | "risky";
export type Language = "en" | "ar";

export type AgentEvent =
  /** What the agent is doing right now, in plain words ("Reading your files"). */
  | { type: "status"; phase: "thinking" | "working"; text: string }
  /** The plan, re-sent whenever a step changes. */
  | { type: "plan"; title: string; steps: { label: string; status: StepStatus }[] }
  /** Streaming text for the current assistant message. */
  | { type: "message-delta"; id: string; text: string }
  /** The assistant message is complete. */
  | { type: "message-done"; id: string }
  /** One model call: tokens used (estimated from text length if the server doesn't say) and the time it took. */
  | { type: "usage"; inputTokens: number; outputTokens: number; estimated: boolean; ms: number }
  /** The model's visible thinking, streamed live (only some models send it; not saved). */
  | { type: "thinking-delta"; text: string }
  /** The agent asks the person a short question, with clickable answers. Answer with answer(requestId, text). */
  | { type: "question"; requestId: string; question: string; options: string[] }
  /** The agent needs a yes/no before continuing. Answer with respond(requestId, allowed). */
  | { type: "permission"; requestId: string; level: RiskLevel; title: string; description: string; /** The exact command, shown only if the person asks. */ details?: string; allowLabel: string; denyLabel: string; /** The tool asking, so "Allow for this task" can remember it. Only for "careful" requests. */ tool?: string }
  /** A Rewind point was saved (before a change). */
  | { type: "checkpoint"; id: string; label: string; at: number }
  /** One line summary of a finished step, with optional technical details for "Show details". */
  | { type: "activity"; text: string; details?: string; /** A file this step created, changed, deleted or moved (for "What changed"). */ file?: FileChange }
  /** The task finished. */
  | { type: "done"; summary: string }
  /** After a finished task: short follow-ups the person might ask next (sent by the app, not the engine). */
  | { type: "suggestions"; items: string[] }
  /** Something failed. Always honest and in plain words, with what the user can try. */
  | { type: "error"; message: string; suggestion?: string; /** What the server actually said, for "Show details". */ details?: string };

export interface FileChange { path: string; change: "created" | "changed" | "deleted" | "moved"; to?: string }

export interface AgentRun {
  /** Subscribe to events. Returns an unsubscribe function. */
  onEvent(listener: (event: AgentEvent) => void): () => void;
  /** Answer a permission request. */
  /** `remember`: also allow this kind of request for the rest of the task ("careful" requests only). */
  respond(requestId: string, allowed: boolean, remember?: boolean): void;
  /** Answer a question (one of its options, or the person's own words). */
  answer?(requestId: string, text: string): void;
  /** Ask the agent to stop as soon as it safely can. */
  stop(): void;
}

export interface AgentEngine {
  /** Start a task from the user's words. `language` is the UI language, so the agent replies in it. */
  start(prompt: string, options: {
    language: Language;
    /** First run only: work in this folder instead of a new one. */
    folder?: string;
    /** Files the person attached; copied into the task folder, pictures shown to the model. */
    attachments?: { path: string; name: string; size: number; kind: "image" | "file" }[];
    /** "Check the result": the agent tests its own work (default). Off: faster, fewer requests. */
    check?: boolean;
    /** "Try again" after an error: the same request again, not a new message. */
    retry?: boolean;
    /** "Point at it": the part of the preview the person clicked (a short label to show, and details for the model). */
    pointed?: { label: string; context: string };
    /** How much to explain: "full" (default, good for beginners) or "short". */
    detail?: "full" | "short";
    /** First run only: a folder name to use (e.g. from a recipe), instead of asking the model. */
    folderName?: string;
  }): AgentRun;
  /** The run still going in this task (its chat was left while it worked), to attach to. */
  active?(): AgentRun | null;
  /** Put the task's files back the way they were at a Rewind point. Absent in the demo. */
  restore?(checkpointId: string): Promise<{ ok: true; /** The new "before going back" point, so going back can be undone. */ checkpoint?: { id: string; label: string; at: number } | null } | { ok: false; message: string }>;
}
