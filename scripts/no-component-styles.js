#!/usr/bin/env node
// Guard: fails when any src/**/*.vue file contains a <style block, except a
// documented, scoped kit-only override.
//
// Stage A2 requires all component styling to live in the managed stylesheet
// (packages/ui's trickster-buefy.scss / theme.scss since Task A11.4). A local
// override must be exactly one <style scoped> block and have a preceding
// `<!-- kit-style-exception: <reason> -->` comment. This script needs no
// network access; it only walks the local filesystem.

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
  const relativePath = relative(root, file).replaceAll("\\", "/");
  // Do not mistake a literal `<style>` in a template/documentation comment
  // for an actual SFC block.
  const withoutComments = content.replace(/<!--[\s\S]*?-->/g, (comment) => " ".repeat(comment.length));
  const styleOpenTags = withoutComments.match(/<style\b[^>]*>/g) ?? [];
  const styleMatch = /<style\b[^>]*>/.exec(withoutComments);
  const exception = /<!--\s*kit-style-exception:\s*(\S[\s\S]*?)\s*-->/.exec(content);
  const styleIndex = styleMatch?.index ?? -1;
  const hasDocumentedScopedOverride =
    styleOpenTags.length === 1 &&
    styleOpenTags[0] === "<style scoped>" &&
    exception &&
    exception.index < styleIndex;
  if (styleOpenTags.length > 0 && !hasDocumentedScopedOverride) {
    violations.push(relativePath);
  }
}

if (violations.length > 0) {
  console.error("no-component-styles: found <style> blocks outside the managed stylesheet:");
  for (const file of violations) {
    console.error(`  - ${file}`);
  }
  console.error(
    `\n${violations.length} file(s) violate Stage A2: move component rules into packages/ui's theme.scss or add one scoped, documented kit-style-exception.`
  );
  process.exit(1);
}

console.log("no-component-styles: OK — every component style is a documented scoped kit-only override.");
