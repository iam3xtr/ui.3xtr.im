import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import AgentSettings from "../../../src/components/agents/AgentSettings.vue";
import { useAgentsStore } from "../../../src/stores/agents.js";
import { useModalStore } from "../../../src/stores/modal.js";
import { useWorkspaceStore } from "../../../src/stores/workspace.js";

// Task A6.3 + Stage A6 fix (post-review, по решению пользователя
// 2026-09-11): covers the model/BYOK section of `AgentSettings.vue` — draft
// vs. fixture, the inline `b-message` on BYOK toggle (rendered by Buefy as
// `.message.is-warning`, not a `.b-message` class), the pre-save `b-dialog`
// confirmation (cancel leaves the fixture untouched, confirm applies the
// mutation and surfaces `api_key_cleared`), the field-level validation that
// blocks saving an incomplete BYOK state, and the key picker/add-key modal
// (`ApiKeySelect.vue`) that replaced the old inline password field. Not a
// visual regression pass — see CLAUDE.md "Verification policy".

// `icon` is normally registered globally by `main.js`; stub it here instead
// of pulling in `vite-svg-loader`'s asset-glob resolution, which this test
// runner does not configure.
const IconStub = { name: "icon", props: ["name"], template: "<span />" };

async function mountSettings({ workspaceId = "demo", agentId = "1" } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = workspaceId;

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/agents/:id", name: "agent", component: { template: "<div />" } },
      { path: "/agents/:id/settings", name: "agent-settings", component: AgentSettings },
    ],
  });
  router.push(`/agents/${agentId}/settings`);
  await router.isReady();

  const wrapper = mount(AgentSettings, {
    global: {
      plugins: [pinia, router, Buefy],
      components: { icon: IconStub },
    },
  });
  await flushPromises();

  return { wrapper, pinia, router };
}

function findSaveButton(wrapper) {
  return wrapper.findAll("button")
    .find((button) => button.text().includes("Сохранить модель и ключ"));
}

// Единственная рекомендованная OpenRouter-модель в каталоге фикстур
// (`src/stores/models.js`) — рендерится без ввода текста в поиск.
async function selectRecommendedByokModel(wrapper) {
  await wrapper.find(".tr-model-select a.dropdown-item").trigger("click");
}

// В demo-воркспейсе изначально нет сохранённых ключей — тесты добавляют
// новый через модалку `ApiKeySelect`, содержимое которой (Buefy `b-modal`)
// смонтировано и доступно для запроса ещё до открытия (видимость переключает
// CSS `v-show`, а не `v-if`).
async function addKeyViaModal(wrapper, { label, secret }) {
  await wrapper.find(".tr-api-key-select__add").trigger("click");
  const modalInputs = wrapper.findAll(".modal-card input");
  await modalInputs[0].setValue(label);
  await modalInputs[1].setValue(secret);
  await wrapper.find(".modal-card").trigger("submit");
}

