import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import Navbar from "../../../src/components/Navbar.vue";
import OverlayDropdown from "../../../src/components/common/OverlayDropdown.vue";
import { useDemoStore } from "../../../src/stores/demo.js";
import { useNotificationsStore } from "../../../src/stores/notifications.js";

// Task A7.2: изолированная демо-панель в Navbar — двусторонне связана с
// `useDemoStore()` и скрыта на минимальном (auth) navbar.

const workspaces = [
  { id: "demo", name: "Demo", role: "Владелец", plan: "Pro" },
];

const user = { firstName: "Иван", lastName: "Петров", role: "Владелец" };

// The demo store persists its state to the kit's `localStorage`; without
// isolation a flag enabled in one test (e.g. showCreateAgentAction) leaks into
// the following ones. As in tests/unit/stores/demo.test.js, each test gets a
// fresh in-memory storage.
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    expect(switches.length).toBeGreaterThanOrEqual(3);

    await switches[0].setValue(true);
    expect(demoStore.longLabels).toBe(true);

    await switches[1].setValue(true);
    expect(demoStore.denseData).toBe(true);

    await switches[2].setValue(true);
    expect(demoStore.showCreateAgentAction).toBe(true);
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
// Stage 4: visibility is driven by the kit-only toggle
// `useDemoStore().showCreateAgentAction` (default `false`) — both entry
// points (desktop button and mobile menu item) are hidden or shown together
// with the related separator; on the minimal navbar neither the toggle nor
// the actions appear.
describe("Navbar.vue — действие «Создать агента» (Task A9.2 + этап 4)", () => {
  it("по умолчанию скрыто и на desktop actions, и в mobile menu", async () => {
    const { wrapper } = await mountNavbar();

    const desktopButton = wrapper.findAll(".tr-topbar__actions button")
      .find((btn) => btn.text().includes("Создать агента"));
    expect(desktopButton).toBeFalsy();

    const mobileItem = wrapper.findAll(".tr-mobile-nav .dropdown-item")
      .find((item) => item.text().includes("Создать агента"));
    expect(mobileItem).toBeFalsy();
  });

  it("включение переключателя в Demo-панели открывает оба входа синхронно", async () => {
    const { wrapper } = await mountNavbar();
    const demoStore = useDemoStore();

    expect(wrapper.findAll(".tr-topbar__actions button")
      .find((btn) => btn.text().includes("Создать агента"))).toBeFalsy();

    demoStore.setShowCreateAgentAction(true);
    await wrapper.vm.$nextTick();

    const desktopButton = wrapper.findAll(".tr-topbar__actions button")
      .find((btn) => btn.text().includes("Создать агента"));
    expect(desktopButton).toBeTruthy();

    const mobileItem = wrapper.findAll(".tr-mobile-nav .dropdown-item")
      .find((item) => item.text().includes("Создать агента"));
    expect(mobileItem).toBeTruthy();
  });

  it("выключение переключателя скрывает оба входа и не оставляет пустой разделитель", async () => {
    const { wrapper } = await mountNavbar();
    const demoStore = useDemoStore();
    demoStore.setShowCreateAgentAction(true);
    await wrapper.vm.$nextTick();

    demoStore.setShowCreateAgentAction(false);
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll(".tr-topbar__actions button")
      .find((btn) => btn.text().includes("Создать агента"))).toBeFalsy();
    expect(wrapper.findAll(".tr-mobile-nav .dropdown-item")
      .find((item) => item.text().includes("Создать агента"))).toBeFalsy();
    // "Create agent" is the first pair in the mobile menu above the main
    // navigation; removing it also removes the related separator, so the
    // first remaining `dropdown-item` already belongs to the main navigation.
    const firstMobileItem = wrapper.findAll(".tr-mobile-nav .dropdown-item")[0];
    expect(firstMobileItem?.text()).not.toContain("Создать агента");
  });

  it("действие отсутствует на минимальном (auth) navbar даже при включённом переключателе", async () => {
    const { wrapper } = await mountNavbar({ minimal: true });
    const demoStore = useDemoStore();
    demoStore.setShowCreateAgentAction(true);
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".tr-topbar__actions").exists()).toBe(false);
    expect(wrapper.find(".tr-mobile-nav").exists()).toBe(false);
    expect(wrapper.findAll("button")
      .find((btn) => btn.text().includes("Создать агента"))).toBeFalsy();
  });

  it("desktop-кнопка открывает общий route-driven мастер", async () => {
    const { wrapper, router } = await mountNavbar();
    const demoStore = useDemoStore();
    demoStore.setShowCreateAgentAction(true);
    await wrapper.vm.$nextTick();

    const button = wrapper.findAll(".tr-topbar__actions button")
      .find((btn) => btn.text().includes("Создать агента"));
    await button.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });

  it("пункт mobile-меню открывает общий route-driven мастер", async () => {
    const { wrapper, router } = await mountNavbar();
    const demoStore = useDemoStore();
    demoStore.setShowCreateAgentAction(true);
    await wrapper.vm.$nextTick();

    const item = wrapper.findAll(".tr-mobile-nav .dropdown-item")
      .find((el) => el.text().includes("Создать агента"));
    await item.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("agent-wizard");
  });
});

