import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ["tests/**/*.test.js"],
    // See the `spa` fixture's vitest.config.js for why this is needed:
    // `@iam3xtr/vue`'s entry point re-exports raw `.vue` SFCs.
    server: {
      deps: {
        inline: [/@iam3xtr\//],
      },
    },
  },
});
