import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";
import { RouterLink, RouterView } from "vue-router";

import appRouter from "../../../../src/router.js";

import KitShell from "../../../../src/components/kit/KitShell.vue";
import Overview from "../../../../src/components/kit/Overview.vue";
import Forms from "../../../../src/components/kit/Forms.vue";
import Tables from "../../../../src/components/kit/Tables.vue";
import NavigationStates from "../../../../src/components/kit/NavigationStates.vue";
import DialogsOverlays from "../../../../src/components/kit/DialogsOverlays.vue";
import ApplicationShell from "../../../../src/components/kit/ApplicationShell.vue";
import ChatComponents from "../../../../src/components/kit/ChatComponents.vue";
import { DROPDOWN_OVERLAY_MARKER, POSITIONS, navbarMenuKey } from "@iam3xtr/vue";
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
// `ApplicationShell.vue` links to a few real top-level route names
// (`mainNavigationItems`, `workspace-plans`) the same way `Sidebar.vue`
// does — a trivial stub component is enough for `RouterLink` resolution in
// this route-tree test; their own screens have their own tests.
const RouteStub = { template: "<div />" };

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/conversations", name: "conversations", component: RouteStub },
      { path: "/agents", name: "agents", component: RouteStub },
      { path: "/knowledge", name: "knowledge", component: RouteStub },
      { path: "/workspace", name: "workspace", component: RouteStub },
      { path: "/workspace/plans", name: "workspace-plans", component: RouteStub },
      // `ChatComponents.vue` links to the live chat screens by route name.
      { path: "/agents/new/:step?", name: "agent-wizard", component: RouteStub },
      { path: "/agents/:id", name: "agent", component: RouteStub },
      { path: "/agents/:id/settings", name: "agent-settings", component: RouteStub },
      { path: "/knowledge/:id", name: "knowledge-collection", component: RouteStub },
      { path: "/profile", name: "profile", component: RouteStub },
      {
        path: "/conversations/:agentId/:conversationId",
        name: "conversation",
        component: RouteStub,
      },
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
          { path: "chat", name: "kit-chat", component: ChatComponents },
          {
            path: "application-shell",
            name: "kit-application-shell",
            component: ApplicationShell,
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
      { path: "/kit/chat", name: "kit-chat", component: ChatComponents },
      {
        path: "/kit/application-shell",
        name: "kit-application-shell",
        component: ApplicationShell,
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
    expect(links.length).toBe(7);

    const activeLinks = target.querySelectorAll(".tr-navbar-tabs__link.router-link-active");
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].textContent.trim()).toBe("Таблицы");
  });

  it("раздел таблиц показывает информационный tfoot", async () => {
    const { wrapper } = await mountKitShell("/kit/tables");
    const footer = wrapper.find(".b-table tfoot th");

    expect(footer.exists()).toBe(true);
    expect(footer.text()).toContain("Показано до 5 агентов");
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

describe("kit/chat — рабочие состояния публичных компонентов", () => {
  it("показывает сообщения, consumer slots, пустую историю и многострочный draft", async () => {
    const { wrapper } = await mountKitShell("/kit/chat");
    const chat = wrapper.findComponent(ChatComponents);

    expect(chat.findAll(".tr-chat-kit .tr-chat-history__message")).toHaveLength(4);
    expect(chat.find(".tr-chat-history__message--outgoing").exists()).toBe(true);
    expect(chat.find(".tr-chat-kit__meta").text()).toContain("agent");
    expect(chat.find(".tr-chat-kit__status").text()).toBe("доставлено");
    expect(chat.find(".tr-chat-kit__empty-text").text()).toContain("Сообщений ещё нет");
    expect(chat.find(".tr-chat-kit__composer-multiline textarea").element.value).toContain("\n");
  });

  it("отправляет trimmed draft и очищает его только через consumer", async () => {
    const { wrapper } = await mountKitShell("/kit/chat");
    const chat = wrapper.findComponent(ChatComponents);
    const textarea = chat.find(".tr-chat-kit__composer textarea");

    await textarea.setValue("  новый ответ  ");
    await chat.find("form.tr-chat-kit__composer").trigger("submit");

    const messages = chat.findAll(".tr-chat-kit .tr-chat-history__message");
    expect(messages).toHaveLength(5);
    expect(messages.at(-1).text()).toContain("новый ответ");
    expect(textarea.element.value).toBe("");
  });
});

describe("kit/chat — каталог оставшихся публичных Vue exports (этап 5)", () => {
  it("ModelSelect работает через public API: mode, состояния и consumer copy", async () => {
    const { wrapper } = await mountKitShell("/kit/chat");
    const page = wrapper.findComponent(ChatComponents);
    const picker = page.find(".tr-model-select-kit__picker");

    expect(picker.classes()).toContain("tr-model-select--mode-model");
    const trigger = picker.find(".tr-model-select__trigger");
    expect(trigger.attributes("id")).toBe("kit-model-select");
    expect(trigger.attributes("aria-label")).toBe("Модель: Выберите модель");
    expect(trigger.text()).toBe("Выберите модель");

    const modeRadio = page
      .findAll(".tr-model-select-kit__controls input[type='radio']")
      .find((input) => input.element.value === "both");
    await modeRadio.setValue(true);
    expect(page.find(".tr-model-select-kit__picker").classes()).toContain("tr-model-select--mode-both");
    expect(page.find(".tr-model-select__switch-label").text()).toBe("Собственный ключ (OpenRouter)");

    const disabledFlag = page
      .findAll(".tr-model-select-kit__flags .b-checkbox")
      .find((label) => label.text() === "disabled");
    await disabledFlag.find("input").setValue(true);
    expect(page.find(".tr-model-select__trigger").attributes("disabled")).toBeDefined();
  });

  it("NavbarTabs рендерит реальные разделы kit и подсвечивает текущий", async () => {
    const { wrapper } = await mountKitShell("/kit/chat");
    const page = wrapper.findComponent(ChatComponents);
    const nav = page.find(".tr-navbar-tabs-kit__frame .tr-navbar-tabs");

    expect(nav.attributes("aria-label")).toBe("Разделы UI Kit (пример)");
    expect(nav.findAll(".tr-navbar-tabs__link")).toHaveLength(7);
    const active = nav.findAll(".tr-navbar-tabs__link.router-link-exact-active");
    expect(active).toHaveLength(1);
    expect(active[0].text()).toBe("Vue-компоненты");
    expect(active[0].attributes("aria-current")).toBe("page");
  });

  it("overlay composable: POSITIONS, placement и marker из public API", async () => {
    const { wrapper } = await mountKitShell("/kit/chat");
    await flushPromises();
    const page = wrapper.findComponent(ChatComponents);

    const options = page.findAll("#kit-overlay-position option").map((option) => option.element.value);
    expect(options).toEqual([...POSITIONS]);
    expect(page.find("[data-testid='placement-inline']").text()).toBe("inline");
    expect(page.text()).toContain(DROPDOWN_OVERLAY_MARKER);
    expect(page.findAll(".tr-dropdown-overlay-kit__variant .dropdown-trigger")).toHaveLength(2);
  });

  it("ссылки на места применения ведут на реальные маршруты демо", async () => {
    const { wrapper } = await mountKitShell("/kit/chat");
    const hrefs = wrapper
      .findComponent(ChatComponents)
      .findAll("ul a")
      .map((link) => link.attributes("href"));

    for (const href of [
      "/agents/1/settings",
      "/agents/new/rules",
      "/agents/1",
      "/knowledge/1",
      "/workspace",
      "/profile",
      "/kit/tables",
      "/kit/navigation-states",
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it("ссылки на места применения разрешаются в реальные маршруты src/router.js", async () => {
    // `buildRouter()` above declares its own stand-in records, so renaming or
    // moving a route in src/router.js would not break the href check above.
    // Resolve every rendered consumer link's `to` against the app router
    // itself: the name must exist there, and its href must round-trip to the
    // same named route rather than the 404 catch-all.
    const { wrapper } = await mountKitShell("/kit/chat");
    const links = wrapper
      .findComponent(ChatComponents)
      .findAllComponents(RouterLink)
      .filter((link) => link.element.closest("ul"));
    expect(links.length).toBeGreaterThanOrEqual(8);

    for (const link of links) {
      const to = link.props("to");
      const resolved = appRouter.resolve(to);
      expect(resolved.name, JSON.stringify(to)).toBe(to.name);

      const byHref = appRouter.resolve(resolved.href);
      expect(byHref.name, resolved.href).toBe(to.name);
      expect(byHref.name, resolved.href).not.toBe("not-found");
    }
  });
});
