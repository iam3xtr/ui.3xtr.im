import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import WorkspacePlans from "../../../src/components/WorkspacePlans.vue";
import { useDemoStore } from "../../../src/stores/demo.js";
import { useWorkspaceStore } from "../../../src/stores/workspace.js";

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

// Task A7.5 review follow-up (Finding 6): `WorkspacePlans.vue` — loading/
// permission-denied/error через `Loader`/прямой `AsyncState`, тот же приём,
// что `workspace/Usage.vue`/`Dashboard.vue`. `tariffOptions` — статичный
// каталог, поэтому нет ни empty, ни partial (см. комментарий в компоненте).
async function mountWorkspacePlans({ demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = "demo";

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  vi.useFakeTimers();
  const wrapper = mount(WorkspacePlans, {
    global: { plugins: [pinia, Buefy] },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("WorkspacePlans.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает выбор тарифа", async () => {
    const { wrapper } = await mountWorkspacePlans();

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
    expect(wrapper.find(".tr-async-state--error").exists()).toBe(false);
  });

  it("permission-denied показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountWorkspacePlans({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
  });

  it("error показывает ошибку через AsyncState (новая ветка)", async () => {
    const { wrapper } = await mountWorkspacePlans({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
  });
});
