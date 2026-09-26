import { fileURLToPath, URL } from "url";

// Shared by vite.config.js and vitest.config.js. Both configs enable these
// aliases only in the explicit "development" mode (`npm run dev`,
// `npm run test:unit:sources`); every other build and the default
// `npm run test:unit` resolve the published exact pins from node_modules.

const resolveFromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export const PACKAGE_SOURCES_MODE = "development";

export const packageSourceAliases = [
  {
    find: "@iam3xtr/ui/styles/theme.scss",
    replacement: resolveFromRoot("./packages/ui/src/styles/theme.scss"),
  },
  {
    find: "@iam3xtr/ui/styles/tokens.scss",
    replacement: resolveFromRoot("./packages/ui/src/styles/tokens.scss"),
  },
  {
    find: "@iam3xtr/ui/icons",
    replacement: resolveFromRoot("./src/local-ui-icons.js"),
  },
  {
    find: "@iam3xtr/ui/assets",
    replacement: resolveFromRoot("./packages/ui/src/assets"),
  },
  {
    find: "@iam3xtr/vue/navigation",
    replacement: resolveFromRoot("./packages/vue/src/navigation.js"),
  },
  {
    find: "@iam3xtr/vue/plugin",
    replacement: resolveFromRoot("./packages/vue/src/plugin.js"),
  },
  {
    find: /^@iam3xtr\/vue$/,
    replacement: resolveFromRoot("./packages/vue/src/index.js"),
  },
  {
    find: /^@iam3xtr\/ui$/,
    replacement: resolveFromRoot("./packages/ui/src/index.js"),
  },
];

// packages/ui and packages/vue may carry their own node_modules while the
// libraries are being developed; the demo and the aliased sources must always
// share a single Vue/Router/Pinia/Buefy runtime.
export const sharedRuntimeDedupe = ["vue", "vue-router", "pinia", "buefy"];

export const packageSourceAliasesFor = (mode) =>
  mode === PACKAGE_SOURCES_MODE ? packageSourceAliases : [];
