import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import AgentSettings from "../../../src/components/agents/AgentSettings.vue";
import DirtyExitModal from "../../../src/components/common/DirtyExitModal.vue";
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

// `mountSettings` attaches to `document.body` (needed for the focus-jump
// tests below to observe real `document.activeElement`) — clear it after
// every test so a leftover mount from one test can't leave a stale
// `id="model"`/`id="apiKeyId"` element for `document.getElementById` in a
// later test to find instead of the current one.
afterEach(() => {
  document.body.innerHTML = "";
});

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
    // Attached to a real `document.body` so `document.activeElement`
    // (Stage A10 review fix's focus-jump tests) reflects actual focus.
    attachTo: document.body,
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

// Task A10.2: «Отвязать ключ» — мгновенная команда, отдельная от
// «Сохранить модель и ключ» (см. описание выше и `stores/agents.js#detachApiKey`).
describe("AgentSettings.vue — мгновенная отвязка ключа (Task A10.2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function findDetachButton(wrapper) {
    return wrapper.findAll("button")
      .find((button) => button.text().includes("Отвязать ключ"));
  }

  it("без собственного ключа кнопка «Отвязать ключ» не показывается", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    expect(findDetachButton(wrapper)).toBeUndefined();
  });

  it("не трогает форму модели/ключа и не требует «Сохранить»", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "trickster", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    await findDetachButton(wrapper).trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    const agent = agentsStore.getAgent("trickster", "1");
    expect(agent.use_own_api_key).toBe(false);
    expect(agent.has_api_key).toBe(false);
    expect(agent.api_key_id).toBe(null);
    expect(agent.byok_model).toBe(null);
    expect(agent.provider_model_id).toBe(null);
    // Отвязка не оставляет форму dirty — «Сохранить модель и ключ» не нужно.
    expect(findSaveButton(wrapper).attributes("disabled")).toBeDefined();
    // Stage A10 review fix: форма — а не только стор — подхватывает
    // мгновенную отвязку; переключатель BYOK и селектор ключа не остаются
    // показывать устаревшее «включено».
    expect(wrapper.find("input[type='checkbox']").element.checked).toBe(false);
    expect(wrapper.find(".tr-api-key-select").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Выберите сохранённый ключ");
  });

  it("отмена подтверждения не отвязывает ключ", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "trickster", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm").mockImplementation(() => {});

    await findDetachButton(wrapper).trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    const agent = agentsStore.getAgent("trickster", "1");
    expect(agent.use_own_api_key).toBe(true);
    expect(agent.has_api_key).toBe(true);
  });
});

// Stage A10 review fix: deleting the currently-selected key from the
// embedded `ApiKeySelect` dropdown (Task A10.2's «Удалить ключ», which
// cascades `agentsStore.detachApiKey` for every affected agent, including
// this open one) mutates both the agent record *and* the form's
// `v-model`-bound `draft.apiKeyId` in the same synchronous handler. A form
// left clean beforehand must resync entirely rather than being left "dirty"
// with a stale BYOK toggle and a spurious "выберите ключ" validation error.
describe("AgentSettings.vue — удаление выбранного ключа через ApiKeySelect (Stage A10 review fix)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("на чистой форме удаление текущего ключа полностью ресинкает форму", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "trickster", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    await wrapper.find(".tr-api-key-select__item-delete").trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    const agent = agentsStore.getAgent("trickster", "1");
    expect(agent.use_own_api_key).toBe(false);
    expect(agent.has_api_key).toBe(false);
    expect(agent.api_key_id).toBe(null);

    // Форма не остаётся dirty/invalid со старым состоянием переключателя —
    // она подхватывает уже применённую мгновенную команду.
    expect(wrapper.find("input[type='checkbox']").element.checked).toBe(false);
    expect(wrapper.find(".tr-api-key-select").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Выберите сохранённый ключ");
    expect(findSaveButton(wrapper).attributes("disabled")).toBeDefined();
  });
});

