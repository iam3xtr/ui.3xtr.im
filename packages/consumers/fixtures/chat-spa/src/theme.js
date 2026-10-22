// Consumer-owned theme resolver for this fixture. It is NOT a shared auto-theme
// implementation: `@iam3xtr/ui` only defines the `:root[data-theme]` contract.
export const THEME_MODES = ["light", "dark", "auto"];

/** Resolve a mode to the concrete "light" | "dark" value. */
export function resolveTheme(mode, matchMedia = globalThis.matchMedia) {
  if (mode === "light" || mode === "dark") return mode;
  const dark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "dark" : "light";
}

/** Apply the resolved theme on the document root and return it. */
export function applyTheme(mode, { root = document.documentElement, matchMedia = globalThis.matchMedia } = {}) {
  const theme = resolveTheme(mode, matchMedia);
  root.dataset.theme = theme;
  return theme;
}

/** Follow system changes while the mode is "auto". Returns an unsubscribe function. */
export function watchSystemTheme(getMode, { root = document.documentElement, matchMedia = globalThis.matchMedia } = {}) {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getMode() === "auto") applyTheme("auto", { root, matchMedia });
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function modeFromSearch(search) {
  const value = new URLSearchParams(search).get("theme");
  return THEME_MODES.includes(value) ? value : "auto";
}
