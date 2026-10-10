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
  /** The agent needs a yes/no before continuing. Answer with respond(requestId, allowed). */
  | { type: "permission"; requestId: string; level: RiskLevel; title: string; description: string; /** The exact command, shown only if the person asks. */ details?: string; allowLabel: string; denyLabel: string }
  /** A Rewind point was saved (before a change). */
  | { type: "checkpoint"; id: string; label: string; at: number }
  /** One line summary of a finished step, with optional technical details for "Show details". */
  | { type: "activity"; text: string; details?: string }
  /** The task finished. */
  | { type: "done"; summary: string }
  /** Something failed. Always honest and in plain words, with what the user can try. */
  | { type: "error"; message: string; suggestion?: string };

export interface AgentRun {
  /** Subscribe to events. Returns an unsubscribe function. */
  onEvent(listener: (event: AgentEvent) => void): () => void;
  /** Answer a permission request. */
  respond(requestId: string, allowed: boolean): void;
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
  }): AgentRun;
  /** Put the task's files back the way they were at a Rewind point. Absent in the demo. */
  restore?(checkpointId: string): Promise<{ ok: true; /** The new "before going back" point, so going back can be undone. */ checkpoint?: { id: string; label: string; at: number } | null } | { ok: false; message: string }>;
}
