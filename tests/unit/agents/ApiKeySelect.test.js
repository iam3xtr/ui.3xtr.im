import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import ApiKeySelect from "../../../src/components/agents/ApiKeySelect.vue";
import { useApiKeysStore } from "../../../src/stores/apiKeys.js";
import { useWorkspaceStore } from "../../../src/stores/workspace.js";

// Stage A6 fix (post-review, по решению пользователя 2026-09-11): own
// coverage for the key picker + add-key modal that replaced the inline
// password field in `AgentSettings.vue` — see `AgentSettings.test.js` for
// the end-to-end save flow, this file covers the component in isolation
// (empty state, masked labels, add-new flow, emitted v-model).

function mountApiKeySelect({ workspaceId = "trickster", modelValue = null } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = workspaceId;

  return mount(ApiKeySelect, {
    props: { modelValue },
    global: { plugins: [pinia, Buefy] },
  });
}

async function submitNewKey(wrapper, { label, secret }) {
  await wrapper.find(".tr-api-key-select__add").trigger("click");
  const inputs = wrapper.findAll(".modal-card input");
  await inputs[0].setValue(label);
  await inputs[1].setValue(secret);
  await wrapper.find(".modal-card").trigger("submit");
}

describe("ApiKeySelect.vue", () => {
  it("без сохранённых ключей показывает пустое состояние в списке", () => {
    const wrapper = mountApiKeySelect({ workspaceId: "demo" });

    expect(wrapper.text()).toContain("Сохранённых ключей пока нет");
    expect(wrapper.text()).toContain("Выберите ключ");
  });

  it("список показывает сохранённые ключи с маской секрета", () => {
    const wrapper = mountApiKeySelect({ workspaceId: "trickster" });
    const apiKeysStore = useApiKeysStore();
    const key = apiKeysStore.getKey("trickster", "key-1");

    expect(wrapper.text()).toContain(`Личный ключ — ${apiKeysStore.maskSecret(key)}`);
    expect(wrapper.text()).not.toContain(key.secret);
  });

  it("выбранный ключ отражается в триггере", () => {
    const wrapper = mountApiKeySelect({ workspaceId: "trickster", modelValue: "key-1" });

    expect(wrapper.find(".tr-api-key-select__trigger").text()).toContain("Личный ключ");
  });

  it("добавление нового ключа сохраняет его в сторе воркспейса и выбирает", async () => {
    const wrapper = mountApiKeySelect({ workspaceId: "demo" });
    const apiKeysStore = useApiKeysStore();

    await submitNewKey(wrapper, { label: "Мой ключ", secret: "sk-or-v1-abcdef" });

    const keys = apiKeysStore.listByWorkspace("demo");
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ label: "Мой ключ", providerId: "openrouter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([[keys[0].id]]);
  });

  it("новый ключ не добавляется в другой воркспейс", async () => {
    const wrapper = mountApiKeySelect({ workspaceId: "demo" });
    const apiKeysStore = useApiKeysStore();

    await submitNewKey(wrapper, { label: "Мой ключ", secret: "sk-or-v1-abcdef" });

    expect(apiKeysStore.listByWorkspace("trickster")).toHaveLength(1);
    expect(apiKeysStore.listByWorkspace("demo")).toHaveLength(1);
  });

  it("выбор существующего ключа из списка эмитит update:modelValue", async () => {
    const wrapper = mountApiKeySelect({ workspaceId: "trickster" });

    const item = wrapper.findAll("a.dropdown-item")
      .find((el) => el.text().includes("Личный ключ"));
    expect(item).toBeTruthy();

    await item.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["key-1"]]);
  });
});
