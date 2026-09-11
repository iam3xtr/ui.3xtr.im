import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import Members from "../../../../src/components/workspace/Members.vue";
import { useDemoStore } from "../../../../src/stores/demo.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

// jsdom has no `matchMedia` — `Loader.vue` reads it on mount (see
// tests/unit/components/Agents.test.js for the same fix).
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

// Task A7.5: `workspace/Members.vue` подключён к глобальному demo-режиму —
// тот же контракт, что каталоги Task A7.3: loading через `Loader`,
// permission-denied прямым `AsyncState`, error/empty через
// `demoStore.listAsyncState` на обоих `ListAsyncState`, partial —
// `b-message`-баннером поверх обеих таблиц.
async function mountMembers({ demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = "demo";

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  vi.useFakeTimers();
  const wrapper = mount(Members, {
    global: {
      plugins: [pinia, Buefy],
      stubs: { InviteMemberForm: true },
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("workspace/Members.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает существующие таблицы участников и приглашений", async () => {
    const { wrapper } = await mountMembers();

    expect(wrapper.findAll("table").length).toBeGreaterThan(0);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountMembers({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
  });

  it("error показывает ошибку через ListAsyncState", async () => {
    const { wrapper } = await mountMembers({ demoMode: "error" });

    expect(wrapper.findAll(".tr-async-state--error").length).toBeGreaterThan(0);
  });

  it("partial показывает баннер и оставляет доступные таблицы", async () => {
    const { wrapper } = await mountMembers({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll("table").length).toBeGreaterThan(0);
  });
});
