import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    // Vitest externalizes node_modules by default (they're required/imported
    // directly by Node instead of going through Vite's transform pipeline),
    // which breaks on a raw `.vue` SFC. `@iam3xtr/vue` ships `.vue` files as
    // its public entry point (see its own README), so a real consumer must
    // opt it back into the transform pipeline — exactly like this fixture's
    // own `vite.config.js`/build already does implicitly via the plugin.
    server: {
      deps: {
        inline: [/@iam3xtr\//],
      },
    },
  },
});
