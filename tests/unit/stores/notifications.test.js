import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useNotificationsStore } from "../../../src/stores/notifications.js";

// Task A8.2: fixture-уведомления Navbar, изолированные от `stores/workspace.js`
// — стор сам не знает про активное пространство, всё передаётся аргументом.

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
    const [first] = store.notificationsFor("demo");

    store.markRead("demo", first.id);

    expect(first.read).toBe(true);
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
});
