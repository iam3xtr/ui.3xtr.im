import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Navbar from "../../../src/components/Navbar.vue";
import { useDemoStore } from "../../../src/stores/demo.js";

// Task A7.2: изолированная демо-панель в Navbar — двусторонне связана с
// `useDemoStore()` и скрыта на минимальном (auth) navbar.

const workspaces = [
  { id: "demo", name: "Demo", role: "Владелец", plan: "Pro" },
];

const user = { firstName: "Иван", lastName: "Петров", role: "Владелец" };

async function mountNavbar({ minimal = false } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      { path: "/conversations", name: "conversations", component: { template: "<div />" } },
    ],
  });
  router.push("/");
  await router.isReady();

  const wrapper = mount(Navbar, {
    props: {
      workspaces,
      user,
      minimal,
      workspace: "demo",
      isDark: false,
    },
    global: {
      plugins: [pinia, router, Buefy],
    },
  });

  return { wrapper, pinia };
}

describe("Navbar.vue — демо-панель (Task A7.2)", () => {
  it("панель отсутствует на минимальном (auth) navbar", async () => {
    const { wrapper } = await mountNavbar({ minimal: true });

    expect(wrapper.find(".tr-demo-panel").exists()).toBe(false);
  });

  it("панель присутствует в полном navbar кита", async () => {
    const { wrapper } = await mountNavbar();

    expect(wrapper.find(".tr-demo-panel").exists()).toBe(true);
  });

  it("селектор сценария двусторонне связан с useDemoStore().mode", async () => {
    const { wrapper } = await mountNavbar();
    const demoStore = useDemoStore();

    const select = wrapper.find(".tr-demo-panel select");
    expect(select.exists()).toBe(true);

    await select.setValue("loading");
    expect(demoStore.mode).toBe("loading");

    demoStore.setMode("error");
    await wrapper.vm.$nextTick();
    expect(select.element.value).toBe("error");
  });

  it("переключатели длинных подписей и плотных данных двусторонне связаны со стором", async () => {
    const { wrapper } = await mountNavbar();
    const demoStore = useDemoStore();

    const switches = wrapper.findAll(".tr-demo-panel input[type=checkbox]");
    expect(switches).toHaveLength(2);

    await switches[0].setValue(true);
    expect(demoStore.longLabels).toBe(true);

    await switches[1].setValue(true);
    expect(demoStore.denseData).toBe(true);
  });
});
