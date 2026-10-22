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
