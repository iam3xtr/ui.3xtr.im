import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    // `@iam3xtr/vue` ships raw `.vue` SFCs: a consumer opts it into the
    // transform pipeline, exactly like vite.config.js does implicitly.
    server: { deps: { inline: [/@iam3xtr\//] } },
  },
});
