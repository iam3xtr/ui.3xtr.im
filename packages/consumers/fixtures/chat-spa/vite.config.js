import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

// Isolated Chat-target consumer: one Vue SPA (no Nuxt, no custom server, no
// Router) built as two static pages - the app itself (standalone, or embedded
// when loaded inside an iframe) and a plain host page that frames it. No alias
// back into the kit or the package submodules.
export default defineConfig({
  base: "./",
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        host: fileURLToPath(new URL("./host.html", import.meta.url)),
      },
    },
  },
});