describe("AgentSettings.vue — модель и BYOK", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("без ключа: контрол выбора ключа не показывается, кнопки сохранения выключены", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    expect(wrapper.find(".tr-api-key-select").exists()).toBe(false);
    expect(wrapper.find(".message").exists()).toBe(false);

    expect(findSaveButton(wrapper).attributes("disabled")).toBeDefined();
  });

  it("BYOK-агент: показывает выбранный сохранённый ключ", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "trickster", agentId: "1" });

    expect(wrapper.find(".tr-api-key-select").exists()).toBe(true);
    expect(wrapper.text()).toContain("Личный ключ");
  });

  it("переключение BYOK сразу показывает инлайн-предупреждение", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    expect(wrapper.find(".message").exists()).toBe(false);

    await wrapper.find("input[type='checkbox']").setValue(true);

    expect(wrapper.find(".message").exists()).toBe(true);
    expect(wrapper.text()).toContain("отдельный выбор модели OpenRouter");
  });

  it("включение BYOK без модели и ключа блокирует сохранение и показывает field-ошибки", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    await wrapper.find("input[type='checkbox']").setValue(true);

    expect(findSaveButton(wrapper).attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("Выберите модель OpenRouter или укажите свободный идентификатор.");
    expect(wrapper.text()).toContain("Выберите сохранённый ключ или добавьте новый.");
  });

  it("модель выбрана, ключ — нет: сохранение остаётся заблокированным", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    await wrapper.find("input[type='checkbox']").setValue(true);
    await selectRecommendedByokModel(wrapper);

    expect(findSaveButton(wrapper).attributes("disabled")).toBeDefined();
    expect(wrapper.text()).not.toContain("Выберите модель OpenRouter или укажите свободный идентификатор.");
    expect(wrapper.text()).toContain("Выберите сохранённый ключ или добавьте новый.");
  });

  it("отмена подтверждения не меняет сохранённого агента", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "trickster", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);

    // Отмена: диалог открыт, но `onConfirm` не вызывается.
    vi.spyOn(modalStore, "confirm").mockImplementation(() => {});

    await wrapper.find("input[type='checkbox']").setValue(false);
    await findSaveButton(wrapper).trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    const agent = agentsStore.getAgent("trickster", "1");
    expect(agent.use_own_api_key).toBe(true);
    expect(agent.has_api_key).toBe(true);
  });

  it("подтверждение применяет mutation и отражает api_key_cleared", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "trickster", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);

    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    await wrapper.find("input[type='checkbox']").setValue(false);
    await findSaveButton(wrapper).trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    const agent = agentsStore.getAgent("trickster", "1");
    expect(agent.use_own_api_key).toBe(false);
    expect(agent.has_api_key).toBe(false);
    expect(agent.api_key_cleared).toBe(true);
    expect(agent.api_key_id).toBe(null);
    expect(agent.provider_model_id).toBe(null);
  });

  it("включение BYOK не портит обычную модель, выключение её возвращает (Stage A6 fix)", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    const originalModel = agentsStore.getAgent("demo", "1").model;

    await wrapper.find("input[type='checkbox']").setValue(true);
    await selectRecommendedByokModel(wrapper);
    await addKeyViaModal(wrapper, { label: "Тестовый ключ", secret: "sk-or-v1-test-key" });

    expect(findSaveButton(wrapper).attributes("disabled")).toBeUndefined();
    await findSaveButton(wrapper).trigger("click");

    let agent = agentsStore.getAgent("demo", "1");
    expect(agent.use_own_api_key).toBe(true);
    expect(agent.has_api_key).toBe(true);
    // Регрессия из ревью Stage A6: включение BYOK не должно трогать/терять
    // обычную (не-BYOK) модель — она хранится в отдельном контроле/поле.
    expect(agent.model).toBe(originalModel);

    await wrapper.find("input[type='checkbox']").setValue(false);
    await findSaveButton(wrapper).trigger("click");

    agent = agentsStore.getAgent("demo", "1");
    expect(agent.use_own_api_key).toBe(false);
    expect(agent.byok_model).toBeNull();
    expect(agent.api_key_id).toBeNull();
    // Выключение BYOK восстанавливает исходную обычную модель без потерь.
    expect(agent.model).toBe(originalModel);
  });

  it("без потери ключа сохранение не открывает подтверждение", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);

    vi.spyOn(modalStore, "confirm");

    await wrapper.find("input[type='checkbox']").setValue(true);
    await selectRecommendedByokModel(wrapper);
    await addKeyViaModal(wrapper, { label: "Новый ключ", secret: "sk-or-v1-new-key" });

    await findSaveButton(wrapper).trigger("click");

    expect(modalStore.confirm).not.toHaveBeenCalled();
    const agent = agentsStore.getAgent("demo", "1");
    expect(agent.use_own_api_key).toBe(true);
    expect(agent.has_api_key).toBe(true);
  });
});
