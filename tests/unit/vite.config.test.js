// @vitest-environment node
//
// vite.config.js imports "vite", which pulls in esbuild's native binary;
// esbuild's own invariant check (TextEncoder().encode("") instanceof
// Uint8Array) fails under the jsdom environment this repo's other unit
// tests use, so this file runs in the plain node environment instead.
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config.js";

// Issue #14.1: только именованный Pages-режим включает Vue Devtools
// inspection в production build; default production build должен явно
// оставаться false, а не просто "не задан".
describe("vite.config.js — __VUE_PROD_DEVTOOLS__", () => {
  it("остаётся false для обычного production build", () => {
    const config = viteConfig({ mode: "production", command: "build" });

    expect(config.define.__VUE_PROD_DEVTOOLS__).toBe(false);
  });

  it("остаётся false для dev server", () => {
    const config = viteConfig({ mode: "development", command: "serve" });

    expect(config.define.__VUE_PROD_DEVTOOLS__).toBe(false);
  });

  it("включается только для отдельного Pages mode", () => {
    const config = viteConfig({ mode: "pages", command: "build" });

    expect(config.define.__VUE_PROD_DEVTOOLS__).toBe(true);
  });
});

describe("vite.config.js — локальные исходники пакетов", () => {
  it("использует packages/ui и packages/vue только в npm run dev", () => {
    const config = viteConfig({ mode: "development", command: "serve" });
    const aliases = config.resolve.alias;
    const vueAlias = aliases.find(({ find }) => find instanceof RegExp && find.test("@iam3xtr/vue"));
    const assetsAlias = aliases.find(({ find }) => find === "@iam3xtr/ui/assets");

    expect(vueAlias.replacement.replaceAll("\\", "/")).toContain("packages/vue/src/index.js");
    expect(assetsAlias.replacement.replaceAll("\\", "/")).toContain("packages/ui/src/assets");
    expect(config.resolve.dedupe).toEqual(expect.arrayContaining(["vue", "vue-router", "buefy"]));
  });

  it("не подменяет published packages в production и Pages builds", () => {
    for (const mode of ["production", "pages"]) {
      const config = viteConfig({ mode, command: "build" });
      expect(config.resolve.alias.some(({ find }) => find instanceof RegExp && find.test("@iam3xtr/vue"))).toBe(false);
    }
  });
});