// Stage 4: the Demo panel trigger becomes icon-only — the "Demo" text label
// is removed so the right side of the Navbar does not grow; the accessible
// name and the panel-name tooltip are kept.
describe("Navbar.vue — icon-only Demo trigger (этап 4)", () => {
  it("текстовая подпись «Demo» отсутствует, иконка и доступное имя сохранены", async () => {
    const { wrapper } = await mountNavbar();

    const trigger = wrapper.find(".tr-demo-panel-trigger");
    expect(trigger.exists()).toBe(true);
    expect(trigger.attributes("aria-label")).toBe("Панель демо-режима кита");
    expect(trigger.attributes("title")).toBe("Панель демо-режима кита");
    expect(trigger.text()).not.toContain("Demo");
    expect(trigger.find("i.mdi-tune-variant").exists()).toBe(true);
  });

  it("icon-only Demo trigger отсутствует на минимальном (auth) navbar", async () => {
    const { wrapper } = await mountNavbar({ minimal: true });

    expect(wrapper.find(".tr-demo-panel-trigger").exists()).toBe(false);
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

// Task A10.7 (W2, `.plan` "Три языка и пространство на младших тарифах"):
// один личный workspace не навязывает выбор — переключатель сворачивается до
// второстепенного пункта «Пространство для команды» без списка для выбора;
// как только пространств больше одного, возвращается обычный переключатель.
describe("Navbar.vue — W2: переключатель пространства (Task A10.7)", () => {
  it("один workspace: без списка и иконки переключения, вторичный пункт «Пространство для команды»", async () => {
    const { wrapper } = await mountNavbar();

    const trigger = wrapper.find(".tr-workspace-trigger");
    expect(trigger.text()).toContain("Пространство для команды");
    expect(trigger.find(".tr-workspace-switch-icon").exists()).toBe(false);
    expect(trigger.attributes("aria-label")).toBe("Пространство для команды");

    // No selectable list — nothing to switch to.
    expect(wrapper.findAll(".tr-workspace-dropdown [role=listitem]")).toHaveLength(0);

    const mobileLabel = wrapper.find(".tr-mobile-workspace__label");
    expect(mobileLabel.text()).toContain("Пространство для команды");
    expect(wrapper.find(".tr-mobile-workspace select").exists()).toBe(false);
    expect(wrapper.find(".tr-mobile-workspace__value").text()).toBe("Demo");
  });

  it("несколько workspace: обычный переключатель со списком и активным контекстом", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", name: "dashboard", component: { template: "<div />" } }],
    });
    router.push("/");
    await router.isReady();

    const multipleWorkspaces = [
      { id: "demo", name: "Demo", role: "Владелец", plan: "Pro" },
      { id: "trickster", name: "Trickster Team", role: "Администратор", plan: "Superior" },
    ];

    const wrapper = mount(Navbar, {
      props: {
        workspaces: multipleWorkspaces,
        user,
        workspace: "demo",
        isDark: false,
      },
      global: { plugins: [pinia, router, Buefy] },
    });

    const trigger = wrapper.find(".tr-workspace-trigger");
    expect(trigger.text()).toContain("Demo");
    expect(trigger.text()).not.toContain("Пространство для команды");
    expect(trigger.find(".tr-workspace-switch-icon").exists()).toBe(true);

    expect(wrapper.findAll(".tr-workspace-dropdown [role=listitem]")).toHaveLength(2);

    const mobileLabel = wrapper.find(".tr-mobile-workspace__label");
    expect(mobileLabel.text()).toBe("Пространство");
    expect(wrapper.find(".tr-mobile-workspace select").exists()).toBe(true);
  });
});

// Task A10.8: "История уведомлений"/"Помощь" are permanent user-menu entries,
// independent of the bell — reachable even with zero unread (bell hidden).
describe("Navbar.vue — постоянные пункты «История уведомлений»/«Помощь» (Task A10.8)", () => {
  async function mountNavbarWithHistoryRoutes() {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "dashboard", component: { template: "<div />" } },
        { path: "/profile/notifications", name: "notification-history", component: { template: "<div />" } },
        { path: "/profile/help", name: "help", component: { template: "<div />" } },
      ],
    });
    router.push("/");
    await router.isReady();

    const wrapper = mount(Navbar, {
      props: { workspaces, user, workspace: "demo", isDark: false },
      global: { plugins: [pinia, router, Buefy] },
    });

    return { wrapper, router };
  }

  it("пункты присутствуют даже когда непрочитанных нет и колокольчик скрыт", async () => {
    const { wrapper } = await mountNavbarWithHistoryRoutes();
    const notificationsStore = useNotificationsStore();
    notificationsStore.markAllRead("demo");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".tr-notifications-trigger").exists()).toBe(false);

    const items = wrapper.findAll(".tr-user-dropdown .dropdown-item")
      .map((item) => item.text());
    expect(items.some((text) => text.includes("История уведомлений"))).toBe(true);
    expect(items.some((text) => text.includes("Помощь"))).toBe(true);
  });

  it("клик по «История уведомлений» ведёт на named route", async () => {
    const { wrapper, router } = await mountNavbarWithHistoryRoutes();

    const item = wrapper.findAll(".tr-user-dropdown .dropdown-item")
      .find((el) => el.text().includes("История уведомлений"));
    await item.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("notification-history");
  });

  it("клик по «Помощь» ведёт на named route", async () => {
    const { wrapper, router } = await mountNavbarWithHistoryRoutes();

    const item = wrapper.findAll(".tr-user-dropdown .dropdown-item")
      .find((el) => el.text().includes("Помощь"));
    await item.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("help");
  });
});

