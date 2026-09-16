import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Isolated consumer fixture: no alias/resolve tricks back into the kit or the
// packages/* submodules — every import below must resolve purely through
// this fixture's own node_modules, exactly like a real downstream app.
export default defineConfig({
  plugins: [vue()],
  build: {
    // Keep the report script's duplicate-runtime check simple: a single chunk.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
