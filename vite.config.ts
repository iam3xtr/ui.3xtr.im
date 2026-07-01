import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],

  css: {
    preprocessorOptions: {
      scss: {
        // Современный Dart Sass API.
        api: "modern-compiler",
        // global-builtin и if-function исходят из самой Bulma
        // (unquote() и устаревший синтаксис if()), это её внутренний
        // код, который мы не контролируем.
        silenceDeprecations: ["global-builtin", "if-function"],
      },
    },
  },
});
