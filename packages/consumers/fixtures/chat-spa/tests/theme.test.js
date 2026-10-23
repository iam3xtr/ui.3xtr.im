import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { applyTheme, modeFromSearch, resolveTheme, watchSystemTheme } from "../src/theme.js";

function fakeMatchMedia(initial) {
  const listeners = new Set();
  const query = {
    matches: initial,
    addEventListener: (_t, fn) => listeners.add(fn),
    removeEventListener: (_t, fn) => listeners.delete(fn),
  };
  return {
    fn: () => query,
    flip(v) {
      query.matches = v;
      listeners.forEach((l) => l());
    },
    listeners,
  };
}

describe("consumer-owned theme resolver", () => {
  it("honours forced modes regardless of the system preference", () => {
    expect(resolveTheme("light", fakeMatchMedia(true).fn)).toBe("light");
    expect(resolveTheme("dark", fakeMatchMedia(false).fn)).toBe("dark");
  });

  it("resolves auto from matchMedia and tolerates its absence", () => {
    expect(resolveTheme("auto", fakeMatchMedia(true).fn)).toBe("dark");
    expect(resolveTheme("auto", fakeMatchMedia(false).fn)).toBe("light");
    expect(resolveTheme("auto", undefined)).toBe("light");
    expect(modeFromSearch("?theme=bogus")).toBe("auto");
    expect(modeFromSearch("?theme=dark")).toBe("dark");
  });

  it("follows system changes only while the mode is auto", () => {
    const mm = fakeMatchMedia(false);
    const root = document.createElement("html");
    let mode = "auto";
    const stop = watchSystemTheme(() => mode, { root, matchMedia: mm.fn });
    mm.flip(true);
    expect(root.dataset.theme).toBe("dark");
    mode = "light";
    applyTheme(mode, { root, matchMedia: mm.fn });
    mm.flip(false);
    mm.flip(true);
    expect(root.dataset.theme).toBe("light");
    stop();
    expect(mm.listeners.size).toBe(0);
  });
});

describe("synchronous pre-paint theme script in index.html", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const head = html.slice(0, html.indexOf("</head>"));
  const code = /<script>([\s\S]*?)<\/script>/.exec(head)?.[1];

  function run(search, prefersDark) {
    const documentElement = { dataset: {} };
    const matchMedia = () => ({ matches: prefersDark });
    vm.runInNewContext(code, { document: { documentElement }, location: { search }, matchMedia, URLSearchParams });
    return documentElement.dataset.theme;
  }

  it("is an inline classic script in <head> before the deferred module", () => {
    expect(code).toBeTruthy();
    expect(head).not.toContain('type="module"');
    expect(html.indexOf(code)).toBeLessThan(html.indexOf("./src/main.js"));
  });

  it("agrees with resolveTheme/modeFromSearch for every mode and preference", () => {
    for (const search of ["", "?theme=light", "?theme=dark", "?theme=auto", "?theme=bogus"]) {
      for (const dark of [true, false]) {
        expect(run(search, dark)).toBe(resolveTheme(modeFromSearch(search), () => ({ matches: dark })));
      }
    }
  });
});
