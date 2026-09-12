import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import ChannelCard from "../../../../src/components/channels/ChannelCard.vue";

// Task A9.7 post-review fix: канал может ненадолго оказаться в переходном
// статусе "checking" (мастер подключения Telegram) — карточка не должна
// показывать сырой ключ статуса и должна предлагать реальный путь
// восстановления, а не тупик.
function makeChannel(overrides = {}) {
  return {
    id: "ch-1",
    name: "Telegram — Тест",
    provider: "telegram",
    status: "checking",
    isEnabled: false,
    providerIdentity: null,
    providerPublicUrl: null,
    runtimeReason: null,
    limits: [],
    ...overrides,
  };
}

function mountCard(channel) {
  setActivePinia(createPinia());

  return mount(ChannelCard, {
    props: { channel, agentId: 1 },
    global: { plugins: [Buefy] },
  });
}

describe("ChannelCard.vue — статус checking (Task A9.7 post-review fix)", () => {
  it("показывает человекочитаемый лейбл вместо сырого ключа статуса", () => {
    const wrapper = mountCard(makeChannel());

    expect(wrapper.find(".tag").text()).toBe("Проверяется");
    expect(wrapper.text()).not.toContain("checking");
  });

  it("предлагает «Изменить» как путь восстановления и не предлагает «Активировать»/«Деактивировать»", () => {
    const wrapper = mountCard(makeChannel());
    const buttonLabels = wrapper.findAll("button").map((b) => b.text().trim());

    expect(buttonLabels).toContain("Изменить");
    expect(buttonLabels).not.toContain("Активировать");
    expect(buttonLabels).not.toContain("Деактивировать");
  });
});
