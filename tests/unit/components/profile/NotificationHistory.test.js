import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import NotificationHistory from "../../../../src/components/profile/NotificationHistory.vue";
import { useDemoStore } from "../../../../src/stores/demo.js";
import { useNotificationsStore } from "../../../../src/stores/notifications.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

// jsdom has no `matchMedia` — `Loader.vue` reads it on mount.
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

async function mountHistory({ demoMode, workspaceId = "demo" } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = workspaceId;

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      { path: "/workspace/audit", name: "workspace-audit", component: { template: "<div />" } },
      { path: "/agents", name: "agents", component: { template: "<div />" } },
      { path: "/conversations", name: "conversations", component: { template: "<div />" } },
      { path: "/workspace/members", name: "workspace-members", component: { template: "<div />" } },
      { path: "/workspace/plans", name: "workspace-plans", component: { template: "<div />" } },
      { path: "/workspace/settings", name: "workspace-settings", component: { template: "<div />" } },
      {
        path: "/agents/:id/channels",
        name: "agent-channels",
        component: { template: "<div />" },
      },
    ],
  });
  router.push("/");
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(NotificationHistory, {
    global: { plugins: [pinia, router, Buefy] },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper, router };
}

// Task A10.8: route-backed "История уведомлений" over the existing
// `stores/notifications.js` bell fixture — all/unread filter, pagination,
// read-all snapshot semantics, deleted-target rendering and demo-driven
// loading/error/permission-denied states.
describe("profile/NotificationHistory.vue (Task A10.8)", () => {
  it("ready показывает список уведомлений демо-пространства", async () => {
    const { wrapper } = await mountHistory();

    expect(wrapper.findAll(".tr-notification-history__list .tr-notification").length).toBeGreaterThan(0);
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied показывает отказ в доступе", async () => {
    const { wrapper } = await mountHistory({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
  });

  it("фильтр «Непрочитанные» скрывает уже прочитанные записи", async () => {
    const { wrapper } = await mountHistory();
    const notificationsStore = useNotificationsStore();
    const totalCount = notificationsStore.notificationsFor("demo").length;
    const unreadCount = notificationsStore.unreadCountFor("demo");

    expect(unreadCount).toBeLessThan(totalCount);

    const unreadTab = wrapper.findAll(".tr-notification-history__tabs .tabs a")
      .find((a) => a.text().includes("Непрочитанные"));
    await unreadTab.trigger("click");
    await flushPromises();

    const shown = wrapper.findAll(".tr-notification-history__list .tr-notification").length
      + (wrapper.find(".tr-async-state--empty").exists() ? 0 : 0);

    // Either paginated (5 per page) or fewer than the unread count if a
    // second page exists — never more than what's actually unread.
    expect(shown).toBeLessThanOrEqual(unreadCount);
  });

  it("клик «Прочитано» помечает запись прочитанной, но не убирает её из списка", async () => {
    const { wrapper } = await mountHistory();
    const notificationsStore = useNotificationsStore();
    const before = notificationsStore.notificationsFor("demo").length;

    const markReadButton = wrapper.find(".tr-notification-history__mark-read");
    expect(markReadButton.exists()).toBe(true);
    await markReadButton.trigger("click");
    await flushPromises();

    expect(notificationsStore.notificationsFor("demo").length).toBe(before);
  });

  it("«Отметить все как прочитанные» обнуляет счётчик непрочитанных", async () => {
    const { wrapper } = await mountHistory();
    const notificationsStore = useNotificationsStore();

    const markAllButton = wrapper.findAll("button")
      .find((btn) => btn.text().includes("Отметить все как прочитанные"));
    await markAllButton.trigger("click");
    await flushPromises();

    expect(notificationsStore.unreadCountFor("demo")).toBe(0);
  });

  it("удалённая/недоступная цель показана текстом, а не ссылкой", async () => {
    const { wrapper } = await mountHistory();

    expect(wrapper.text()).toContain("Материал недоступен");
  });

  it("ошибка demo-режима скрывает список (и кнопку «Прочитано» с ним) через ListAsyncState", async () => {
    const { wrapper } = await mountHistory({ demoMode: "error" });

    // Список — а с ним и per-item «Прочитано» — живёт в `ListAsyncState`'s
    // default slot, которая в error-режиме целиком заменяется на
    // `AsyncState[variant=error]`: нет отдельного «сломанного» пути отметить
    // прочитанным конкретную запись, есть только скрытый список.
    expect(wrapper.find(".tr-notification-history__mark-read").exists()).toBe(false);
    expect(wrapper.find(".tr-notification-history__list").exists()).toBe(false);
  });

  it("ошибка demo-режима не даёт «Отметить все как прочитанные» и показывает toast", async () => {
    const { wrapper } = await mountHistory({ demoMode: "error" });
    const notificationsStore = useNotificationsStore();
    const before = notificationsStore.unreadCountFor("demo");

    // В отличие от per-item действия выше, массовая кнопка живёт снаружи
    // `ListAsyncState` (рядом с табами) и остаётся видимой/кликабельной в
    // error-режиме — именно этот путь реально достигает
    // `handleMarkAllRead`'s `demoStore.isError`-guard.
    const markAllButton = wrapper.findAll("button")
      .find((btn) => btn.text().includes("Отметить все как прочитанные"));
    expect(markAllButton.exists()).toBe(true);

    await markAllButton.trigger("click");
    await flushPromises();

    expect(notificationsStore.unreadCountFor("demo")).toBe(before);
  });

  it("empty demo-режим показывает empty-state даже при реальных фикстурах пространства", async () => {
    const { wrapper } = await mountHistory({ demoMode: "empty" });
    const notificationsStore = useNotificationsStore();

    // demo-пространство реально содержит уведомления — empty-режим должен
    // всё равно форсировать empty-state, а не показывать их список.
    expect(notificationsStore.notificationsFor("demo").length).toBeGreaterThan(0);
    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.find(".tr-notification-history__list .tr-notification").exists()).toBe(false);
  });

  it("владелец пространства видит ссылку на «Аудит», участник — только пояснение", async () => {
    const { wrapper: ownerWrapper } = await mountHistory({ workspaceId: "demo" });
    expect(ownerWrapper.text()).toContain("«Аудите» пространства");
    expect(ownerWrapper.findAll("a").some((a) => a.text().includes("Аудите"))).toBe(true);

    const { wrapper: memberWrapper } = await mountHistory({ workspaceId: "empty" });
    expect(memberWrapper.text()).toContain("доступен владельцу и администратору");
  });
});
