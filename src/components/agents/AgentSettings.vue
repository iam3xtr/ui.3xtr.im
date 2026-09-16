<template>
  <section class="tr-settings">
    <PageHeader
      title="Настройки агента"
      :subtitle="agent?.name"
      :back="{ to: { name: 'agent', params: { id: route.params.id } }, title: 'К агенту' }"
    />

    <!--
      Stage A10 review fix: name and status used to be immediate-apply
      (`v-model` straight into the store) — that predates A10.1/A10.2's
      contract that a working agent's configuration only applies on an
      explicit Save, and that a dirty edit is never lost without a choice.
      They're now split by what they actually are: "Название" is a plain
      field with no meaning of its own until confirmed, so it gets the same
      draft/Save/dirty-exit shape as the model/BYOK section below; "Статус"
      is a pause/resume-like lifecycle action (A10.2's own stated intent —
      no `pauseAgent`/`resumeAgent` existed yet anywhere in the kit), so it's
      an explicit instant command with a confirm naming the real transition,
      mirroring "Отвязать ключ" below rather than a bare dropdown.
    -->
    <div class="tr-settings__panel">
      <div v-if="agent" class="tr-form">
        <div class="tr-settings__panel-header">
          <h2>Профиль агента</h2>
          <p>Отображаемое название и текущий статус.</p>
        </div>

        <FormErrorSummary :errors="nameFieldErrors" />

        <b-message v-if="isNameConflict" type="is-warning" :closable="false">
          Название изменили в другом окне, пока форма была открыта. Можно
          перечитать актуальное значение или сохранить свой вариант поверх.
          <div class="tr-form__footer mt-2">
            <b-button size="is-small" @click="reloadNameRemote">Перечитать</b-button>
            <b-button size="is-small" type="is-primary" @click="keepNameLocal">
              Оставить мой вариант
            </b-button>
          </div>
        </b-message>

        <b-field
          label="Название"
          :type="nameFieldErrors.name ? 'is-danger' : undefined"
          :message="nameFieldErrors.name || undefined"
        >
          <b-input ref="nameInputRef" v-model="nameDraft.name" />
        </b-field>

        <footer class="tr-form__footer">
          <b-button
            type="is-primary"
            :disabled="!hasNameChanges || !isNameValid"
            :loading="isNamePending"
            @click="saveNameForm"
          >
            Сохранить название
          </b-button>
          <b-button :disabled="!hasNameChanges" @click="resetName">
            Отменить изменения
          </b-button>
          <b-button v-if="isNameError" @click="retryName">Повторить</b-button>
          <span v-if="isNameUnknown" class="tr-muted">
            Результат неизвестен — <a href="#" @click.prevent="verifyName">сверить состояние</a>.
          </span>
        </footer>

        <!--
          Task A10.2's own stated intent ("Пауза... должны быть отдельными
          командами с собственным результатом") applied here: status is not a
          form field, it's a set of explicit lifecycle transitions, each with
          its own confirm naming the real consequence.
        -->
        <b-field label="Статус">
          <div class="tr-agent-settings__status">
            <b-tag :type="statusTagType">{{ agent.status }}</b-tag>
            <b-button
              v-for="status in otherStatuses"
              :key="status"
              size="is-small"
              @click="confirmSetStatus(status)"
            >
              {{ STATUS_TRANSITIONS[status].actionLabel }}
            </b-button>
          </div>
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
        <FormErrorSummary :errors="fieldErrors" />

        <b-message v-if="isConflict" type="is-warning" :closable="false">
          Модель или ключ изменили в другом окне, пока форма была открыта.
          Можно перечитать актуальное значение или сохранить свой вариант
          поверх.
          <div class="tr-form__footer mt-2">
            <b-button size="is-small" @click="reloadRemote">Перечитать</b-button>
            <b-button size="is-small" type="is-primary" @click="keepLocal">
              Оставить мой вариант
            </b-button>
          </div>
        </b-message>

        <b-field>
          <b-switch v-model="draft.useOwnApiKey">
            Использовать собственный ключ API (BYOK)
          </b-switch>
        </b-field>

        <!--
          Task A10.6 (`.plan`: "Платформенная оплата и BYOK имеют разные
          пояснения"): a plain distinction, not a cost estimate — this kit
          has no server-side spend/forecast data for either mode, so it
          explains *who bills whom* rather than *how much*. Resource limits
          (`workspace/Usage.vue`/`WorkspacePlans.vue`'s seven-key contract)
          apply the same way regardless of BYOK; only the response cost
          moves off-platform.
        -->
        <p class="tr-muted">
          {{
            draft.useOwnApiKey
              ? "Ответы через собственный ключ провайдера оплачиваются "
                + "напрямую у провайдера — это отдельный расчёт от лимитов "
                + "и тарифа пространства ниже."
              : "Ответы через каталожную модель платформы учитываются в "
                + "лимитах и тарифе пространства, а не оплачиваются "
                + "отдельно за каждый ответ."
          }}
        </p>

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
          <ModelSelect v-model="draft.model" input-id="model" />
        </b-field>

        <b-field
          v-else
          label="Модель (OpenRouter, собственный ключ)"
          :type="fieldErrors.model ? 'is-danger' : undefined"
          :message="fieldErrors.model || undefined"
        >
          <ModelSelect
            v-model="draft.byokModel"
            v-model:provider-model-id="draft.providerModelId"
            :use-own-api-key="true"
            input-id="model"
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
          :type="fieldErrors.apiKeyId ? 'is-danger' : undefined"
          :message="fieldErrors.apiKeyId || undefined"
        >
          <ApiKeySelect v-model="draft.apiKeyId" input-id="apiKeyId" />
        </b-field>

        <footer class="tr-form__footer">
          <b-button
            type="is-primary"
            :disabled="!hasModelChanges || !isValid"
            :loading="isPending"
            @click="saveModelSettings"
          >
            Сохранить модель и ключ
          </b-button>
          <b-button :disabled="!hasModelChanges" @click="reset">
            Отменить изменения
          </b-button>
          <b-button v-if="isError" @click="retry">Повторить</b-button>
          <span v-if="isUnknown" class="tr-muted">
            Результат неизвестен — <a href="#" @click.prevent="verify">сверить состояние</a>.
          </span>
        </footer>

        <!--
          Task A10.2: мгновенная команда, отдельная от Save выше — отвязывает
          текущий ключ от этого агента сразу, без черновика/подтверждения
          через «Сохранить модель и ключ». Не удаляет сам ключ из
          `apiKeysStore` (см. `ApiKeySelect.vue`'s «Удалить ключ») — он
          остаётся доступен другим агентам воркспейса.
        -->
        <div v-if="agent.has_api_key" class="tr-agent-settings__detach">
          <p class="tr-agent-settings__detach-hint">
            Собственный ключ подключён к этому агенту сейчас — отвязка
            применяется сразу и не требует «Сохранить модель и ключ».
          </p>
          <b-button size="is-small" type="is-danger" outlined @click="confirmDetachApiKey">
            Отвязать ключ
          </b-button>
        </div>
      </div>
    </div>

    <DirtyExitModal
      :active="dirtyGuard.active"
      @save="dirtyGuard.confirmSave"
      @discard="dirtyGuard.confirmDiscard"
      @stay="dirtyGuard.stay"
    />
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { useDirtyExitGuard } from "../../composables/useDirtyExitGuard";
import { useSavableForm } from "../../composables/useSavableForm";
import { AGENT_STATUSES, useAgentsStore } from "../../stores/agents";
import { useModalStore } from "../../stores/modal";
import { useToasterStore } from "../../stores/toaster";
import { useWorkspaceStore } from "../../stores/workspace";
import DirtyExitModal from "../common/DirtyExitModal.vue";
import FormErrorSummary from "../common/FormErrorSummary.vue";
import { PageHeader } from "@iam3xtr/vue/navigation";
import ApiKeySelect from "./ApiKeySelect.vue";
import ModelSelect from "./ModelSelect.vue";

// Agent settings tab (Task A5.4), routed at `/agents/:id/settings`. Scoped
// to fields that do not affect an in-progress sandbox session — temperature
// and the system prompt moved out to `AgentPlayground.vue`'s own
// gear-opened properties aside (this tab's own earlier fix): both are live
// generation parameters, so they belong with the sandbox that exercises
// them, mirroring get.3xtr.im's own split between
// `agents/components/Settings.vue` (identity only) and `Playground.vue`'s
// properties pane (model/prompt/temperature).
//
// Name and status (Stage A10 review fix) no longer immediate-apply straight
// into the store — that predated A10.1/A10.2's contract that a working
// agent's configuration only applies on an explicit Save and a dirty edit is
// never lost without a choice. "Название" is a `useSavableForm` draft of its
// own (`nameDraft` below), independent of the model/BYOK draft (`.todo`:
// "Независимые операции... не становятся одной транзакцией") — its own
// Save/Cancel, its own field error. "Статус" has no meaning to hold in a
// draft at all: it's a pause/resume-like lifecycle action (A10.2's own
// stated intent for pause/resume, never actually wired up as a control
// before this fix), so it's an instant command with a confirm naming the
// real transition (`confirmSetStatus` below), same shape as "Отвязать ключ".
// The single `dirtyGuard` at the bottom covers both drafts (name and
// model/BYOK) with one combined dirty-exit prompt — each still saves via its
// own independent `submit()`/store call, so one save's failure never blocks
// or masks the other's success.
//
// The model/BYOK section below stays a full draft+Save regardless — it
// provisions which model/credentials the agent uses rather than tuning a
// live run, and it can delete a stored key or `provider_model_id`, so it
// needs an explicit draft, a Save step and — per Task A6.3 — a pre-save
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

// Name draft (Stage A10 review fix): its own independent `useSavableForm`
// transaction, same contract/shape as `WorkspaceSettings.vue`'s rename field
// — a plain required text field with no meaning until Save, separate from
// the model/BYOK draft below (`.todo`: "Независимые операции... не
// становятся одной транзакцией").
const {
  draft: nameDraft,
  hasChanges: hasNameChanges,
  isValid: isNameValid,
  fieldErrors: nameFieldErrors,
  isPending: isNamePending,
  isError: isNameError,
  isConflict: isNameConflict,
  isUnknown: isNameUnknown,
  save: saveNameForm,
  retry: retryName,
  verify: verifyName,
  reset: resetName,
  keepLocal: keepNameLocal,
  reloadRemote: reloadNameRemote,
} = useSavableForm({
  source: () => agent.value,
  toDraft: (value) => ({ name: value?.name ?? "" }),
  validate: (value) => (value.name.trim() ? {} : { name: "Введите название агента." }),
  submit: (value) => {
    const result = agentsStore.renameAgent(activeWorkspaceId.value, route.params.id, value.name.trim());

    if (!result) {
      return { ok: false, message: "Не удалось сохранить название." };
    }

    toasterStore.success("Название сохранено.");

    return { ok: true };
  },
});

// Stage A10 review fix: `FormErrorSummary`'s "jump to field" is a plain
// `document.getElementById("name")?.focus()`, but Buefy's `b-input` (like
// `b-autocomplete` in `ModelSelect.vue`, see its own comment on this) routes
// a bare `id` attr to its own outer `.control` wrapper `<div>` via its
// `CompatFallthroughMixin`, never to the actual `<input>` that can take
// focus — so the id is set imperatively on the real input element instead.
const nameInputRef = ref(null);

onMounted(() => {
  const inputEl = nameInputRef.value?.$el?.querySelector("input");
  if (inputEl) {
    inputEl.id = "name";
  }
});

/**
 * Явные lifecycle-переходы статуса (Stage A10 review fix) — не форма, а
 * набор мгновенных команд: у каждого перехода собственный confirm с реальным
 * последствием, без выдуманного каскада/Undo, тем же паттерном, что уже
 * есть у «Отвязать ключ» ниже.
 * @type {Record<string, { actionLabel: string, confirmTitle: string, confirmMessage: string, dangerous?: boolean }>}
 */
const STATUS_TRANSITIONS = {
  Активен: {
    actionLabel: "Активировать",
    confirmTitle: "Активировать агента?",
    confirmMessage: "Агент начнёт отвечать на новые сообщения по своим текущим настройкам.",
  },
  Приостановлен: {
    actionLabel: "Приостановить",
    confirmTitle: "Приостановить агента?",
    confirmMessage: "Агент перестанет отвечать на новые сообщения, пока его не "
      + "активируют снова. Уже идущие диалоги не завершаются автоматически.",
    dangerous: true,
  },
  Черновик: {
    actionLabel: "Вернуть в черновик",
    confirmTitle: "Вернуть агента в черновик?",
    confirmMessage: "Агент перестанет отвечать на новые сообщения и будет считаться "
      + "незапущенным, пока его не активируют снова.",
    dangerous: true,
  },
};

const statusTagType = computed(() => (agent.value?.status === "Активен" ? "is-primary" : undefined));

const otherStatuses = computed(
  () => agentStatuses.filter((status) => status !== agent.value?.status),
);

function confirmSetStatus(status) {
  if (!agent.value) {
    return;
  }

  const transition = STATUS_TRANSITIONS[status];

  modalStore.confirm({
    title: transition.confirmTitle,
    message: transition.confirmMessage,
    confirmText: transition.actionLabel,
    cancelText: "Отмена",
    type: transition.dangerous ? "is-danger" : "is-primary",
    hasIcon: true,
    onConfirm: () => {
      agentsStore.setAgentStatus(activeWorkspaceId.value, route.params.id, status);
      toasterStore.info(`Статус изменён: ${status}.`);
    },
  });
}

// Model/BYOK draft (Task A6.3 решение 4: inline warning immediately on
// toggle, `b-dialog` confirmation only right before the mutation that would
// actually clear something) is now the shared `useSavableForm`
// fixture-adapter (Task A10.1) — same contract as `WorkspaceSettings.vue`,
// `profile/Settings.vue` and `knowledge/Settings.vue`. This is its own
// transaction, independent of the name/status fields above and of any other
// form on the page (`.todo`: "Независимые операции пароля, ключа, профиля и
// конфигурации не становятся одной транзакцией").
//
// Stage A6 fix (BYOK toggle no longer loses/mismatches the model): `model`
// (regular) and `byokModel` (OpenRouter-only) are two independent draft
// fields, mirroring the store contract — toggling BYOK never overwrites
// either, so turning it off always reverts to whatever the regular model
// already was, with nothing to reconcile or validate.
function validateModelDraft(value) {
  const errors = {};

  // Stage A6 fix (review finding: BYOK could be saved with no key and no
  // model at all). Reuses the same rule `stores/agents.js#updateAgentSettings`
  // applies as a defensive last resort, so the UI-level gate and the store's
  // own guard never disagree.
  if (value.useOwnApiKey && !(value.byokModel || value.providerModelId)) {
    errors.model = "Выберите модель OpenRouter или укажите свободный идентификатор.";
  }

  if (value.useOwnApiKey && !value.apiKeyId) {
    errors.apiKeyId = "Выберите сохранённый ключ или добавьте новый.";
  }

  return errors;
}

const {
  draft,
  hasChanges: hasModelChanges,
  isValid,
  fieldErrors,
  isPending,
  isError,
  isConflict,
  isUnknown,
  save: saveForm,
  retry,
  verify,
  reset,
  keepLocal,
  reloadRemote,
} = useSavableForm({
  source: () => agent.value,
  toDraft: (value) => ({
    model: value?.model ?? "",
    byokModel: value?.byok_model ?? "",
    useOwnApiKey: value?.use_own_api_key ?? false,
    // Ключ теперь ссылка на сохранённый в воркспейсе ключ
    // (`src/stores/apiKeys.js`, Stage A6 fix post-review), а не текст —
    // round-trip такого поля безопасен, в отличие от прежнего сырого текста.
    apiKeyId: value?.api_key_id ?? null,
    // Issue api.3xtr.im#112: `provider_model_id` has no server contract yet
    // for a workspace user — this mirrors the fixture field the store
    // already carries (Task A6.1), it does not assert the API accepts it.
    providerModelId: value?.provider_model_id ?? null,
  }),
  validate: validateModelDraft,
  submit: (value) => {
    const result = agentsStore.updateAgentSettings(activeWorkspaceId.value, route.params.id, {
      model: value.model,
      byok_model: value.byokModel || null,
      use_own_api_key: value.useOwnApiKey,
      api_key_id: value.apiKeyId,
      provider_model_id: value.providerModelId,
    });

    if (!result) {
      return { ok: false, message: "Не удалось сохранить модель и ключ." };
    }

    toasterStore[result.api_key_cleared ? "info" : "success"](
      result.api_key_cleared
        ? "Модель сохранена, собственный ключ удалён."
        : "Модель и ключ сохранены.",
    );

    return { ok: true };
  },
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
// (валидация выше блокирует сохранение раньше), так что здесь нечего чистить.
const willClearApiKey = computed(
  () => Boolean(agent.value?.has_api_key) && !draft.value.useOwnApiKey,
);

// Возвращает Promise<{ ok: boolean }> — единая точка сохранения формы
// модели/ключа, используемая и видимой кнопкой «Сохранить модель и ключ»,
// и `useDirtyExitGuard`'s `onSave`, чтобы confirm на удаление ключа
// срабатывал независимо от того, как пользователь инициирует сохранение
// (клик по кнопке или «Сохранить» в диалоге dirty-exit).
function saveModelSettings() {
  if (!agent.value || !hasModelChanges.value) {
    return Promise.resolve({ ok: true });
  }

  if (willClearApiKey.value) {
    return new Promise((resolve) => {
      modalStore.confirm({
        title: "Удалить собственный ключ?",
        message: "Собственный ключ и его модель OpenRouter будут удалены без "
          + "возможности восстановления.",
        confirmText: "Сохранить и удалить ключ",
        cancelText: "Отмена",
        type: "is-danger",
        hasIcon: true,
        onConfirm: async () => {
          resolve(await saveForm());
        },
        onCancel: () => resolve({ ok: false }),
      });
    });
  }

  return saveForm();
}

/**
 * Мгновенная команда «Отвязать ключ» (Task A10.2) — применяется напрямую к
 * живому агенту в сторе, в обход `draft`/`saveForm`: отвязка не часть
 * транзакции формы модели/ключа, у неё собственный результат и
 * подтверждение. Затрагивает только этого агента — сохранённый ключ
 * остаётся в `apiKeysStore` доступен другим агентам воркспейса (в отличие
 * от «Удалить ключ» в `ApiKeySelect.vue`, которое стирает сам секрет).
 */
function confirmDetachApiKey() {
  if (!agent.value?.has_api_key) {
    return;
  }

  modalStore.confirm({
    title: "Отвязать ключ от агента?",
    message: "Агент перестанет использовать собственный ключ и модель "
      + "OpenRouter и вернётся к обычной модели. Сам ключ останется "
      + "сохранён в воркспейсе для других агентов.",
    confirmText: "Отвязать",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      agentsStore.detachApiKey(activeWorkspaceId.value, route.params.id);
      toasterStore.info("Ключ отвязан от агента.");
    },
  });
}

// Combined dirty-exit guard (Stage A10 review fix): covers both independent
// drafts on this page (name, model/BYOK) with one Save/Discard/Stay prompt,
// rather than two separate guards racing to show two modals at once. Each
// draft still saves through its own `submit()`/store call — a failure in one
// keeps the guard open (via the combined `ok`) without silently discarding
// or masking the other's success.
const dirtyGuard = useDirtyExitGuard({
  isDirty: () => hasNameChanges.value || hasModelChanges.value,
  onSave: async () => {
    const results = await Promise.all([
      hasNameChanges.value ? saveNameForm() : Promise.resolve({ ok: true }),
      hasModelChanges.value ? saveModelSettings() : Promise.resolve({ ok: true }),
    ]);

    return { ok: results.every((result) => result?.ok) };
  },
  onDiscard: () => {
    resetName();
    reset();
  },
});
</script>
