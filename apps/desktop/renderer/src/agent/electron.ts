// The real agent engine, running in the main process, reached through the bridge.
import type { AgentBridge } from "../bridge";
import type { AgentEngine, AgentEvent, AgentRun } from "./types";

/**
 * One engine per task: follow-ups in the same task continue its conversation and folder.
 * A run keeps going when its chat isn't on screen; coming back attaches to it with active().
 */
export function electronEngine(agent: AgentBridge, taskId: string): AgentEngine {
  let lastLanguage: "en" | "ar" = "en";
  let live: AgentRun | null = null;
  return {
    start(prompt, { language, folder, attachments, check, retry, pointed, detail, folderName }) {
      lastLanguage = language;
      const listeners = new Set<(e: AgentEvent) => void>();
      let runId: string | null = null;
      // Events can arrive before start() tells us our runId: hold them until then.
      const early: [string, AgentEvent][] = [];
      const queued: (() => void)[] = [];
      const deliver = (e: AgentEvent) => {
        listeners.forEach((l) => l(e));
        // The run is over: nothing to attach to any more. Keep listening a little longer for
        // what comes after "done" (the "What next?" suggestions), then stop.
        if (e.type === "done" || e.type === "error") { if (live === run) live = null; setTimeout(unsubscribe, 120_000); }
        if (e.type === "suggestions") unsubscribe();
      };

      // Listen for the whole run (not just while a screen shows it), so it can be re-attached.
      const unsubscribe = agent.onEvent((rid, e) => {
        if (runId === null) early.push([rid, e]);
        else if (rid === runId) deliver(e);
      });

      agent.start({ taskId, prompt, language, folder, attachments, check, retry, pointed, detail, folderName }).then((r) => {
        runId = r.runId;
        for (const [rid, e] of early.splice(0)) if (rid === runId) deliver(e);
        queued.splice(0).forEach((fn) => fn());
      }, () => {
        deliver({ type: "error", message: language === "ar" ? "تعذّر بدء المهمة." : "The task couldn’t start.", suggestion: language === "ar" ? "حاول مرة أخرى." : "Try again." });
      });

      const whenStarted = (fn: () => void) => (runId ? fn() : queued.push(fn));
      const run: AgentRun = {
        onEvent(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        respond(requestId, allowed, remember) { whenStarted(() => void agent.respond({ runId: runId!, requestId, allowed, remember })); },
        answer(requestId, text) { whenStarted(() => void agent.answer({ runId: runId!, requestId, text })); },
        stop() { whenStarted(() => void agent.stop({ runId: runId! })); },
      };
      live = run;
      return run;
    },
    active() {
      return live;
    },
    restore(checkpointId) {
      return agent.restore({ taskId, checkpointId, language: lastLanguage });
    },
  };
}
