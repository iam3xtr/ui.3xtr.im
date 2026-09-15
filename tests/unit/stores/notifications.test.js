import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { DEFAULT_RECIPIENT_ID, useNotificationsStore } from "../../../src/stores/notifications.js";

// Task A8.2: fixture-уведомления Navbar, изолированные от `stores/workspace.js`
// — стор сам не знает про активное пространство, всё передаётся аргументом.
// Task A10.8 extends the same store with per-recipient read state (`readBy`),
// a read-all snapshot guarantee and deleted/unavailable targets, consumed by
// `profile/NotificationHistory.vue`'s route-backed history over this fixture.

describe("stores/notifications", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("у демо-пространства есть непрочитанные уведомления по умолчанию", () => {
    const store = useNotificationsStore();

    expect(store.unreadCountFor("demo")).toBeGreaterThan(0);
    expect(store.notificationsFor("demo").length).toBeGreaterThan(0);
  });

  it("у пустого/неизвестного пространства нет уведомлений", () => {
    const store = useNotificationsStore();

    expect(store.notificationsFor("empty")).toEqual([]);
    expect(store.unreadCountFor("empty")).toBe(0);
    expect(store.notificationsFor("does-not-exist")).toEqual([]);
    expect(store.unreadCountFor("does-not-exist")).toBe(0);
  });

  it("markRead помечает одно уведомление и снижает счётчик непрочитанных", () => {
    const store = useNotificationsStore();
    const before = store.unreadCountFor("demo");
    const [firstBefore] = store.notificationsFor("demo");

    store.markRead("demo", firstBefore.id);

    const [firstAfter] = store.notificationsFor("demo");
    expect(firstAfter.read).toBe(true);
    expect(store.unreadCountFor("demo")).toBe(before - 1);
  });

  it("markRead для чужого пространства не влияет на другое", () => {
    const store = useNotificationsStore();
    const demoBefore = store.unreadCountFor("demo");
    const [tricksterFirst] = store.notificationsFor("trickster");

    store.markRead("trickster", tricksterFirst.id);

    expect(store.unreadCountFor("demo")).toBe(demoBefore);
    expect(store.unreadCountFor("trickster")).toBe(0);
  });

  it("markAllRead обнуляет счётчик непрочитанных для пространства", () => {
    const store = useNotificationsStore();

    store.markAllRead("demo");

    expect(store.unreadCountFor("demo")).toBe(0);
    expect(
      store.notificationsFor("demo").every((item) => item.read),
    ).toBe(true);
  });

  it("каждый стор получает собственную копию фикстуры", () => {
    const first = useNotificationsStore();
    first.markAllRead("demo");

    setActivePinia(createPinia());
    const second = useNotificationsStore();

    expect(second.unreadCountFor("demo")).toBeGreaterThan(0);
  });

  // Task A10.8 acceptance: "Read одного recipient не меняет другого."
  it("read одного получателя не меняет статус другого получателя", () => {
    const store = useNotificationsStore();
    const [first] = store.notificationsFor("demo", DEFAULT_RECIPIENT_ID);
    const colleagueBefore = store.unreadCountFor("demo", "colleague");

    store.markRead("demo", first.id, DEFAULT_RECIPIENT_ID);

    expect(
      store.notificationsFor("demo", DEFAULT_RECIPIENT_ID).find((item) => item.id === first.id).read,
    ).toBe(true);
    expect(
      store.notificationsFor("demo", "colleague").find((item) => item.id === first.id).read,
    ).toBe(false);
    expect(store.unreadCountFor("demo", "colleague")).toBe(colleagueBefore);
  });

  // Task A10.8 acceptance: "Read не удаляет запись."
  it("read не удаляет запись из истории", () => {
    const store = useNotificationsStore();
    const before = store.notificationsFor("demo").length;
    const [first] = store.notificationsFor("demo");

    store.markRead("demo", first.id);

    expect(store.notificationsFor("demo").length).toBe(before);
    expect(store.notificationsFor("demo").some((item) => item.id === first.id)).toBe(true);
  });

  // Task A10.8 acceptance: "Read-all относится к увиденному snapshot; новое
  // уведомление остаётся непрочитанным."
  it("markAllRead — snapshot-операция: новое уведомление после неё остаётся непрочитанным", () => {
    const store = useNotificationsStore();

    store.markAllRead("demo");
    expect(store.unreadCountFor("demo")).toBe(0);

    store.receiveNotification("demo", {
      id: "demo-new",
      title: "Новое событие",
      description: "Появилось после read-all.",
      time: "Только что",
    });

    expect(store.unreadCountFor("demo")).toBe(1);
    expect(store.notificationsFor("demo").find((item) => item.id === "demo-new").read).toBe(false);
  });

  it("недоступная цель уведомления помечена target.available = false", () => {
    const store = useNotificationsStore();
    const deleted = store.notificationsFor("demo").find((item) => item.target && !item.target.available);

    expect(deleted).toBeDefined();
  });
});