// Stage A10 review fix: `useDirtyExitGuard`'s "Сохранить" must go through the
// exact same `saveModelSettings` path as the visible "Сохранить модель и
// ключ" button — including the pre-save confirm on a key-clearing change —
// rather than calling the bare `useSavableForm` `save` and silently clearing
// the key with no confirmation just because the user left via dirty-exit
// instead of clicking Save.
describe("AgentSettings.vue — dirty-exit «Сохранить» (Stage A10 review fix)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("dirty-exit «Сохранить» запрашивает подтверждение на удаление ключа, а не тихо его удаляет", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "trickster", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    // Отмена: диалог открыт, но ни `onConfirm`, ни `onCancel` не вызываются.
    vi.spyOn(modalStore, "confirm").mockImplementation(() => {});

    await wrapper.find("input[type='checkbox']").setValue(false);

    const dirtyExitModal = wrapper.findComponent(DirtyExitModal);
    await dirtyExitModal.vm.$emit("save");
    await flushPromises();

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    const agent = agentsStore.getAgent("trickster", "1");
    expect(agent.use_own_api_key).toBe(true);
    expect(agent.has_api_key).toBe(true);
  });

  it("dirty-exit «Сохранить» удаляет ключ только после подтверждения", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "trickster", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    await wrapper.find("input[type='checkbox']").setValue(false);

    const dirtyExitModal = wrapper.findComponent(DirtyExitModal);
    await dirtyExitModal.vm.$emit("save");
    await flushPromises();

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    const agent = agentsStore.getAgent("trickster", "1");
    expect(agent.use_own_api_key).toBe(false);
    expect(agent.has_api_key).toBe(false);
    expect(agent.api_key_cleared).toBe(true);
  });

  it("dirty-exit «Сохранить» без удаления ключа не открывает подтверждение", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm");

    await wrapper.find("input[type='checkbox']").setValue(true);
    await selectRecommendedByokModel(wrapper);
    await addKeyViaModal(wrapper, { label: "Новый ключ", secret: "sk-or-v1-new-key" });

    const dirtyExitModal = wrapper.findComponent(DirtyExitModal);
    await dirtyExitModal.vm.$emit("save");
    await flushPromises();

    expect(modalStore.confirm).not.toHaveBeenCalled();
    const agent = agentsStore.getAgent("demo", "1");
    expect(agent.use_own_api_key).toBe(true);
    expect(agent.has_api_key).toBe(true);
  });
});

// Stage A10 review fix: `FormErrorSummary`'s "jump to field" button must
// actually move focus — `AgentSettings.vue` is the one savable form where
// the fields are Buefy `b-autocomplete` (`ModelSelect.vue`) and a custom
// `b-dropdown` trigger (`ApiKeySelect.vue`) rather than a plain `b-input`,
// so a real `id` on the focusable element needed extra wiring (see
// `ModelSelect.vue`'s `inputId` prop comment for why a bare `id` attribute
// doesn't reach the actual `<input>` through Buefy's autocomplete).
describe("AgentSettings.vue — клавиатурный переход к ошибке (Stage A10 review fix)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function findSummaryLink(wrapper, text) {
    return wrapper.findAll(".tr-form-error-summary__link")
      .find((button) => button.text().includes(text));
  }

  it("клик по ошибке модели переводит фокус на реальный input автокомплита", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    await wrapper.find("input[type='checkbox']").setValue(true);

    const link = findSummaryLink(wrapper, "Выберите модель OpenRouter");
    expect(link).toBeDefined();
    await link.trigger("click");

    expect(document.activeElement.id).toBe("model");
    expect(document.activeElement.tagName).toBe("INPUT");
  });

  it("клик по ошибке ключа переводит фокус на триггер выбора ключа", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    await wrapper.find("input[type='checkbox']").setValue(true);

    const link = findSummaryLink(wrapper, "Выберите сохранённый ключ");
    expect(link).toBeDefined();
    await link.trigger("click");

    expect(document.activeElement.id).toBe("apiKeyId");
    expect(document.activeElement.classList.contains("tr-api-key-select__trigger")).toBe(true);
  });
});

