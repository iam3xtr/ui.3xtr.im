<template>
  <section class="tr-settings">
    <PageHeader
      title="Настройки агента"
      :subtitle="agent?.name"
      :back="{ to: { name: 'agent', params: { id: route.params.id } }, title: 'К агенту' }"
    />

    <div class="tr-settings__panel">
      <div v-if="agent" class="tr-form">
        <b-field label="Название">
          <b-input v-model="agent.name" />
        </b-field>

        <b-field label="Статус">
          <b-select v-model="agent.status" expanded>
            <option v-for="status in agentStatuses" :key="status">
              {{ status }}
            </option>
          </b-select>
        </b-field>

        <b-field label="Температура">
          <b-slider
            v-model="agent.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            :tooltip="true"
          />
        </b-field>

        <b-field label="Системная инструкция">
          <b-input
            v-model="agent.instructions"
            type="textarea"
            rows="7"
          />
        </b-field>
      </div>
    </div>

    <!--
      Model + BYOK section (Task A6.3): unlike the fields above, this one is
      not immediate-apply — `updateAgentSettings` can delete a stored key or
      the free-form `provider_model_id`, so it needs its own draft/Save step
      and a pre-save confirmation, same draft+hasChanges+save/reset shape as
      `WorkspaceSettings.vue`/`knowledge/Settings.vue`.
    -->
    <div v-if="agent" class="tr-settings__panel mt-5">
      <div class="tr-settings__panel-header">
        <h2>Модель и собственный ключ</h2>
        <p>Каталожная модель агента и, при включённом BYOK, ключ провайдера.</p>
      </div>

      <div class="tr-form">
        <b-field>
          <b-switch v-model="draft.useOwnApiKey">
            Использовать собственный ключ API (BYOK)
          </b-switch>
        </b-field>

        <b-message v-if="byokToggled" type="is-warning" :closable="false">
          {{ byokWarningMessage }}
        </b-message>

        <!--
          Раздельные контролы (Stage A6 fix): обычная модель (`draft.model`)
          и BYOK-модель (`draft.byokModel` / `draft.providerModelId`) — два
          разных поля стора, не одно общее. Переключение BYOK меняет только
          то, какой контрол виден; обычная модель не трогается и поэтому
          восстанавливается сама при выключении BYOK.
        -->
        <b-field v-if="!draft.useOwnApiKey" label="Модель">
          <ModelSelect v-model="draft.model" />
        </b-field>

        <b-field
          v-else
          label="Модель (OpenRouter, собственный ключ)"
          :type="modelFieldError ? 'is-danger' : undefined"
          :message="modelFieldError || undefined"
        >
          <ModelSelect
            v-model="draft.byokModel"
            v-model:provider-model-id="draft.providerModelId"
            :use-own-api-key="true"
          />
        </b-field>

        <!--
          Stage A6 fix (post-review): ключ больше не вводится текстом на
          каждом агенте — он выбирается из ключей, сохранённых в профиле
          воркспейса (`src/stores/apiKeys.js`), либо добавляется на лету
          через модалку внутри `ApiKeySelect`.
        -->
        <b-field
          v-if="draft.useOwnApiKey"
          label="Ключ API"
          :type="keyFieldError ? 'is-danger' : undefined"
          :message="keyFieldError || undefined"
        >
          <ApiKeySelect v-model="draft.apiKeyId" />
        </b-field>

        <footer class="tr-form__footer">
          <b-button
            type="is-primary"
            :disabled="!hasModelChanges || byokIncomplete"
            @click="saveModelSettings"
          >
            Сохранить модель и ключ
          </b-button>
          <b-button :disabled="!hasModelChanges" @click="resetModelDraft">
            Отменить изменения
          </b-button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { AGENT_STATUSES, useAgentsStore } from "../../stores/agents";
import { useModalStore } from "../../stores/modal";
import { useToasterStore } from "../../stores/toaster";
import { useWorkspaceStore } from "../../stores/workspace";
import PageHeader from "../common/PageHeader.vue";
import ApiKeySelect from "./ApiKeySelect.vue";
import ModelSelect from "./ModelSelect.vue";

// Agent settings tab (Task A5.4), routed at `/agents/:id/settings`. The
// name/status/temperature/instructions fields keep the immediate-apply
// pattern the tab has used since Task A5.4 (same as `WorkspaceSettings.vue`'s
// rename field) — there is no backend to save to, so there is no reason to
// gate them behind a Save button. The model/BYOK section below is the one
// exception: it can delete a stored key or `provider_model_id`, so it needs
// an explicit draft, a Save step and — per Task A6.3 — a pre-save
// confirmation when that Save would actually clear something.
const route = useRoute();
const agentsStore = useAgentsStore();
const modalStore = useModalStore();
const toasterStore = useToasterStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const agentStatuses = AGENT_STATUSES;

const agent = computed(
  () => agentsStore.getAgent(activeWorkspaceId.value, route.params.id),
);

