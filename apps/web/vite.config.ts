import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The launch site: one static page, served from anywhere (no server code).
export default defineConfig({
  plugins: [react()],
  server: { port: 5175, host: "127.0.0.1" },
  build: { outDir: "dist" },
});
