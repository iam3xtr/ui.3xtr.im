import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Sidebar from "../../../src/components/Sidebar.vue";
import {
  administrationNavigationItems,
  mainNavigationItems,
} from "../../../src/navigation.js";
import {
  COMPACT_TARIFF_LIMIT_ORDER,
  useWorkspaceStore,
} from "../../../src/stores/workspace.js";

// Task #10.1: a menu item's visible label can be clipped with an ellipsis
// (theme.scss) once a long RU/EN/ES translation no longer fits the
// canonical sidebar width — this does not remove the label from the DOM, so
// assistive tech still gets the full text; the `title` attribute below is
// the equivalent hover tooltip for sighted pointer users. This test locks
// down that every nav item still carries its full, untruncated label both
// as visible text and as `title`.
const stubComponent = { template: "<div />" };

async function mountSidebar() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const routeNames = [
    ...mainNavigationItems.map((item) => item.routeName),
    ...administrationNavigationItems.map((item) => item.routeName),
  ];

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...routeNames.map((name) => ({
        path: `/${name}`,
        name,
        component: stubComponent,
      })),
      // Sidebar also renders TariffSummaryCard, whose router-link resolves
      // "workspace-plans" — a route outside mainNavigationItems/
      // administrationNavigationItems, so it must be registered separately
      // (see tests/unit/components/Dashboard.test.js for the same route).
      { path: "/workspace/plans", name: "workspace-plans", component: stubComponent },
    ],
  });
  router.push("/conversations");
  await router.isReady();

  const wrapper = mount(Sidebar, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });

  return { wrapper, router };
}

describe("Sidebar.vue — стабильная ширина и labels меню (Issue #10.1)", () => {
  it("каждый пункт главной навигации несёт полный label как текст и как title", async () => {
    const { wrapper } = await mountSidebar();

    for (const item of mainNavigationItems) {
      const link = wrapper.find(`a[href="/${item.routeName}"]`);
      expect(link.exists()).toBe(true);
      expect(link.attributes("title")).toBe(item.label);
      expect(link.text()).toContain(item.label);
    }
  });

  it("каждый пункт администрирования несёт полный label как текст и как title", async () => {
    const { wrapper } = await mountSidebar();

    for (const item of administrationNavigationItems) {
      const link = wrapper.find(`a[href="/${item.routeName}"]`);
      expect(link.exists()).toBe(true);
      expect(link.attributes("title")).toBe(item.label);
      expect(link.text()).toContain(item.label);
    }
  });

  it("sidebar не задаёт inline ширину — она приходит только из canonical токена темы", async () => {
    const { wrapper } = await mountSidebar();

    expect(wrapper.find(".tr-sidebar").attributes("style")).toBeUndefined();
  });

  it("показывает provenance ui/vue и не выдаёт локальные исходники за опубликованную пару", async () => {
    const { wrapper } = await mountSidebar();

    const versions = wrapper.find('section[aria-label="Версии библиотек"]');
    expect(versions.exists()).toBe(true);
    expect(versions.attributes("aria-label")).toBe("Версии библиотек");
    expect(versions.text()).toContain("ui");
    expect(versions.text()).toContain("vue");
    // Assert Buefy's public `type` props rather than its generated DOM
    // classes: those classes vary across Buefy's render modes, while these
    // props are the semantic colour contract consumed by the component.
    const tagTypes = wrapper.findAllComponents({ name: "BTag" }).map((tag) => tag.props("type"));
    expect(tagTypes).toEqual(expect.arrayContaining(["is-dark", "is-info", "is-success"]));

    // Local Vite sources are a development/provenance warning, not a third
    // package version and not a claim that a new registry release exists.
    if (versions.text().includes("+")) {
      expect(tagTypes).toContain("is-warning");
    }
  });
});

