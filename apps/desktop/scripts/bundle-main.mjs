// Bundles the Electron main process (and the agent engine it uses, written in TypeScript) into
// one file, out/main.js, for the installed app. Node strips TypeScript types only outside
// node_modules, so the engine can't be loaded as-is from inside a packaged app.
// The preload script is copied next to it (main.js loads it from its own folder).
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  input: path.join(root, "electron", "main.js"),
  platform: "node",
  external: ["electron", /^node:/],
  output: { file: path.join(out, "main.js"), format: "esm", sourcemap: false },
  logLevel: "warn",
});
copyFileSync(path.join(root, "electron", "preload.cjs"), path.join(out, "preload.cjs"));
console.log("out/main.js and out/preload.cjs written");
