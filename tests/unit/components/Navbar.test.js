import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Navbar from "../../../src/components/Navbar.vue";
import { useDemoStore } from "../../../src/stores/demo.js";
import { useNotificationsStore } from "../../../src/stores/notifications.js";

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
      { path: "/agents/new/:step?", name: "agent-wizard", component: { template: "<div />" } },
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

  return { wrapper, pinia, router };
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

// Task A8.7 follow-up: минимальный (auth) Navbar не показывает user-меню, где
// обычно живёт переключатель темы, — у него свой контрол в правом углу.
describe("Navbar.vue — переключатель темы на минимальном navbar", () => {
  it("минимальный navbar без фона и с собственным переключателем темы", async () => {
    const { wrapper } = await mountNavbar({ minimal: true });

    expect(wrapper.find("header.tr-topbar").classes()).toContain("tr-topbar--minimal");

    const actions = wrapper.find(".tr-topbar__auth-actions");
    expect(actions.exists()).toBe(true);
    expect(actions.find(".tr-theme-toggle input[type=checkbox]").exists()).toBe(true);
    // No user menu on the minimal navbar — the toggle can't live there.
    expect(wrapper.find(".tr-user-dropdown").exists()).toBe(false);
  });

  it("переключатель темы двусторонне связан с v-model:is-dark", async () => {
    const { wrapper } = await mountNavbar({ minimal: true });

    const toggle = wrapper.find(".tr-topbar__auth-actions .tr-theme-toggle input[type=checkbox]");
    await toggle.setValue(true);

    expect(wrapper.emitted("update:isDark")).toEqual([[true]]);
  });

  it("полный navbar сохраняет фон и переключатель темы внутри user-меню", async () => {
    const { wrapper } = await mountNavbar();

    expect(wrapper.find("header.tr-topbar").classes()).not.toContain("tr-topbar--minimal");
    expect(wrapper.find(".tr-topbar__auth-actions").exists()).toBe(false);
    expect(wrapper.find(".tr-user-dropdown .tr-theme-toggle").exists()).toBe(true);
  });
});

// Task A8.1: resource-меню опционально и управляется useDemoStore().resourceMenuSize.
describe("Navbar.vue — опциональное resource-меню (Task A8.1)", () => {
  it("нет глобального поиска", async () => {
    const { wrapper } = await mountNavbar();

    expect(wrapper.find(".tr-search-field--navbar").exists()).toBe(false);
  });

  it("при resourceMenuSize=compact (значение по умолчанию) меню, разделитель и пункты присутствуют", async () => {
    const { wrapper } = await mountNavbar();

    expect(wrapper.find(".tr-topbar__links").exists()).toBe(true);
    expect(wrapper.findAll(".tr-topbar__links a")).toHaveLength(3);
    expect(wrapper.find(".tr-user-resource-separator").exists()).toBe(true);
    expect(wrapper.findAll(".tr-user-resource")).toHaveLength(3);
  });

  it("при resourceMenuSize=none меню, разделитель и пункты отсутствуют в DOM", async () => {
    const { wrapper } = await mountNavbar();
    const demoStore = useDemoStore();

    demoStore.setResourceMenuSize("none");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".tr-topbar__links").exists()).toBe(false);
    expect(wrapper.find(".tr-user-resource-separator").exists()).toBe(false);
    expect(wrapper.find(".tr-user-resource").exists()).toBe(false);
  });

  it("при resourceMenuSize=full реестр расширяется без второго набора вёрстки", async () => {
    const { wrapper } = await mountNavbar();
    const demoStore = useDemoStore();

    demoStore.setResourceMenuSize("full");
    await wrapper.vm.$nextTick();

    const compactCount = wrapper.findAll(".tr-topbar__links a").length;
    expect(compactCount).toBeGreaterThan(3);
    expect(wrapper.findAll(".tr-user-resource")).toHaveLength(compactCount);
  });

  it("селектор resource-меню в демо-панели двусторонне связан со стором", async () => {
    const { wrapper } = await mountNavbar();
    const demoStore = useDemoStore();

    const selects = wrapper.findAll(".tr-demo-panel select");
    expect(selects).toHaveLength(2);
    const select = selects[1];

    await select.setValue("none");
    expect(demoStore.resourceMenuSize).toBe("none");

    demoStore.setResourceMenuSize("full");
    await wrapper.vm.$nextTick();
    expect(select.element.value).toBe("full");
  });
});

