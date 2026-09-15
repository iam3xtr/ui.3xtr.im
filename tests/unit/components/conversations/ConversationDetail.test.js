import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { ref } from "vue";
import Buefy from "buefy";

import { conversationPropertiesKey } from "../../../../src/composables/conversationProperties.js";
import ConversationDetail from "../../../../src/components/conversations/ConversationDetail.vue";
import History from "../../../../src/components/conversations/History.vue";
import Settings from "../../../../src/components/conversations/Settings.vue";
import { useConversationsStore } from "../../../../src/stores/conversations.js";
import { useDemoStore } from "../../../../src/stores/demo.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

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

// Task A7.5: detail-shell диалога (`conversations/ConversationDetail.vue`)
// подключён к глобальному demo-режиму тем же приёмом, что
// `agents/AgentDetail.vue`/`knowledge/CollectionDetail.vue` (Task A7.4) —
// route-валидация всегда побеждает над demo-режимом.
//
// Task A8.4: `ConversationDetail.vue` is nested under `conversations-agent`
// now (see `router.js`); mounted standalone here (without the real
// `Conversations.vue` parent), so the test router still needs the plain
// `conversations` route its "back to list" button navigates to, and its own
// stub for `conversationPropertiesKey` (`Conversations.vue`'s provide) the
// same way the app's `Conversations.vue` would supply it.
async function mountConversationDetail({ agentId = "1", conversationId = "1", demoMode } = {}) {
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
      { path: "/conversations", name: "conversations", component: { template: "<div />" } },
      { path: "/conversations/:agentId", name: "conversations-agent", component: { template: "<div />" } },
      {
        path: "/conversations/:agentId/:conversationId",
        name: "conversation",
        component: ConversationDetail,
      },
    ],
  });
  router.push(`/conversations/${agentId}/${conversationId}`);
  await router.isReady();

  const propertiesOpen = ref(true);
  const openProperties = vi.fn(() => {
    propertiesOpen.value = true;
  });
  const closeProperties = vi.fn(() => {
    propertiesOpen.value = false;
  });

  // See `agents/AgentDetail.test.js` for why this needs
  // `advanceTimersByTimeAsync(2000)` rather than one delay window: mounting
  // the shell directly makes its own `<RouterView>` render itself once more
  // before reaching the real child tab, doubling up `useSimulatedLoading`.
  vi.useFakeTimers();
  const wrapper = mount(ConversationDetail, {
    global: {
      plugins: [pinia, router, Buefy],
      provide: {
        [conversationPropertiesKey]: { propertiesOpen, openProperties, closeProperties },
      },
    },
  });
  await vi.advanceTimersByTimeAsync(2000);
  vi.useRealTimers();
  await flushPromises();

  return {
    wrapper, router, propertiesOpen, openProperties, closeProperties, pinia,
  };
}

