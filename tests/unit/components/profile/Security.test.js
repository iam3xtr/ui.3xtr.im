import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import Security from "../../../../src/components/profile/Security.vue";
import { useDemoStore } from "../../../../src/stores/demo.js";

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

// Task A7.5 review follow-up (Finding 6): `profile/Security.vue` — тот же
// контракт, что `workspace/Members.vue`: `Loader`/прямой `AsyncState` на
// loading/permission-denied, `demoStore.listAsyncState` на `ListAsyncState`
// (error/empty), partial — `b-message`-баннером поверх таблицы сеансов.
async function mountSecurity({ demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  vi.useFakeTimers();
  const wrapper = mount(Security, {
    global: { plugins: [pinia, Buefy] },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("profile/Security.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает таблицу активных сеансов", async () => {
    const { wrapper } = await mountSecurity();

    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountSecurity({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.find("table").exists()).toBe(false);
  });

  it("error показывает ошибку через ListAsyncState", async () => {
    const { wrapper } = await mountSecurity({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
  });

  it("empty показывает пустое состояние без таблицы сеансов", async () => {
    const { wrapper } = await mountSecurity({ demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.find("table").exists()).toBe(false);
  });

  it("partial показывает баннер и оставляет таблицу сеансов", async () => {
    const { wrapper } = await mountSecurity({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.find("table").exists()).toBe(true);
  });
});
