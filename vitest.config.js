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
    // Published @iam3xtr/vue exports SFC source files. Inline it (and its UI
    // companion) so Vite transforms those .vue imports instead of letting
    // Node externalize them as an unsupported extension.
    server: {
      deps: {
        inline: ["@iam3xtr/ui", "@iam3xtr/vue"],
      },
    },
    // Scope to this repo's own suite only (as `npm run test:unit` is
    // documented to do in CLAUDE.md). Without this, vitest's default include
    // glob also picks up `packages/ui/tests/**` and `packages/vue/tests/**`
    // whenever those git submodules have their own `node_modules` installed
    // (e.g. for a standalone `npm test` there) — those packages ship their
    // own `vitest.config.js` with different environments/deps, which this
    // root config does not apply, causing spurious failures unrelated to
    // this repo's own tests.
    include: ["tests/unit/**/*.test.js"],
  },
});