describe("ConversationDetail.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает содержимое найденного диалога", async () => {
    const { wrapper } = await mountConversationDetail();

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(false);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
    expect(wrapper.findComponent(History).exists()).toBe(true);
  });

  it("несуществующий диалог показывает route fallback независимо от demo-режима", async () => {
    const { wrapper } = await mountConversationDetail({ conversationId: "999", demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Диалог не найден");
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied для найденного диалога показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountConversationDetail({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.findComponent(History).exists()).toBe(false);
  });

  it("error для найденного диалога показывает ошибку через ListAsyncState", async () => {
    const { wrapper } = await mountConversationDetail({ demoMode: "error" });

    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Диалог не найден");
  });

  it("partial на вкладке истории показывает баннер и оставляет сообщения", async () => {
    const { wrapper } = await mountConversationDetail({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-messages").exists()).toBe(true);
  });
});

describe("ConversationDetail.vue — общая шапка и «назад к списку» (Task A8.4)", () => {
  it("шапка показывает имя контакта и канал/статус на обеих вкладках", async () => {
    const { wrapper } = await mountConversationDetail();

    expect(wrapper.find(".tr-conversation-identity").text()).toContain("Анна Смирнова");
    expect(wrapper.find(".tr-conversation-channel-context").exists()).toBe(true);
  });

  it("кнопка «назад» переходит на /conversations/, а не только скрывает панели", async () => {
    const { wrapper, router } = await mountConversationDetail();

    // A plain `dispatchEvent`, not `wrapper.trigger("click")`: this suite
    // switches from fake to real timers before interacting (see
    // `mountConversationDetail` above), and Vue's own event-timestamp guard
    // (https://github.com/vuejs/test-utils/issues/1854) then discards
    // `trigger`'s synthetic event as stale even with test-utils' `_vts`
    // workaround, so the click never reaches the handler.
    wrapper.find(".tr-conversation-list-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("conversations");
    expect(router.currentRoute.value.params.conversationId).toBeUndefined();
  });
});

describe("ConversationDetail.vue — настройки третьей колонкой открыты по умолчанию, без маршрута/NavbarTabs", () => {
  it("по умолчанию показывает историю и настройки одновременно, без шестерёнки и без NavbarTabs/меню в навбаре", async () => {
    const { wrapper } = await mountConversationDetail();

    expect(wrapper.findComponent(History).exists()).toBe(true);
    expect(wrapper.findComponent(Settings).exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-properties").exists()).toBe(true);
    expect(wrapper.find(".tr-conversation-settings-action").exists()).toBe(false);
    expect(wrapper.find(".tr-conversation-properties-close").exists()).toBe(false);
    expect(wrapper.find(".tr-navbar-tabs").exists()).toBe(false);
  });

  it("стрелка влево в шапке панели вызывает closeProperties(), после чего появляется шестерёнка", async () => {
    const { wrapper, propertiesOpen, closeProperties } = await mountConversationDetail();

    // Plain `dispatchEvent`, not `wrapper.trigger("click")` — see the
    // "назад" test above for why (Vue's event-timestamp guard discards
    // `trigger`'s synthetic event once this suite is on real timers).
    wrapper.find(".tr-conversation-properties-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(closeProperties).toHaveBeenCalledOnce();

    propertiesOpen.value = false;
    await flushPromises();

    expect(wrapper.find(".tr-conversation-properties").exists()).toBe(false);
    expect(wrapper.find(".tr-conversation-settings-action").exists()).toBe(true);
  });

  it("клик по шестерёнке вызывает openProperties() из conversationPropertiesKey", async () => {
    const { wrapper, propertiesOpen, openProperties } = await mountConversationDetail();

    propertiesOpen.value = false;
    await flushPromises();

    wrapper.find(".tr-conversation-settings-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(openProperties).toHaveBeenCalledOnce();
  });
});

describe("ConversationDetail.vue — конфликт handoff в композере (Task A10.5)", () => {
  // Conversation 5 (agentId 1): escalated, owned by Анна Смирнова with an
  // active lease — the current operator (Иван Петров, `profile.js`) cannot
  // send until they claim it or the owner releases/expires.
  it("отправка блокируется, когда диалог ведёт другой оператор — текст остаётся в поле", async () => {
    const { wrapper, pinia } = await mountConversationDetail({ agentId: "1", conversationId: "5" });
    setActivePinia(pinia);
    const store = useConversationsStore();
    const before = store.getConversation("demo", 1, 5).messages.length;

    const input = wrapper.find(".tr-conversation-composer-input input");
    await input.setValue("Секретный ответ клиенту");

    wrapper.find('[aria-label="Отправить"]').element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(wrapper.text()).toContain("Анна Смирнова");
    expect(wrapper.text()).toContain("Сообщение не отправлено");
    expect(store.getConversation("demo", 1, 5).messages.length).toBe(before);
    expect(input.element.value).toBe("Секретный ответ клиенту");
  });

  // Conversation 1 (agentId 1): escalated but unclaimed — sending is also
  // blocked until "Взять диалог" is used, distinct from the "owned by
  // another" conflict above (no owner name to blame).
  it("отправка блокируется в незанятом эскалированном диалоге до claim", async () => {
    const { wrapper, pinia } = await mountConversationDetail({ agentId: "1", conversationId: "1" });
    setActivePinia(pinia);
    const store = useConversationsStore();
    const before = store.getConversation("demo", 1, 1).messages.length;

    const input = wrapper.find(".tr-conversation-composer-input input");
    await input.setValue("Пробуем ответить без claim");

    wrapper.find('[aria-label="Отправить"]').element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(wrapper.text()).toContain("Сообщение не отправлено");
    expect(store.getConversation("demo", 1, 1).messages.length).toBe(before);
  });

  // Conversation 6 (agentId 3): escalated, owned by the current operator —
  // sending must work exactly as a non-escalated dialog would.
  it("владелец активного lease отправляет сообщение как обычно", async () => {
    const { wrapper, pinia } = await mountConversationDetail({ agentId: "3", conversationId: "6" });
    setActivePinia(pinia);
    const store = useConversationsStore();
    const before = store.getConversation("demo", 3, 6).messages.length;

    const input = wrapper.find(".tr-conversation-composer-input input");
    await input.setValue("Разобрался, отвечаю клиенту");

    wrapper.find('[aria-label="Отправить"]').element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(wrapper.text()).not.toContain("Сообщение не отправлено");
    expect(store.getConversation("demo", 3, 6).messages.length).toBe(before + 1);
    expect(input.element.value).toBe("");
  });

  // Claiming from the header immediately unblocks the composer for the same
  // dialog — «Взять диалог»/«Вернуть агенту» and sending are separate
  // commands, but claiming is what turns a blocked send into an allowed one.
  it("после «Взять диалог» отправка в ранее незанятом диалоге проходит", async () => {
    const { wrapper, pinia } = await mountConversationDetail({ agentId: "1", conversationId: "1" });
    setActivePinia(pinia);
    const store = useConversationsStore();

    wrapper.find(".tr-conversation-handoff-action").element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    const before = store.getConversation("demo", 1, 1).messages.length;
    const input = wrapper.find(".tr-conversation-composer-input input");
    await input.setValue("Теперь я веду диалог");

    wrapper.find('[aria-label="Отправить"]').element
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(store.getConversation("demo", 1, 1).messages.length).toBe(before + 1);
    expect(wrapper.text()).not.toContain("Сообщение не отправлено");
  });
});
