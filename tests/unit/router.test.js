import { describe, expect, it } from "vitest";

import router from "../../src/router.js";

// Task A8.5: every `/agents/:id/**` and `/knowledge/:id/**` detail tab must
// resolve to `contentMode: "contained"` — including tabs that used to be
// `fluid` (playground, channels, files, statistics) — while the catalogs
// they sit under keep their own, separately-documented width.
describe("router — content width contract (Task A8.5)", () => {
  it.each([
    ["/agents/1", "agent"],
    ["/agents/1/settings", "agent-settings"],
    ["/agents/1/channels", "agent-channels"],
    ["/knowledge/1", "knowledge-collection"],
    ["/knowledge/1/settings", "knowledge-collection-settings"],
    ["/knowledge/1/statistics", "knowledge-collection-statistics"],
  ])("%s (%s) resolves to contentMode: contained", async (path, name) => {
    const resolved = router.resolve(path);

    expect(resolved.name).toBe(name);
    expect(resolved.meta.contentMode).toBe("contained");
  });

  it("catalog routes /agents/ and /knowledge/ are left without an explicit contentMode", () => {
    expect(router.resolve("/agents/").meta.contentMode).toBeUndefined();
    expect(router.resolve("/knowledge/").meta.contentMode).toBeUndefined();
  });
});
