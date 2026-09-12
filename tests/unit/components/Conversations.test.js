import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import Buefy from "buefy";

import Conversations from "../../../src/components/Conversations.vue";
import ConversationDetail from "../../../src/components/conversations/ConversationDetail.vue";
import ConversationHistory from "../../../src/components/conversations/History.vue";
import ConversationSettings from "../../../src/components/conversations/Settings.vue";
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

// Task A7.3: список диалогов подключён к глобальному demo-режиму
// (`useDemoStore()`, Task A7.1) — тот же контракт, что и `Agents.vue`/
// `ChannelsView.vue`: loading/empty/error через `ListAsyncState`,
// permission-denied прямым `AsyncState`, partial — `b-message`-баннером
// поверх доступных диалогов.
//
// Task A8.4: the router mirrors `router.js`'s own nested shape — `conversation`/
// `conversation-settings` are children of `conversations-agent` — and
// `Conversations.vue` itself now owns a nested `<RouterView>` for the open
// dialog. Mounting `Conversations.vue` directly as the test root (like the
// pre-A8.4 version of this file did) would make that inner `<RouterView>`
// resolve at depth 0 instead of depth 1 — re-rendering `Conversations.vue`
// a second, inert time inside itself instead of reaching `ConversationDetail.vue`
// (the same class of artifact `agents/AgentDetail.test.js` documents for
// mounting a shell directly) — so the root here is a bare `<RouterView />`,
// same as `App.vue`, with the real page reached through it like in the app.
async function mountConversations({ demoMode, path = "/conversations" } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = "demo";

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/conversations", name: "conversations", component: Conversations },
      {
        path: "/conversations/:agentId",
        name: "conversations-agent",
        component: Conversations,
        children: [
          {
            path: ":conversationId",
            component: ConversationDetail,
            children: [
              { path: "", name: "conversation", component: ConversationHistory },
              { path: "settings", name: "conversation-settings", component: ConversationSettings },
            ],
          },
        ],
      },
    ],
  });
  router.push(path);
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(RouterView, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  // `ConversationDetail.vue`'s own `useSimulatedLoading` only starts its
  // random 300-900ms delay once `Conversations.vue`'s own loader clears and
  // mounts it (Task A8.4 nests it in the same tree) — advance well past the
  // worst case of both resolving back-to-back.
  await vi.advanceTimersByTimeAsync(2000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper, router };
}

