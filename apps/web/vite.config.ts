import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The launch site: static pages (landing + contact), served from anywhere.
export default defineConfig({
  plugins: [react()],
  server: { port: 5175, host: "127.0.0.1" },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        contact: fileURLToPath(new URL("contact.html", import.meta.url)),
      },
    },
  },
});