// Draft state for the model/BYOK section (Task A6.3 решение 4: inline
// warning immediately on toggle, `b-dialog` confirmation only right before
// the mutation that would actually clear something).
//
// Stage A6 fix (BYOK toggle no longer loses/mismatches the model): `model`
// (regular) and `byokModel` (OpenRouter-only) are two independent draft
// fields, mirroring the store contract — toggling BYOK never overwrites
// either, so turning it off always reverts to whatever the regular model
// already was, with nothing to reconcile or validate.
const draft = ref({
  model: "",
  byokModel: "",
  useOwnApiKey: false,
  apiKeyId: null,
  providerModelId: null,
});

function syncModelDraft() {
  draft.value = {
    model: agent.value?.model ?? "",
    byokModel: agent.value?.byok_model ?? "",
    useOwnApiKey: agent.value?.use_own_api_key ?? false,
    // Ключ теперь ссылка на сохранённый в воркспейсе ключ
    // (`src/stores/apiKeys.js`, Stage A6 fix post-review), а не текст —
    // round-trip такого поля безопасен, в отличие от прежнего сырого текста.
    apiKeyId: agent.value?.api_key_id ?? null,
    // Issue api.3xtr.im#112: `provider_model_id` has no server contract yet
    // for a workspace user — this mirrors the fixture field the store
    // already carries (Task A6.1), it does not assert the API accepts it.
    providerModelId: agent.value?.provider_model_id ?? null,
  };
}

watch(agent, syncModelDraft, { immediate: true });

const hasModelChanges = computed(() => {
  if (!agent.value) {
    return false;
  }

  return draft.value.model !== agent.value.model
    || draft.value.byokModel !== (agent.value.byok_model ?? "")
    || draft.value.useOwnApiKey !== agent.value.use_own_api_key
    || draft.value.apiKeyId !== agent.value.api_key_id
    || draft.value.providerModelId !== agent.value.provider_model_id;
});

// Stage A6 fix (review finding: BYOK could be saved with no key and no
// model at all). Reuses the same rule `stores/agents.js#updateAgentSettings`
// applies as a defensive last resort, so the UI-level gate and the store's
// own guard never disagree.
const byokIncomplete = computed(() => draft.value.useOwnApiKey && !agentsStore.isByokSaveValid({
  useOwnApiKey: true,
  apiKeyId: draft.value.apiKeyId,
  byokModel: draft.value.byokModel || null,
  providerModelId: draft.value.providerModelId,
}));

const modelFieldError = computed(() => {
  if (!draft.value.useOwnApiKey || draft.value.byokModel || draft.value.providerModelId) {
    return "";
  }
  return "Выберите модель OpenRouter или укажите свободный идентификатор.";
});

const keyFieldError = computed(() => {
  if (!draft.value.useOwnApiKey || draft.value.apiKeyId) {
    return "";
  }
  return "Выберите сохранённый ключ или добавьте новый.";
});

const byokToggled = computed(
  () => Boolean(agent.value) && draft.value.useOwnApiKey !== agent.value.use_own_api_key,
);

const byokWarningMessage = computed(() => (draft.value.useOwnApiKey
  ? "Для собственного ключа используется отдельный выбор модели OpenRouter "
    + "и ключ из сохранённых в воркспейсе — обычная модель никуда не денется "
    + "и вернётся, если BYOK снова выключить."
  : "Собственный ключ и связанная с ним модель OpenRouter (включая "
    + "свободный идентификатор) будут удалены при сохранении."));

// Единственный сценарий, где сохранение стирает ключ — выключение BYOK:
// пока BYOK включён, сохранение возможно только с уже выбранным ключом
// (`byokIncomplete` блокирует кнопку раньше), так что здесь нечего чистить.
const willClearApiKey = computed(
  () => Boolean(agent.value?.has_api_key) && !draft.value.useOwnApiKey,
);

function applyModelSettings() {
  if (!agent.value) {
    return;
  }

  const result = agentsStore.updateAgentSettings(activeWorkspaceId.value, route.params.id, {
    model: draft.value.model,
    byok_model: draft.value.byokModel || null,
    use_own_api_key: draft.value.useOwnApiKey,
    api_key_id: draft.value.apiKeyId,
    provider_model_id: draft.value.providerModelId,
  });

  if (!result) {
    return;
  }

  toasterStore[result.api_key_cleared ? "info" : "success"](
    result.api_key_cleared
      ? "Модель сохранена, собственный ключ удалён."
      : "Модель и ключ сохранены.",
  );

  syncModelDraft();
}

function saveModelSettings() {
  if (!agent.value || !hasModelChanges.value || byokIncomplete.value) {
    return;
  }

  if (willClearApiKey.value) {
    modalStore.confirm({
      title: "Удалить собственный ключ?",
      message: "Собственный ключ и его модель OpenRouter будут удалены без "
        + "возможности восстановления.",
      confirmText: "Сохранить и удалить ключ",
      cancelText: "Отмена",
      type: "is-danger",
      hasIcon: true,
      onConfirm: applyModelSettings,
    });
    return;
  }

  applyModelSettings();
}

function resetModelDraft() {
  syncModelDraft();
}
</script>
