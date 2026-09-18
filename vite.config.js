import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";

export default defineConfig(({ mode }) => {
  // Issue #14.1: только явный, отдельно называемый Pages-режим включает Vue
  // Devtools inspection в production build (`npm run build:pages`, тот же
  // режим использует .github/workflows/deploy-pages.yml). Обычный
  // `npm run build` (mode "production") и публикуемые package artifacts
  // packages/ui и packages/vue этот define не трогают и явно остаются
  // false — никакого in-DOM devtools UI, remote server, open-editor
  // endpoint или secret это не добавляет, только флаг, который читает
  // сама библиотека Vue при подключении browser extension.
  const enableProdDevtools = mode === "pages";
  // Локальная разработка кита должна сразу отражать изменения в обоих
  // submodule-пакетах. Это намеренно ограничено dev server: build и
  // build:pages по-прежнему проверяют ровно те tarball/registry exports,
  // которые получает downstream-потребитель.
  const usePackageSources = mode === "development";
  const packageAliases = usePackageSources
    ? [
        {
          find: "@iam3xtr/ui/styles/theme.scss",
          replacement: fileURLToPath(new URL("./packages/ui/src/styles/theme.scss", import.meta.url)),
        },
        {
          find: "@iam3xtr/ui/styles/tokens.scss",
          replacement: fileURLToPath(new URL("./packages/ui/src/styles/tokens.scss", import.meta.url)),
        },
        {
          find: "@iam3xtr/ui/icons",
          replacement: fileURLToPath(new URL("./src/local-ui-icons.js", import.meta.url)),
        },
        {
          find: "@iam3xtr/ui/assets",
          replacement: fileURLToPath(new URL("./packages/ui/src/assets", import.meta.url)),
        },
        {
          find: "@iam3xtr/vue/navigation",
          replacement: fileURLToPath(new URL("./packages/vue/src/navigation.js", import.meta.url)),
        },
        {
          find: "@iam3xtr/vue/plugin",
          replacement: fileURLToPath(new URL("./packages/vue/src/plugin.js", import.meta.url)),
        },
        {
          find: /^@iam3xtr\/vue$/,
          replacement: fileURLToPath(new URL("./packages/vue/src/index.js", import.meta.url)),
        },
        {
          find: /^@iam3xtr\/ui$/,
          replacement: fileURLToPath(new URL("./packages/ui/src/index.js", import.meta.url)),
        },
      ]
    : [];

  return {
    plugins: [
      vue(),
      svgLoader(),
    ],

    define: {
      __VUE_PROD_DEVTOOLS__: enableProdDevtools,
    },

    build: {
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL("./index.html", import.meta.url)),
          404: fileURLToPath(new URL("./404.html", import.meta.url)),
        },
      },
    },

    resolve: {
      alias: [
        ...packageAliases,
        { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      ],
      // packages/vue может иметь собственный node_modules во время работы
      // над библиотекой; приложение и локальные исходники всегда должны
      // разделять один Vue/Buefy runtime.
      dedupe: ["vue", "vue-router", "buefy"],
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
  };
});