describe("Conversations.vue — demo-состояния (Task A7.3)", () => {
  it("ready показывает существующий список диалогов", async () => {
    const { wrapper } = await mountConversations();

    expect(wrapper.findAll(".tr-conversation-item").length).toBeGreaterThan(0);
  });

  it("error: показывает ошибку и не рендерит список диалогов", async () => {
    const { wrapper } = await mountConversations({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBe(0);
  });

  it("empty: показывает пустое состояние даже когда диалоги реально есть", async () => {
    const { wrapper } = await mountConversations({ demoMode: "empty" });

    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBe(0);
  });

  it("permission-denied: показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountConversations({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBe(0);
  });

  it("partial: показывает баннер и оставляет доступные диалоги", async () => {
    const { wrapper } = await mountConversations({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.findAll(".tr-conversation-item").length).toBeGreaterThan(0);
  });
});

describe("Conversations.vue — адаптивный split-view (Task A8.4)", () => {
  it("без выбранного диалога показывает список и заглушку, is-list-view", async () => {
    const { wrapper } = await mountConversations({ path: "/conversations/1" });

    const root = wrapper.find(".tr-conversation-split");
    expect(root.classes()).toContain("is-list-view");
    expect(wrapper.find(".tr-conversations-placeholder").exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-chat").exists()).toBe(false);
  });

  it("выбор диалога держит список и деталь на одном экране, is-properties-view (настройки открыты по умолчанию) и is-active", async () => {
    const { wrapper } = await mountConversations({ path: "/conversations/1/1" });

    const root = wrapper.find(".tr-conversation-split");
    // Settings default to open (see `Conversations.vue`'s `propertiesOpen`
    // comment) — a freshly opened dialog lands on `is-properties-view`, not
    // `is-chat-view`.
    expect(root.classes()).toContain("is-properties-view");
    // Список остаётся смонтированным рядом с деталью — это и есть
    // split-view, а не полноэкранная замена.
    expect(wrapper.find(".tr-conversations-list").exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-chat").exists()).toBe(true);
    expect(wrapper.findComponent(ConversationHistory).exists()).toBe(true);

    const activeItem = wrapper.find(".tr-conversation-item.is-active");
    expect(activeItem.exists()).toBe(true);
  });

  it("кнопка «назад» переходит на /conversations/, снимая выбор диалога (fix)", async () => {
    const { wrapper, router } = await mountConversations({ path: "/conversations/1/1" });

    // A plain `dispatchEvent`, not `wrapper.trigger("click")`: this suite
    // switches from fake to real timers before interacting (see
    // `mountConversations` above), and Vue's own event-timestamp guard
    // (https://github.com/vuejs/test-utils/issues/1854) then discards
    // `trigger`'s synthetic event as stale even with test-utils' `_vts`
    // workaround, so the click never reaches the handler.
    wrapper.find(".tr-conversation-list-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(wrapper.find(".tr-conversation-split").classes()).toContain("is-list-view");
    // Real navigation now (this message's fix, replacing the old "flip a
    // shared view ref, leave the route untouched" mechanism) — the dialog is
    // no longer selected/mounted at all, and the route lands on plain
    // `/conversations/`.
    expect(router.currentRoute.value.name).toBe("conversations");
    expect(router.currentRoute.value.params.conversationId).toBeUndefined();
    expect(wrapper.find(".tr-conversation-chat").exists()).toBe(false);
  });

  it("после «назад» выбор другого диалога возвращает is-properties-view (regression, fix)", async () => {
    // Conversation id 4 (contact "Отдел закупок...") also belongs to agent
    // 2, same as the initially selected id 2 — picked by contact text
    // rather than "any non-active item": the agent filter no longer scopes
    // the list to the URL's `:agentId` (this message's fix), so the
    // unfiltered list here has every workspace conversation, not just
    // agent 2's two.
    const { wrapper, router } = await mountConversations({ path: "/conversations/2/2" });

    wrapper.find(".tr-conversation-list-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(wrapper.find(".tr-conversation-split").classes()).toContain("is-list-view");

    const items = wrapper.findAll(".tr-conversation-item");
    const otherItem = items.find(
      (item) => item.text().includes("Отдел закупок"),
    );
    expect(otherItem).toBeTruthy();

    otherItem.element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(router.currentRoute.value.params.conversationId).toBe("4");
    // Before the Task A8.4 fix, `mobileView` only re-derived on the
    // has-a-selection boolean, so reselecting a different conversation
    // while already on one left the view stuck on `is-list-view`. Lands on
    // `is-properties-view`, not `is-chat-view`, since `propertiesOpen` also
    // resets to its open-by-default state on every dialog switch.
    expect(wrapper.find(".tr-conversation-split").classes()).toContain("is-properties-view");
    expect(wrapper.find(".tr-conversation-chat").exists()).toBe(true);
  });
});

describe("Conversations.vue — фильтр по агенту не привязан к маршруту (fix)", () => {
  it("открытие диалога агента не двигает выпадающий список и не сужает список диалогов", async () => {
    // Agent 2's conversation route (`/conversations/2/2`) carries `:agentId`
    // "2" for `ConversationDetail.vue`'s own conversation lookup — that used
    // to also read back as the agent filter's selection (`agentFilter` was
    // a computed proxying `route.params.agentId`), so opening any dialog
    // silently applied the filter and hid every other agent's dialogs from
    // the list. `agentFilter` is a plain, route-independent ref now.
    const { wrapper } = await mountConversations({ path: "/conversations/2/2" });

    const agentDropdownTrigger = wrapper.get('[aria-label="Фильтр диалогов по агенту"]');
    expect(agentDropdownTrigger.text()).toContain("Все агенты");

    // The demo workspace has more than agent 2's own two conversations —
    // the still-unfiltered list must show all of them, not just those two.
    expect(wrapper.findAll(".tr-conversation-item").length).toBeGreaterThan(2);
  });
});

describe("Conversations.vue — «К диалогам» всегда переходит на /conversations/ (fix)", () => {
  it("работает и когда панель настроек уже закрыта (не только когда она открыта)", async () => {
    const { wrapper, router } = await mountConversations({ path: "/conversations/1/1" });

    // Close settings via the aside's own arrow-left first (not the ×, which
    // no longer exists — see the earlier message's fix) — the back button's
    // behavior must not depend on whether settings happen to be open.
    wrapper.find(".tr-conversation-properties-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(wrapper.find(".tr-conversation-properties").exists()).toBe(false);

    wrapper.find(".tr-conversation-list-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("conversations");
    expect(router.currentRoute.value.params.conversationId).toBeUndefined();
    expect(wrapper.find(".tr-conversation-split").classes()).toContain("is-list-view");
  });
});