// Stage 4 `.plan`: compact tariff card in the Sidebar — TariffSummaryCard
// receives not the full `activeWorkspaceTariff` but a projection in
// `COMPACT_TARIFF_LIMIT_ORDER`, excluding `zero`/`unknown`/`error`. The full
// tariff and the `TariffSummaryCard` API are unchanged.
describe("Sidebar.vue — компактная карточка тарифа (этап 4)", () => {
  it("TariffSummaryCard получает проекцию с не более чем тремя лимитами", async () => {
    const { wrapper } = await mountSidebar();

    const card = wrapper.findComponent({ name: "TariffSummaryCard" });
    expect(card.exists()).toBe(true);

    const tariff = card.props("tariff");
    expect(tariff.limits.length).toBeLessThanOrEqual(3);
  });

  it("проекция скрывает zero/unknown/error из demo-тарифа", async () => {
    const { wrapper } = await mountSidebar();

    const card = wrapper.findComponent({ name: "TariffSummaryCard" });
    const tariff = card.props("tariff");

    const states = tariff.limits.map((limit) => limit.state);
    expect(states).not.toContain("zero");
    expect(states).not.toContain("unknown");
    expect(states).not.toContain("error");
  });

  it("проекция не содержит периода («в этом месяце») в caption", async () => {
    const { wrapper } = await mountSidebar();

    const card = wrapper.findComponent({ name: "TariffSummaryCard" });
    const tariff = card.props("tariff");

    for (const limit of tariff.limits) {
      expect(limit.caption).not.toContain("в этом месяце");
    }
  });

  it("проекция идёт в COMPACT_TARIFF_LIMIT_ORDER и сохраняет key/progress/used/limit исходных лимитов", async () => {
    const { wrapper } = await mountSidebar();
    const store = useWorkspaceStore();

    const card = wrapper.findComponent({ name: "TariffSummaryCard" });
    const compactLimits = card.props("tariff").limits;
    const sourceLimits = store.activeWorkspaceTariff.limits;

    // Expected keys are derived independently of selectCompactTariffLimits:
    // the store's visible limits in COMPACT_TARIFF_LIMIT_ORDER, first three.
    const expectedKeys = COMPACT_TARIFF_LIMIT_ORDER.filter((key) => {
      const source = sourceLimits.find((limit) => limit.key === key);
      return source && !["zero", "unknown", "error"].includes(source.state);
    }).slice(0, 3);

    expect(compactLimits.length).toBeGreaterThan(0);
    expect(compactLimits.map((limit) => limit.key)).toEqual(expectedKeys);

    for (const limit of compactLimits) {
      const source = sourceLimits.find((entry) => entry.key === limit.key);
      expect({
        key: limit.key,
        progress: limit.progress,
        used: limit.used,
        limit: limit.limit,
      }).toEqual({
        key: source.key,
        progress: source.progress,
        used: source.used,
        limit: source.limit,
      });
    }
  });

  it("полный activeWorkspaceTariff в store не меняется проекцией: 7 лимитов и исходные caption", async () => {
    // The reference comes from a separate store that is never mounted.
    const referencePinia = createPinia();
    setActivePinia(referencePinia);
    const reference = JSON.parse(
      JSON.stringify(useWorkspaceStore().activeWorkspaceTariff.limits),
    );

    const { wrapper } = await mountSidebar();
    const store = useWorkspaceStore();
    const card = wrapper.findComponent({ name: "TariffSummaryCard" });
    expect(card.exists()).toBe(true);

    const storeLimits = store.activeWorkspaceTariff.limits;
    expect(storeLimits).toHaveLength(7);
    expect(storeLimits.map((limit) => limit.key)).toEqual(reference.map((limit) => limit.key));
    expect(storeLimits.map((limit) => limit.caption)).toEqual(
      reference.map((limit) => limit.caption),
    );
    expect(JSON.parse(JSON.stringify(storeLimits))).toEqual(reference);
  });

  it("неизвестный activeWorkspaceId (fallback emptyTariff) даёт пустую компактную проекцию", async () => {
    const { wrapper } = await mountSidebar();
    const store = useWorkspaceStore();

    store.activeWorkspaceId = "does-not-exist";
    await nextTick();

    const card = wrapper.findComponent({ name: "TariffSummaryCard" });
    expect(card.exists()).toBe(true);
    expect(card.props("tariff").limits).toEqual([]);
    // The full fallback tariff still has 7 limits in the unknown state.
    expect(store.activeWorkspaceTariff.limits).toHaveLength(7);
    expect(store.activeWorkspaceTariff.limits.every((limit) => limit.state === "unknown")).toBe(true);
  });
});
