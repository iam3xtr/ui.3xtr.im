// Tokens-only consumer: proves the "tokens remain runtime-independent"
// acceptance criterion from Task A11.5 — this fixture never installs vue,
// buefy or bulma, so a successful `npm install` here already proves
// `@iam3xtr/ui`'s tokens/theme split does not pull them in as hard
// dependencies. This script additionally checks the compiled CSS resolves
// and looks like a real token sheet, and that no Vue/Buefy/Bulma package
// slipped into node_modules transitively.
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

const here = path.dirname(fileURLToPath(import.meta.url));
const forbidden = ["vue", "buefy", "bulma"];
for (const name of forbidden) {
  const dir = path.join(here, "node_modules", name);
  if (existsSync(dir)) {
    throw new Error(`tokens-only consumer unexpectedly has ${name} installed at ${dir}`);
  }
}

console.log(`OK: tokens.css resolved (${css.length} bytes), no vue/buefy/bulma present`);