// Stage A10 review fix: name/status used to be immediate-apply (`v-model`
// straight into the store). Name is now its own independent `useSavableForm`
// draft with Save/Cancel and the combined dirty-exit guard; status is an
// instant lifecycle command with a confirm per transition.
describe("AgentSettings.vue — название и статус (Stage A10 review fix)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function findNameSaveButton(wrapper) {
    return wrapper.findAll("button").find((button) => button.text().includes("Сохранить название"));
  }

  function findStatusButton(wrapper, label) {
    return wrapper.findAll(".tr-agent-settings__status button")
      .find((button) => button.text().includes(label));
  }

  it("изменение названия не меняет store до Save", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const originalName = agentsStore.getAgent("demo", "1").name;

    await wrapper.find("#name").setValue("Новое имя");

    expect(agentsStore.getAgent("demo", "1").name).toBe(originalName);
    expect(findNameSaveButton(wrapper).attributes("disabled")).toBeUndefined();

    await findNameSaveButton(wrapper).trigger("click");
    await flushPromises();

    expect(agentsStore.getAgent("demo", "1").name).toBe("Новое имя");
  });

  it("пустое название блокирует Save и показывает field-ошибку", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const originalName = agentsStore.getAgent("demo", "1").name;

    await wrapper.find("#name").setValue("   ");

    expect(findNameSaveButton(wrapper).attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("Введите название агента.");
    expect(agentsStore.getAgent("demo", "1").name).toBe(originalName);
  });

  it("dirty-exit «Сохранить» сохраняет несохранённое название", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);

    await wrapper.find("#name").setValue("Через dirty-exit");

    const dirtyExitModal = wrapper.findComponent(DirtyExitModal);
    await dirtyExitModal.vm.$emit("save");
    await flushPromises();

    expect(agentsStore.getAgent("demo", "1").name).toBe("Через dirty-exit");
  });

  it("dirty-exit «Выйти без сохранения» отбрасывает правки названия", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const originalName = agentsStore.getAgent("demo", "1").name;

    await wrapper.find("#name").setValue("Отброшенное имя");

    const dirtyExitModal = wrapper.findComponent(DirtyExitModal);
    await dirtyExitModal.vm.$emit("discard");
    await flushPromises();

    expect(agentsStore.getAgent("demo", "1").name).toBe(originalName);
    expect(wrapper.find("#name").element.value).toBe(originalName);
  });

  it("текущий статус показан тегом, кнопки предлагают только другие переходы", async () => {
    const { wrapper } = await mountSettings({ workspaceId: "demo", agentId: "1" });

    // Фикстура demo/1 — "Активен" (src/stores/agents.js).
    expect(wrapper.find(".tr-agent-settings__status .tag").text()).toBe("Активен");
    expect(findStatusButton(wrapper, "Приостановить")).toBeDefined();
    expect(findStatusButton(wrapper, "Вернуть в черновик")).toBeDefined();
    expect(findStatusButton(wrapper, "Активировать")).toBeUndefined();
  });

  it("отмена подтверждения не меняет статус агента", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm").mockImplementation(() => {});

    await findStatusButton(wrapper, "Приостановить").trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    expect(agentsStore.getAgent("demo", "1").status).toBe("Активен");
  });

  it("подтверждение перехода статуса применяет его мгновенно, без Save", async () => {
    const { wrapper, pinia } = await mountSettings({ workspaceId: "demo", agentId: "1" });
    const agentsStore = useAgentsStore(pinia);
    const modalStore = useModalStore(pinia);
    vi.spyOn(modalStore, "confirm").mockImplementation((options) => options.onConfirm?.());

    await findStatusButton(wrapper, "Приостановить").trigger("click");

    expect(modalStore.confirm).toHaveBeenCalledOnce();
    expect(agentsStore.getAgent("demo", "1").status).toBe("Приостановлен");
    // Мгновенная команда — не требует нажатия Save для названия.
    expect(findNameSaveButton(wrapper).attributes("disabled")).toBeDefined();
  });
});
