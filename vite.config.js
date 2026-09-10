import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";

export default defineConfig({
  plugins: [vue(), svgLoader()],

  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },

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
