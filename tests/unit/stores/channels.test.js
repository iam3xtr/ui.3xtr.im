import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  buildTelegramIdentity,
  getChannelConnectionState,
  getChannelsNeedingAttention,
  hasWorkingChannel,
  useChannelsStore,
} from "../../../src/stores/channels.js";

// Task A9.6: S2 per-channel connection-state projection — a pure derivation
// of `Channel.status`, not a second fixture enum. No Pinia instance needed:
// these functions take plain channel objects/arrays.
describe("stores/channels — S2 connection-state (Task A9.6)", () => {
  it("getChannelConnectionState отражает active/error/displaced/inactive/paused", () => {
    expect(getChannelConnectionState({ status: "active" })).toBe("connected");
    expect(getChannelConnectionState({ status: "error" })).toBe("error");
    expect(getChannelConnectionState({ status: "displaced" })).toBe("error");
    expect(getChannelConnectionState({ status: "inactive" })).toBe("not_connected");
    expect(getChannelConnectionState({ status: "paused" })).toBe("not_connected");
  });

  it("getChannelConnectionState для отсутствующего канала — not_connected", () => {
    expect(getChannelConnectionState(undefined)).toBe("not_connected");
    expect(getChannelConnectionState(null)).toBe("not_connected");
  });

  it("hasWorkingChannel: true только когда хотя бы один канал connected", () => {
    expect(hasWorkingChannel([])).toBe(false);
    expect(hasWorkingChannel([{ status: "error" }, { status: "inactive" }])).toBe(false);
    expect(hasWorkingChannel([{ status: "error" }, { status: "active" }])).toBe(true);
  });

  it("getChannelsNeedingAttention отбирает только error/displaced, не paused/inactive", () => {
    const channels = [
      { id: "a", status: "active" },
      { id: "b", status: "error" },
      { id: "c", status: "displaced" },
      { id: "d", status: "paused" },
      { id: "e", status: "inactive" },
    ];

    expect(getChannelsNeedingAttention(channels).map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("getChannelConnectionState отражает checking (Task A9.7)", () => {
    expect(getChannelConnectionState({ status: "checking" })).toBe("checking");
  });
});

// Task A9.7: fixture lifecycle a Telegram wizard attempt drives a channel
// through — checking → error/confirmed, never active on its own.
describe("stores/channels — Telegram wizard fixture lifecycle (Task A9.7)", () => {
  it("buildTelegramIdentity выдаёт публичные @username/url без секрета", () => {
    expect(buildTelegramIdentity("Мой Агент")).toEqual({
      username: "@мой_агент_bot",
      url: "https://t.me/мой_агент_bot",
    });
  });

  it("startChannelCheck переводит канал в checking, failChannelCheck — в error с причиной", () => {
    setActivePinia(createPinia());
    const store = useChannelsStore();
    const channel = store.createChannel("demo", 1, { name: "Telegram — Тест" });

    store.startChannelCheck("demo", 1, channel.id);
    expect(channel.status).toBe("checking");

    store.failChannelCheck("demo", 1, channel.id, "Неверный токен.");
    expect(channel.status).toBe("error");
    expect(channel.runtimeReason).toBe("Неверный токен.");
  });

  it("confirmChannelIdentity подтверждает identity, но не активирует канал", () => {
    setActivePinia(createPinia());
    const store = useChannelsStore();
    const channel = store.createChannel("demo", 1, { name: "Telegram — Тест" });

    store.startChannelCheck("demo", 1, channel.id);
    store.confirmChannelIdentity("demo", 1, channel.id, {
      username: "@test_bot",
      url: "https://t.me/test_bot",
    });

    expect(channel.status).toBe("inactive");
    expect(channel.isEnabled).toBe(false);
    expect(channel.providerIdentity).toBe("@test_bot");
    expect(channel.providerPublicUrl).toBe("https://t.me/test_bot");
  });

  it("resetChannelStatus возвращает checking/error к inactive, не трогая уже подтверждённую identity", () => {
    setActivePinia(createPinia());
    const store = useChannelsStore();
    const channel = store.createChannel("demo", 1, { name: "Telegram — Тест" });

    store.confirmChannelIdentity("demo", 1, channel.id, {
      username: "@test_bot",
      url: "https://t.me/test_bot",
    });
    store.startChannelCheck("demo", 1, channel.id);
    store.resetChannelStatus("demo", 1, channel.id);

    expect(channel.status).toBe("inactive");
    expect(channel.providerIdentity).toBe("@test_bot");
  });

  it("updateChannel с новым токеном разрешает канал, застрявший в checking (post-review fix)", () => {
    setActivePinia(createPinia());
    const store = useChannelsStore();
    const channel = store.createChannel("demo", 1, { name: "Telegram — Тест" });

    store.startChannelCheck("demo", 1, channel.id);
    expect(channel.status).toBe("checking");

    store.updateChannel("demo", 1, channel.id, { name: "Telegram — Тест", token: "123456:NewToken" });

    expect(channel.status).toBe("inactive");
    expect(channel.runtimeReason).toBeNull();
  });

  it("updateChannel без токена не трогает checking — переименование само по себе не разрешает канал", () => {
    setActivePinia(createPinia());
    const store = useChannelsStore();
    const channel = store.createChannel("demo", 1, { name: "Telegram — Тест" });

    store.startChannelCheck("demo", 1, channel.id);
    store.updateChannel("demo", 1, channel.id, { name: "Новое имя" });

    expect(channel.status).toBe("checking");
    expect(channel.name).toBe("Новое имя");
  });
});
