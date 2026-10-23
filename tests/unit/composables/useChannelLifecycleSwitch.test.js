import { describe, expect, it } from "vitest";

import {
  CHANNEL_LIFECYCLE_REASONS,
  decideChannelToggle,
  decideWebToggle,
} from "../../../src/composables/useChannelLifecycleSwitch.js";

describe("decideChannelToggle", () => {
  it("never blocks switching off an enabled channel, even in error", () => {
    expect(decideChannelToggle({ status: "error", isEnabled: true, providerIdentity: "@b" }).canToggle).toBe(true);
  });

  it("blocks enabling an errored or unidentified channel with a reason", () => {
    expect(decideChannelToggle({ status: "error", isEnabled: false, providerIdentity: "@b" }))
      .toEqual({ canToggle: false, reason: CHANNEL_LIFECYCLE_REASONS.needsToken });
    expect(decideChannelToggle({ status: "inactive", isEnabled: false, providerIdentity: null }).reason)
      .toBe(CHANNEL_LIFECYCLE_REASONS.needsIdentity);
  });

  it("allows enabling a displaced channel (takeover path) and blocks checking", () => {
    expect(decideChannelToggle({ status: "displaced", isEnabled: false, providerIdentity: null }).canToggle).toBe(true);
    expect(decideChannelToggle({ status: "checking", isEnabled: false, providerIdentity: null }).canToggle).toBe(false);
  });
});

describe("decideWebToggle", () => {
  it("blocks enabling when not ready but allows switching off", () => {
    expect(decideWebToggle({ enabled: false, readiness: "not_ready", readinessReason: "r" }))
      .toEqual({ canToggle: false, reason: "r" });
    expect(decideWebToggle({ enabled: true, readiness: "not_ready", readinessReason: "r" }).canToggle).toBe(true);
  });
});
