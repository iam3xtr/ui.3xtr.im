<template>
  <div class="tr-api-key-select">
    <b-dropdown v-model="localValue" aria-role="list" expanded>
      <template #trigger>
        <button type="button" class="button tr-api-key-select__trigger">
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
        {{ key.label }} — {{ apiKeysStore.maskSecret(key) }}
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

import { useApiKeysStore } from "../../stores/apiKeys.js";
import { useModalStore } from "../../stores/modal.js";
import { useWorkspaceStore } from "../../stores/workspace.js";

// Stage A6 fix (post-review, по решению пользователя 2026-09-11): ключи
// OpenRouter больше не вводятся заново на каждом BYOK-агенте — они хранятся
// в профиле воркспейса (`src/stores/apiKeys.js`) и выбираются здесь, либо
// добавляются на лету через модалку, тем же способом, что
// `channels/ChannelFormModal.vue`/`workspace/InviteMemberForm.vue` открывают
// свои модалки через `useModalStore`. Отдельного экрана управления ключами
// (переименование/удаление) пока нет — вне scope этого прохода.
const modalKey = "agent-byok-key-create";

const localValue = defineModel({ type: String, default: null });

const modalStore = useModalStore();
const apiKeysStore = useApiKeysStore();
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
</script>
