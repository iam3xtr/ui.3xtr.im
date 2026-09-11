import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";

// Separate from `vite.config.js` (Task A6.3): the app build has no reason to
// carry a `test` block or an `environment: "jsdom"` dependency, mirroring
// `get.3xtr.im/vitest.config.js`. `svgLoader()` is needed here too (Stage A6
// review fix) — `Loader.vue` (mounted by any screen that uses
// `useSimulatedLoading`, e.g. `Agents.vue`) imports `.svg` files as Vue
// components; without this plugin vitest resolves them as raw asset URLs and
// `<component :is="...">` throws trying to use the data: URI as a tag name.
export default defineConfig({
  plugins: [vue(), svgLoader()],

  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },

  test: {
    environment: "jsdom",
  },
});
