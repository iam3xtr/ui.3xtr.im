#!/usr/bin/env node
// Guard: fails when any src/**/*.vue file still contains a <style block.
//
// Stage A2 requires all component styling to live in the managed stylesheet
// (packages/ui's trickster-buefy.scss / theme.scss since Task A11.4) — no
// <style> blocks in Vue components. This script needs no network access; it
// only walks the local filesystem.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const srcDir = join(root, "src");

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, files);
    } else if (entry.endsWith(".vue")) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

for (const file of walk(srcDir)) {
  const content = readFileSync(file, "utf8");
  if (/<style\b/.test(content)) {
    violations.push(relative(root, file));
  }
}

if (violations.length > 0) {
  console.error("no-component-styles: found <style> blocks outside the managed stylesheet:");
  for (const file of violations) {
    console.error(`  - ${file}`);
  }
  console.error(
    `\n${violations.length} file(s) violate Stage A2: move component rules into packages/ui's trickster-buefy.scss/theme.scss.`
  );
  process.exit(1);
}

console.log("no-component-styles: OK — no <style> blocks found in src/**/*.vue.");
