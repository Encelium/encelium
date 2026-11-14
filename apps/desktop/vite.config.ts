import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Strict Content Security Policy for the shipped app. Not used in development,
// where Vite needs inline scripts and a websocket for live reload.
const csp: Plugin = {
  name: "encelium-csp",
  apply: "build",
  transformIndexHtml: () => [{
    tag: "meta",
    attrs: { "http-equiv": "Content-Security-Policy", content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: encelium-preview:; font-src 'self' data:; connect-src 'self'; frame-src encelium-preview:" },
    injectTo: "head-prepend",
  }],
};

export default defineConfig({
  root: fileURLToPath(new URL("./renderer", import.meta.url)),
  base: "./", // the built app is loaded from disk, so asset paths must be relative
  plugins: [react(), csp],
  build: { outDir: fileURLToPath(new URL("./dist", import.meta.url)), emptyOutDir: true },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
});
