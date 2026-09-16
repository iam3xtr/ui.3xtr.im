// @vitest-environment jsdom
//
// "Client" half: takes the exact markup server.test.js produced and
// hydrates it in a DOM, asserting Vue reports no hydration mismatch. This
// is the part a Nuxt page would do in the browser after receiving the
// server-rendered HTML.
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { App } from "../app.mjs";

describe("ssr-hydration fixture: client half", () => {
  it("hydrates server-rendered markup with no mismatch warnings", async () => {
    const serverHtml = await renderToString(createSSRApp(App));

    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);

    const warnings = [];
    const originalConsoleError = console.error;
    console.error = (...args) => {
      warnings.push(args.join(" "));
    };
    try {
      createSSRApp(App).mount(container);
    } finally {
      console.error = originalConsoleError;
    }

    const mismatches = warnings.filter((line) => /hydration/i.test(line));
    expect(mismatches).toEqual([]);
    expect(container.innerHTML).toContain("tr-loader");
  });
});
