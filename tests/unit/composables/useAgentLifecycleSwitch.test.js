import { describe, expect, it } from "vitest";

import { decideLifecycleToggle, LIFECYCLE_REASONS } from "../../../src/composables/useAgentLifecycleSwitch.js";

describe("decideLifecycleToggle", () => {
  it("allows active, paused and ready agents", () => {
    expect(decideLifecycleToggle({ status: "Активен", instructions: "" }).canToggle).toBe(true);
    expect(decideLifecycleToggle({ status: "Приостановлен", instructions: "" }).canToggle).toBe(true);
    expect(decideLifecycleToggle({ status: "Черновик", instructions: "x" }).canToggle).toBe(true);
  });

  it("blocks a draft that is not ready with a reason", () => {
    expect(decideLifecycleToggle({ status: "Черновик", instructions: " " }))
      .toEqual({ canToggle: false, reason: LIFECYCLE_REASONS.notReady });
  });

  it("blocks an unknown status", () => {
    expect(decideLifecycleToggle({ status: "???", instructions: "x" }))
      .toEqual({ canToggle: false, reason: LIFECYCLE_REASONS.unknown });
  });
});
