import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";
import { createMemoryHistory, createRouter } from "vue-router";

import KitNavbarTabs from "../../../../src/components/kit/KitNavbarTabs.vue";

let wrapper;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

async function mountReference() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", name: "kit", component: { template: "<div />" } }],
  });
  router.push("/");
  await router.isReady();
  const stub = { template: "<div />" };
  const names = [
    "kit-forms", "kit-tables", "kit-navigation-states", "kit-dialogs-overlays",
    "kit-chat", "kit-application-shell", "agent", "knowledge-collection",
    "workspace", "profile",
  ];
  names.forEach((name) => router.addRoute({ path: `/${name}`, name, component: stub }));
  wrapper = mount(KitNavbarTabs, {
    attachTo: document.body,
    global: { plugins: [Buefy, router] },
  });
  return wrapper;
}

describe("kit/KitNavbarTabs.vue resources reference", () => {
  it("places the resource links right before the actions and toggles variants", async () => {
    await mountReference();
    const bar = wrapper.get('[data-testid="navbar-resources-bar"]');
    const children = [...bar.element.children].map((el) => el.className);
    const links = children.findIndex((c) => c.includes("tr-topbar__links"));
    const actions = children.findIndex((c) => c.includes("tr-topbar__actions"));
    expect(links).toBeGreaterThan(-1);
    expect(actions).toBe(links + 1);
    expect(bar.findAll(".tr-topbar__links a")).toHaveLength(3);
    expect(bar.find(".tr-navbar-tabs").exists()).toBe(true);

    wrapper.vm.resourceCount = 0;
    wrapper.vm.tabCount = 0;
    await wrapper.vm.$nextTick();
    expect(bar.find(".tr-topbar__links").exists()).toBe(false);
    expect(bar.find(".tr-navbar-tabs").exists()).toBe(false);
  });
});
