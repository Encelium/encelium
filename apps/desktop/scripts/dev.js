// Development: start the Vite dev server, then open Electron pointed at it.
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// strictPort off: if 5174 is busy (another copy, another program), use the next free port.
const server = await createServer({ configFile: path.join(root, "vite.config.ts"), server: { strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0];
console.log(`Renderer: ${url}`);

const electron = createRequire(import.meta.url)("electron"); // path to the Electron binary
const child = spawn(electron, ["."], { cwd: root, stdio: "inherit", env: { ...process.env, ENCELADUS_DEV_URL: url } });
child.on("exit", async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
