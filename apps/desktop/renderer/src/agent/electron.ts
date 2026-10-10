// The real agent engine, running in the main process, reached through the bridge.
import type { AgentBridge } from "../bridge";
import type { AgentEngine, AgentEvent, AgentRun } from "./types";

/** One engine per task: follow-ups in the same task continue its conversation and folder. */
export function electronEngine(agent: AgentBridge, taskId: string): AgentEngine {
  let lastLanguage: "en" | "ar" = "en";
  return {
    start(prompt, { language, folder, attachments, check, retry }) {
      lastLanguage = language;
      const listeners = new Set<(e: AgentEvent) => void>();
      let runId: string | null = null;
      // Events can arrive before start() tells us our runId: hold them until then.
      const early: [string, AgentEvent][] = [];
      const queued: (() => void)[] = [];
      const deliver = (e: AgentEvent) => listeners.forEach((l) => l(e));

      const unsubscribe = agent.onEvent((rid, e) => {
        if (runId === null) early.push([rid, e]);
        else if (rid === runId) deliver(e);
      });

      agent.start({ taskId, prompt, language, folder, attachments, check, retry }).then((r) => {
        runId = r.runId;
        for (const [rid, e] of early.splice(0)) if (rid === runId) deliver(e);
        queued.splice(0).forEach((fn) => fn());
      }, () => {
        deliver({ type: "error", message: language === "ar" ? "تعذّر بدء المهمة." : "The task couldn’t start.", suggestion: language === "ar" ? "حاول مرة أخرى." : "Try again." });
      });

      const whenStarted = (fn: () => void) => (runId ? fn() : queued.push(fn));
      const run: AgentRun = {
        onEvent(listener) { listeners.add(listener); return () => { listeners.delete(listener); if (!listeners.size) unsubscribe(); }; },
        respond(requestId, allowed, remember) { whenStarted(() => void agent.respond({ runId: runId!, requestId, allowed, remember })); },
        stop() { whenStarted(() => void agent.stop({ runId: runId! })); },
      };
      return run;
    },
    restore(checkpointId) {
      return agent.restore({ taskId, checkpointId, language: lastLanguage });
    },
  };
}
