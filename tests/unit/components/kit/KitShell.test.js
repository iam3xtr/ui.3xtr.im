import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";
import { RouterView } from "vue-router";

import KitShell from "../../../../src/components/kit/KitShell.vue";
import Overview from "../../../../src/components/kit/Overview.vue";
import Forms from "../../../../src/components/kit/Forms.vue";
import Tables from "../../../../src/components/kit/Tables.vue";
import NavigationStates from "../../../../src/components/kit/NavigationStates.vue";
import DialogsOverlays from "../../../../src/components/kit/DialogsOverlays.vue";
import { navbarMenuKey } from "@iam3xtr/vue";
import { useDemoStore } from "../../../../src/stores/demo.js";

// jsdom has no `matchMedia` — `Loader.vue` (mounted in Overview) reads it on
// mount to pick the reduced-motion variant.
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

// Task A8.6: `/kit` split into a route-driven shell with five addressable
// sections. This mirrors the router.js route tree exactly (including the
// `alias: ""` compatible entry at bare `/kit`) rather than a trimmed-down
// stand-in, so a route wiring mistake in router.js would also break this
// test.
function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/kit",
        component: KitShell,
        children: [
          { path: "overview", alias: "", name: "kit", component: Overview },
          { path: "forms", name: "kit-forms", component: Forms },
          { path: "tables", name: "kit-tables", component: Tables },
          {
            path: "navigation-states",
            name: "kit-navigation-states",
            component: NavigationStates,
          },
          {
            path: "dialogs-overlays",
            name: "kit-dialogs-overlays",
            component: DialogsOverlays,
          },
        ],
      },
    ],
  });
}

async function mountKitShell(initialPath = "/kit") {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = buildRouter();
  router.push(initialPath);
  await router.isReady();

  // A stand-in Navbar menu target: `NavbarMenu.vue` teleports `NavbarTabs`
  // there, same provide/inject contract as the real `App.vue` shell.
  const target = document.createElement("div");
  document.body.appendChild(target);

  // Mounting `KitShell` directly (rather than under an ancestor
  // `RouterView`, as in the real app shell) would make its own `<RouterView>`
  // resolve at depth 0 — i.e. render `KitShell` itself once more before
  // depth 1 reaches the real child tab (the same quirk
  // `agents/AgentDetail.test.js` documents). A trivial root with its own
  // `<RouterView>` avoids that self-referential double render.
  const wrapper = mount(
    { components: { RouterView }, template: "<RouterView />" },
    {
      global: {
        plugins: [pinia, router, Buefy],
        provide: { [navbarMenuKey]: target },
      },
    },
  );

  return { wrapper, router, target };
}

describe("kit/KitShell.vue — маршруты и совместимый вход /kit (Task A8.6)", () => {
  it("бare `/kit` рендерит раздел «Обзор» через alias, без редиректа", async () => {
    const { wrapper, router } = await mountKitShell("/kit");

    expect(router.currentRoute.value.path).toBe("/kit");
    expect(router.currentRoute.value.name).toBe("kit");
    expect(wrapper.findComponent(Overview).exists()).toBe(true);
  });

  it("каждый раздел имеет собственный именованный маршрут и URL", async () => {
    const cases = [
      { path: "/kit/overview", name: "kit", component: Overview },
      { path: "/kit/forms", name: "kit-forms", component: Forms },
      { path: "/kit/tables", name: "kit-tables", component: Tables },
      {
        path: "/kit/navigation-states",
        name: "kit-navigation-states",
        component: NavigationStates,
      },
      {
        path: "/kit/dialogs-overlays",
        name: "kit-dialogs-overlays",
        component: DialogsOverlays,
      },
    ];

    for (const { path, name, component } of cases) {
      const { wrapper, router } = await mountKitShell(path);
      expect(router.currentRoute.value.name).toBe(name);
      expect(wrapper.findComponent(component).exists()).toBe(true);
    }
  });

  it("NavbarTabs подсвечивает активный подраздел через единственный владелец NavbarMenu", async () => {
    const { target } = await mountKitShell("/kit/tables");

    // NavbarTabs is teleported into the shared target — exactly one owner
    // per route, per Task A8.6's acceptance criteria.
    const links = target.querySelectorAll(".tr-navbar-tabs__link");
    expect(links.length).toBe(5);

    const activeLinks = target.querySelectorAll(".tr-navbar-tabs__link.router-link-active");
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].textContent.trim()).toBe("Таблицы");
  });

  it("переход между разделами не перезаписывает persisted demo-режим", async () => {
    const { router } = await mountKitShell("/kit/navigation-states");
    const demoStore = useDemoStore();
    demoStore.setMode("error");

    await router.push({ name: "kit-forms" });
    expect(demoStore.mode).toBe("error");

    await router.push({ name: "kit-navigation-states" });
    expect(demoStore.mode).toBe("error");
  });
});