// .plan stage 5, audited demo dropdowns: the desktop menus go through the
// shared overlay adapter; the mobile-only main menu keeps plain Buefy
// mobile-modal behaviour.
describe("Navbar.vue — общий overlay desktop dropdown", () => {
  it("desktop-меню используют OverlayDropdown, мобильное меню — нет", async () => {
    const { wrapper } = await mountNavbar();
    await flushPromises();

    const overlayClasses = wrapper.findAllComponents(OverlayDropdown)
      .map((item) => item.classes());
    expect(overlayClasses.some((classes) => classes.includes("tr-demo-panel"))).toBe(true);
    expect(overlayClasses.some((classes) => classes.includes("tr-workspace-dropdown"))).toBe(true);
    expect(overlayClasses.some((classes) => classes.includes("tr-notifications-dropdown"))).toBe(true);
    expect(overlayClasses.some((classes) => classes.includes("tr-user-dropdown"))).toBe(true);
    expect(overlayClasses.some((classes) => classes.includes("tr-mobile-nav"))).toBe(false);
  });

  it("focus trap пользовательского меню получает меню из адаптера", async () => {
    const { wrapper } = await mountNavbar();
    await flushPromises();

    const userDropdown = wrapper.findAllComponents(OverlayDropdown)
      .find((item) => item.classes().includes("tr-user-dropdown"));
    const menu = userDropdown.vm.dropdown.$refs.dropdownMenu;
    expect(menu.classList.contains("dropdown-menu")).toBe(true);
    expect(userDropdown.element.contains(menu)).toBe(true);
  });
});
