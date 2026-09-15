import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import Audit from "../../../../src/components/workspace/Audit.vue";
import { useDemoStore } from "../../../../src/stores/demo.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

if (typeof window.matchMedia !== "function") {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

async function mountAudit({ workspaceId = "demo", demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = workspaceId;

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  vi.useFakeTimers();
  const wrapper = mount(Audit, {
    global: { plugins: [pinia, Buefy] },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

// Task A10.8 (`.plan` item 7, API Issue #109): capability-gated workspace
// audit, separate from the personal notification feed.
describe("workspace/Audit.vue (Task A10.8)", () => {
  it("Владелец видит таблицу действий (actor/action/time)", async () => {
    const { wrapper } = await mountAudit({ workspaceId: "demo" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.text()).not.toMatch(/password|ключ api/i);
  });

  it("Участник видит объяснённый отказ в доступе, а не пустую/сломанную таблицу", async () => {
    const { wrapper } = await mountAudit({ workspaceId: "empty" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.text()).toContain("владельцу и администратору");
    expect(wrapper.find("table").exists()).toBe(false);
  });

  it("gap-заметка retention показана отдельно от таблицы действий", async () => {
    const { wrapper } = await mountAudit({ workspaceId: "trickster" });

    expect(wrapper.find(".tr-workspace-audit__gap").exists()).toBe(true);
    expect(wrapper.find(".tr-workspace-audit__gap").text()).toContain("не хранятся");
  });

  it("demo-режим permission-denied тоже блокирует доступ у разрешённой роли", async () => {
    const { wrapper } = await mountAudit({ workspaceId: "demo", demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
  });

  it("error показывает ошибку через ListAsyncState у разрешённой роли", async () => {
    const { wrapper } = await mountAudit({ workspaceId: "demo", demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
  });
});
