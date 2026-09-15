import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import ConversationHeader from "../../../../src/components/conversations/ConversationHeader.vue";
import { useConversationsStore } from "../../../../src/stores/conversations.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

// Task A10.5: owner/lease row — «Взять диалог»/«Вернуть агенту» и the owner
// tag, driven purely by `stores/conversations.js`'s `demo` fixture (ids 1/5/6/7,
// see that store's own top comment for what each models).
function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useWorkspaceStore().activeWorkspaceId = "demo";

  return { pinia, store: useConversationsStore() };
}

function mountHeader(pinia, conversation) {
  return mount(ConversationHeader, {
    props: { conversation },
    global: { plugins: [pinia, Buefy] },
  });
}

describe("ConversationHeader.vue — handoff owner/lease (Task A10.5)", () => {
  it("незанятый эскалированный диалог показывает «Взять диалог», без «Вернуть агенту»", () => {
    const { pinia, store } = setup();
    const conversation = store.getConversation("demo", 1, 1);
    const wrapper = mountHeader(pinia, conversation);

    expect(wrapper.text()).toContain("Требует оператора");
    const claimButtons = wrapper.findAll("button").filter((b) => b.text() === "Взять диалог");
    expect(claimButtons.length).toBe(1);
    expect(wrapper.text()).not.toContain("Вернуть агенту");
  });

  it("диалог с активным чужим владением не даёт claim/release", () => {
    const { pinia, store } = setup();
    const conversation = store.getConversation("demo", 1, 5);
    const wrapper = mountHeader(pinia, conversation);

    expect(wrapper.text()).toContain("Анна Смирнова");
    expect(wrapper.text()).not.toContain("Взять диалог");
    expect(wrapper.text()).not.toContain("Вернуть агенту");
  });

  it("диалог, которым владеет текущий оператор, показывает «Вернуть агенту»", () => {
    const { pinia, store } = setup();
    const conversation = store.getConversation("demo", 3, 6);
    const wrapper = mountHeader(pinia, conversation);

    expect(wrapper.text()).toContain("Ведёте вы");
    expect(wrapper.text()).toContain("Вернуть агенту");
    expect(wrapper.text()).not.toContain("Взять диалог");
  });

  it("истёкший lease позволяет забрать диалог заново", () => {
    const { pinia, store } = setup();
    const conversation = store.getConversation("demo", 2, 7);
    const wrapper = mountHeader(pinia, conversation);

    expect(wrapper.text()).toContain("Владение истекло");
    expect(wrapper.text()).toContain("Взять диалог");
  });

  it("клик «Взять диалог» вызывает claimHandoff и обновляет представление", async () => {
    const { pinia, store } = setup();
    const conversation = store.getConversation("demo", 1, 1);
    const wrapper = mountHeader(pinia, conversation);

    await wrapper.find("button").trigger("click");

    expect(store.getConversation("demo", 1, 1).handoff.owner.name).toBe("Иван Петров");
  });

  it("клик «Вернуть агенту» вызывает releaseHandoff и снимает эскалацию", async () => {
    const { pinia, store } = setup();
    const conversation = store.getConversation("demo", 3, 6);
    const wrapper = mountHeader(pinia, conversation);

    const releaseButton = wrapper.findAll("button").find((b) => b.text() === "Вернуть агенту");
    await releaseButton.trigger("click");

    const updated = store.getConversation("demo", 3, 6);
    expect(updated.awaitingOperator).toBe(false);
    expect(updated.handoff.owner).toBeNull();
  });

  it("не эскалированный диалог не показывает owner-теги/кнопки вовсе", () => {
    const { pinia, store } = setup();
    const conversation = store.getConversation("demo", 2, 2);
    const wrapper = mountHeader(pinia, conversation);

    expect(wrapper.text()).not.toContain("Требует оператора");
    expect(wrapper.text()).not.toContain("Взять диалог");
    expect(wrapper.text()).not.toContain("Вернуть агенту");
  });
});
