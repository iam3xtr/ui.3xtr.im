// @vitest-environment node
//
// Runs with no window/document global at all, standing in for a Nuxt/Nitro
// server worker. Proves that resolving @iam3xtr/vue's core entry and
// server-rendering it, from a packed-tarball install, never touches a
// browser global — the same contract packages/vue/tests/ssr.test.js checks
// at the source level, reproduced here against the installed package.
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { ModelSelect } from "@iam3xtr/vue";
import { App } from "../app.mjs";

describe("ssr-hydration fixture: server half", () => {
  it("renders without window/document defined", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain("tr-loader");
    expect(html).toContain("tr-async-state");
  });

  it("exposes ModelSelect from the core entry without window/document", () => {
    // Importing the packed core entry above already evaluated the
    // ModelSelect SFC module in a server worker; it must be a real
    // component export, not an entry that only loads in a browser.
    expect(typeof window).toBe("undefined");
    expect(ModelSelect).toBeTruthy();
    expect(typeof ModelSelect.setup === "function" || typeof ModelSelect.render === "function").toBe(true);
  });
});
