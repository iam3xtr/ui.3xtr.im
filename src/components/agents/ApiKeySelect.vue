<template>
  <div class="tr-api-key-select">
    <b-dropdown v-model="localValue" aria-role="list" expanded>
      <template #trigger>
        <button :id="inputId" type="button" class="button tr-api-key-select__trigger">
          <span class="tr-api-key-select__trigger-label">{{ selectedLabel }}</span>
          <b-icon icon="chevron-down" size="is-small" />
        </button>
      </template>

      <b-dropdown-item
        v-for="key in keys"
        :key="key.id"
        :value="key.id"
        aria-role="listitem"
      >
        <span class="tr-api-key-select__item">
          <span class="tr-api-key-select__item-label">
            {{ key.label }} — {{ apiKeysStore.maskSecret(key) }}
          </span>
          <button
            type="button"
            class="tr-api-key-select__item-delete"
            :aria-label="`Удалить ключ «${key.label}»`"
            @click.stop.prevent="confirmDeleteKey(key)"
          >
            <b-icon icon="trash-can-outline" size="is-small" />
          </button>
        </span>
      </b-dropdown-item>

      <b-dropdown-item v-if="keys.length === 0" disabled aria-role="listitem">
        Сохранённых ключей пока нет
      </b-dropdown-item>

      <b-dropdown-item separator />

      <b-dropdown-item custom paddingless aria-role="listitem">
        <button
          type="button"
          class="dropdown-item tr-api-key-select__add"
          @click="openCreateModal"
        >
          <b-icon icon="plus" size="is-small" />
          Добавить ключ…
        </button>
      </b-dropdown-item>
    </b-dropdown>

    <b-modal
      :model-value="modalStore.isOpen(modalKey)"
      has-modal-card
      @update:model-value="(value) => (value ? modalStore.open(modalKey) : modalStore.close(modalKey))"
    >
      <form class="modal-card" @submit.prevent="submit">
        <header class="modal-card-head">
          <p class="modal-card-title">Добавить ключ OpenRouter</p>
          <button
            class="delete"
            type="button"
            aria-label="Закрыть"
            @click="modalStore.close(modalKey)"
          />
        </header>

        <section class="modal-card-body tr-form">
          <b-field label="Название">
            <b-input
              v-model="newLabel"
              placeholder="Например, Личный ключ"
              required
            />
          </b-field>

          <b-field label="Ключ API">
            <b-input
              v-model="newSecret"
              type="password"
              password-reveal
              autocomplete="off"
              placeholder="sk-or-…"
              required
            />
          </b-field>
        </section>

        <footer class="modal-card-foot">
          <b-button @click="modalStore.close(modalKey)">
            Отмена
          </b-button>
          <b-button native-type="submit" type="is-primary">
            Добавить
          </b-button>
        </footer>
      </form>
    </b-modal>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import { useAgentsStore } from "../../stores/agents.js";
import { useApiKeysStore } from "../../stores/apiKeys.js";
import { useModalStore } from "../../stores/modal.js";
import { useWorkspaceStore } from "../../stores/workspace.js";

// Stage A6 fix (post-review, по решению пользователя 2026-09-11): ключи
// OpenRouter больше не вводятся заново на каждом BYOK-агенте — они хранятся
// в профиле воркспейса (`src/stores/apiKeys.js`) и выбираются здесь, либо
// добавляются на лету через модалку, тем же способом, что
// `channels/ChannelFormModal.vue`/`workspace/InviteMemberForm.vue` открывают
// свои модалки через `useModalStore`. Отдельного экрана управления ключами
// (переименование) пока нет; удаление — `confirmDeleteKey` ниже (Task A10.2).
const modalKey = "agent-byok-key-create";

// Stage A10 review fix: optional `id` for the native trigger button below,
// so `FormErrorSummary`'s `document.getElementById(field)?.focus()` jump
// (Task A10.1) has a real focusable target — omitted by every consumer that
// doesn't need one (e.g. the wizard's `ExpertParameters.vue`).
defineProps({
  inputId: { type: String, default: null },
});

const localValue = defineModel({ type: String, default: null });

const modalStore = useModalStore();
const apiKeysStore = useApiKeysStore();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const newLabel = ref("");
const newSecret = ref("");

const keys = computed(() => apiKeysStore.listByWorkspace(activeWorkspaceId.value));

const selectedLabel = computed(() => {
  const key = keys.value.find((item) => item.id === localValue.value);
  return key ? `${key.label} — ${apiKeysStore.maskSecret(key)}` : "Выберите ключ";
});

function openCreateModal() {
  newLabel.value = "";
  newSecret.value = "";
  modalStore.open(modalKey);
}

function submit() {
  const trimmedLabel = newLabel.value.trim();
  const trimmedSecret = newSecret.value.trim();

  if (!trimmedLabel || !trimmedSecret) {
    return;
  }

  const key = apiKeysStore.createKey(activeWorkspaceId.value, {
    label: trimmedLabel,
    secret: trimmedSecret,
  });

  localValue.value = key.id;
  modalStore.close(modalKey);
}

/**
 * Удаление сохранённого ключа (Task A10.2) — отдельная мгновенная команда от
 * выбора ключа/сохранения формы модели, с собственным подтверждением:
 * стирает секрет из `apiKeysStore` безвозвратно и, в отличие от отвязки
 * одного агента (`AgentSettings.vue`'s «Отвязать ключ», ограниченного
 * агентом текущей формы), может затронуть любого агента воркспейса, у
 * которого этот ключ выбран. Confirm называет их по имени, а не обобщённым
 * предупреждением, и явно перечисляет обе fixture-последствия — секрет
 * пропадает у всех, ссылавшиеся агенты возвращаются к обычной модели.
 *
 * @param {import("../../stores/apiKeys.js").ApiKey} key
 */
function confirmDeleteKey(key) {
  const affectedAgents = agentsStore.listAgentsUsingApiKey(activeWorkspaceId.value, key.id);
  const affectedNames = affectedAgents.map((agent) => agent.name);

  modalStore.confirm({
    title: `Удалить ключ «${key.label}»?`,
    message: affectedNames.length > 0
      ? `Ключ и его собственная модель OpenRouter пропадут без возможности `
        + `восстановления. Затронутые агенты вернутся к обычной модели без `
        + `собственного ключа: ${affectedNames.join(", ")}.`
      : "Ключ не используется ни одним агентом сейчас. Он пропадёт без "
        + "возможности восстановления.",
    confirmText: "Удалить ключ",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      for (const agent of affectedAgents) {
        agentsStore.detachApiKey(activeWorkspaceId.value, agent.id);
      }

      apiKeysStore.deleteKey(activeWorkspaceId.value, key.id);

      if (localValue.value === key.id) {
        localValue.value = null;
      }
    },
  });
}
</script>