// Task A9.2: постоянное действие «Создать агента» — доступно на любом
// кабинетном экране (полный Navbar), отсутствует на auth/служебных
// маршрутах (минимальный Navbar), ведёт в общий route-driven мастер.
describe("Navbar.vue — постоянный вход в мастер создания агента (Task A9.2)", () => {
  it("действие присутствует на полном (кабинетном) navbar", async () => {
    const { wrapper } = await mountNavbar();

    const button = wrapper.findAll(".tr-topbar__actions button")
      .find((btn) => btn.text().includes("Создать агента"));
    expect(button).toBeTruthy();
  });

  it("действие отсутствует на минимальном (auth) navbar", async () => {
    const { wrapper } = await mountNavbar({ minimal: true });

    expect(wrapper.find(".tr-topbar__actions").exists()).toBe(false);
    const button = wrapper.findAll("button")
      .find((btn) => btn.text().includes("Создать агента"));
    expect(button).toBeFalsy();
  });

  it("клик по действию открывает общий мастер, а не отдельную форму", async () => {
    const { wrapper, router } = await mountNavbar();

    const button = wrapper.findAll(".tr-topbar__actions button")
      .find((btn) => btn.text().includes("Создать агента"));
    await button.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });
});

// Task A8.2: колокольчик уведомлений — данные `useNotificationsStore()` для
// активного demo-пространства (переданного через `workspace`), не всегда
// видимый элемент.
describe("Navbar.vue — уведомления активного пространства (Task A8.2)", () => {
  it("колокольчик виден и показывает фактическое число непрочитанных уведомлений у демо-пространства", async () => {
    const { wrapper } = await mountNavbar();
    const notificationsStore = useNotificationsStore();
    const expectedUnread = notificationsStore.unreadCountFor("demo");

    expect(expectedUnread).toBeGreaterThan(0);

    const trigger = wrapper.find(".tr-notifications-trigger");
    expect(trigger.exists()).toBe(true);
    expect(trigger.attributes("aria-label")).toBe(
      `События: ${expectedUnread} непрочитанных`,
    );
    expect(trigger.find(".tr-notifications-trigger__badge").text()).toBe(
      String(expectedUnread),
    );
  });

  it("прочтение последнего уведомления скрывает колокольчик без перезагрузки", async () => {
    const { wrapper } = await mountNavbar();
    const notificationsStore = useNotificationsStore();

    notificationsStore.markAllRead("demo");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".tr-notifications-trigger").exists()).toBe(false);
    expect(wrapper.find(".tr-notifications-dropdown").exists()).toBe(false);
  });

  it("клик по одному уведомлению помечает его прочитанным и снижает счётчик", async () => {
    const { wrapper } = await mountNavbar();
    const notificationsStore = useNotificationsStore();
    const before = notificationsStore.unreadCountFor("demo");

    await wrapper.find(".tr-notification").trigger("click");

    expect(notificationsStore.unreadCountFor("demo")).toBe(before - 1);
  });

  it("пустое пространство изначально не рендерит колокольчик", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "dashboard", component: { template: "<div />" } },
      ],
    });
    router.push("/");
    await router.isReady();

    const wrapper = mount(Navbar, {
      props: {
        workspaces: [
          { id: "empty", name: "Пустое пространство", role: "Участник", plan: "Free" },
        ],
        user,
        workspace: "empty",
        isDark: false,
      },
      global: {
        plugins: [pinia, router, Buefy],
      },
    });

    expect(wrapper.find(".tr-notifications-trigger").exists()).toBe(false);
    expect(wrapper.find(".tr-notifications-dropdown").exists()).toBe(false);
  });
});
