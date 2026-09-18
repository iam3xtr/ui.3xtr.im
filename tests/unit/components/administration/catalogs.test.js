import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import AdminModels from "../../../../src/components/administration/Models.vue";
import AdminProviders from "../../../../src/components/administration/Providers.vue";
import AdminRequests from "../../../../src/components/administration/Requests.vue";
import AdminTariffs from "../../../../src/components/administration/Tariffs.vue";
import AdminUsers from "../../../../src/components/administration/Users.vue";
import { useAdministrationStore } from "../../../../src/stores/administration.js";
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

/**
 * Task A8.3: пять облегчённых административных каталогов делят один
 * контракт — `Toolbar` + `b-table` + `useDemoStore()` async-состояния (тот
 * же приём, что `Agents.vue`/`Knowledge.vue`/`workspace/Members.vue`, Task
 * A7.3/A7.5) — поэтому проверяются одним параметризованным набором, а не
 * пятью почти одинаковыми файлами.
 */
const catalogs = [
  { name: "administration/Users.vue", component: AdminUsers, storeKey: "users" },
  { name: "administration/Providers.vue", component: AdminProviders, storeKey: "providers" },
  { name: "administration/Models.vue", component: AdminModels, storeKey: "models" },
  { name: "administration/Tariffs.vue", component: AdminTariffs, storeKey: "tariffs" },
  { name: "administration/Requests.vue", component: AdminRequests, storeKey: "requests" },
];

async function mountCatalog(component, { demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  vi.useFakeTimers();
  const wrapper = mount(component, {
    global: {
      plugins: [pinia, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe.each(catalogs)("$name — облегчённый каталог (Task A8.3)", ({ component, storeKey }) => {
  it("ready показывает таблицу без форм и с непустыми фикстурами", async () => {
    const { wrapper } = await mountCatalog(component);
    const administrationStore = useAdministrationStore();

    expect(administrationStore[storeKey].length).toBeGreaterThan(0);
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("error показывает ошибку через ListAsyncState", async () => {
    const { wrapper } = await mountCatalog(component, { demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.find("table").exists()).toBe(false);
  });

  it("empty показывает пустое состояние даже когда fixture-данные не пусты", async () => {
    const { wrapper } = await mountCatalog(component, { demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.find("table").exists()).toBe(false);
  });

  it("partial показывает баннер и оставляет доступную таблицу", async () => {
    const { wrapper } = await mountCatalog(component, { demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.find("table").exists()).toBe(true);
  });

  // Task #12.1: единый семантический marker (role/status/protocol) — каждая
  // из пяти таблиц рендерит хотя бы одну decorative-иконку через `AdminMarker`
  // (см. `AdminMarker.test.js` для резолюции самого mapping) и не теряет
  // текстовое значение статуса/роли/протокола, которое уже проверял этот
  // набор через фикстуры.
  it("показывает семантические markers рядом с текстом, не теряя его", async () => {
    const { wrapper } = await mountCatalog(component);

    const table = wrapper.find("table");
    expect(table.find(".tr-admin-marker").exists()).toBe(true);
    expect(table.findAll(".tr-admin-marker .icon").length).toBeGreaterThan(0);

    // Каждый marker сохраняет исходный текст рядом с иконкой.
    table.findAll(".tr-admin-marker").forEach((marker) => {
      expect(marker.text().trim().length).toBeGreaterThan(0);
    });
  });
});
