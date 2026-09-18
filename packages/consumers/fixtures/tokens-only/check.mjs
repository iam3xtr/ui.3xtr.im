// Tokens-only consumer: proves the "tokens remain runtime-independent"
// acceptance criterion from Task A11.5 — this fixture never installs vue,
// buefy or bulma, so a successful `npm install` here already proves
// `@iam3xtr/ui`'s tokens/theme split does not pull them in as hard
// dependencies. This script additionally checks the compiled CSS resolves
// and looks like a real token sheet, and that no Vue/Buefy/Bulma package
// slipped into node_modules transitively. Reused for Issue #8.1 (the
// bundler-neutral icon registry): this fixture's plain Node script, with no
// Vite/webpack in the loop at all, is the strictest place to prove
// `@iam3xtr/ui/icons` needs no bundler-specific loader.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);

const tokensCssPath = require.resolve("@iam3xtr/ui/styles/tokens.css");
const css = readFileSync(tokensCssPath, "utf8");

if (!css.includes("--tr-")) {
  throw new Error(`tokens.css at ${tokensCssPath} does not define any --tr-* custom property`);
}

// Issue #8.1: the custom-SVG registry resolves as plain Node ESM from a
// packed tarball too — no Vite, no `vite-svg-loader`, no `@/assets` alias,
// no deep import into the package's `src/`. A plain `import()` of the
// documented public export is the whole contract.
const { icons } = await import("@iam3xtr/ui/icons");
if (typeof icons !== "object" || icons === null) {
  throw new Error("@iam3xtr/ui/icons did not export an `icons` object");
}
const iconNames = Object.keys(icons);
if (iconNames.length === 0) {
  throw new Error("@iam3xtr/ui/icons exported an empty registry");
}
for (const [name, markup] of Object.entries(icons)) {
  if (typeof markup !== "string" || !markup.includes("<svg")) {
    throw new Error(`icons["${name}"] is not raw SVG markup: ${JSON.stringify(markup).slice(0, 80)}`);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const forbidden = ["vue", "buefy", "bulma"];
for (const name of forbidden) {
  const dir = path.join(here, "node_modules", name);
  if (existsSync(dir)) {
    throw new Error(`tokens-only consumer unexpectedly has ${name} installed at ${dir}`);
  }
}

console.log(
  `OK: tokens.css resolved (${css.length} bytes), ${iconNames.length} icons registered, no vue/buefy/bulma present`,
);
