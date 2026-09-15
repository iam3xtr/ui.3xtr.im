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

// Task A9.2: the agent creation wizard's one named entry route. `/agents/new`
// must resolve to it — not be swallowed by the dynamic `/agents/:id` detail
// route declared right after it — and the optional `:step` segment must stay
// optional so a bare direct URL still resolves.
describe("router — agent-wizard entry route (Task A9.2)", () => {
  it("/agents/new resolves to the wizard, not the agent detail route", () => {
    const resolved = router.resolve("/agents/new");

    expect(resolved.name).toBe("agent-wizard");
    expect(resolved.meta.contentMode).toBe("contained");
  });

  it("/agents/new/:step resolves with the step param, same contentMode", () => {
    const resolved = router.resolve("/agents/new/context");

    expect(resolved.name).toBe("agent-wizard");
    expect(resolved.params.step).toBe("context");
    expect(resolved.meta.contentMode).toBe("contained");
  });

  it("/agents/1 still resolves to the agent detail route, unaffected by the wizard route", () => {
    expect(router.resolve("/agents/1").name).toBe("agent");
  });
});

// Task A10.8: named, route-backed help/notification-history/workspace-audit
// surfaces — a permanent profile-menu entry and a workspace tab each resolve
// to a real route, not a modal/tooltip with no addressable URL.
describe("router — help, notification history and workspace audit routes (Task A10.8)", () => {
  it("/profile/notifications resolves to notification-history", () => {
    expect(router.resolve("/profile/notifications").name).toBe("notification-history");
  });

  it("/profile/help resolves to help", () => {
    expect(router.resolve("/profile/help").name).toBe("help");
  });

  it("/workspace/audit resolves to workspace-audit", () => {
    expect(router.resolve("/workspace/audit").name).toBe("workspace-audit");
  });
});
