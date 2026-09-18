import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Sidebar from "../../../src/components/Sidebar.vue";
import {
  administrationNavigationItems,
  mainNavigationItems,
} from "../../../src/navigation.js";

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
});
