<template>
  <b-modal
    :model-value="modalStore.isOpen(modalKey)"
    has-modal-card
    @update:model-value="(value) => (value ? modalStore.open(modalKey) : modalStore.close(modalKey))"
  >
    <form class="modal-card" @submit.prevent="submit">
      <header class="modal-card-head">
        <p class="modal-card-title">
          {{ isEdit ? "Изменить канал" : "Новый канал" }}
        </p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="modalStore.close(modalKey)"
        />
      </header>

      <section class="modal-card-body tr-form">
        <b-notification
          v-if="isEdit && channel.status === 'active'"
          type="is-warning is-light"
          :closable="false"
        >
          Канал уже активен. Замена токена не отключит его автоматически.
        </b-notification>

        <b-field label="Провайдер">
          <b-select disabled expanded>
            <option>Telegram</option>
          </b-select>
        </b-field>

        <b-field label="Название">
          <b-input
            v-model="name"
            placeholder="Например, Основной бот поддержки"
            required
          />
        </b-field>

        <b-field
          label="Токен бота"
          :message="isEdit ? 'Оставьте пустым, чтобы не менять текущий токен.' : undefined"
        >
          <b-input
            v-model="token"
            type="password"
            password-reveal
            placeholder="123456:AAExampleTelegramBotToken"
            :required="!isEdit"
          />
        </b-field>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="modalStore.close(modalKey)">
          Отмена
        </b-button>
        <b-button native-type="submit" type="is-primary">
          {{ isEdit ? "Сохранить" : "Создать" }}
        </b-button>
      </footer>
    </form>
  </b-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import { useChannelsStore } from "../../stores/channels";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";

// Форма создания/редактирования канала (Task A5.5), эквивалент
// `get.3xtr.im/src/modules/channels/components/ChannelFormModal.vue` — MVP
// поддерживает только Telegram (провайдер зафиксирован в разметке, как в
// кабинете), поле токена — write-only и очищается после сохранения. Не
// заводит собственного оверлея: открытие/закрытие идёт через `useModalStore`
// (`Task A4.5`) тем же способом, что и модалка создания агента в
// `Agents.vue`.
const props = defineProps({
  channel: { type: Object, default: null },
  agentId: { type: [String, Number], required: true },
});

const modalKey = "channel-form";

const modalStore = useModalStore();
const channelsStore = useChannelsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const isEdit = computed(() => Boolean(props.channel));
const name = ref("");
const token = ref("");

watch(
  () => [props.channel, modalStore.isOpen(modalKey)],
  ([channel, isOpen]) => {
    if (!isOpen) {
      return;
    }

    name.value = channel?.name ?? "";
    token.value = "";
  },
);

function submit() {
  const trimmedName = name.value.trim();

  if (!trimmedName) {
    return;
  }

  if (isEdit.value) {
    const trimmedToken = token.value.trim();

    channelsStore.updateChannel(
      activeWorkspaceId.value,
      props.agentId,
      props.channel.id,
      trimmedToken ? { name: trimmedName, token: trimmedToken } : { name: trimmedName },
    );
  } else {
    channelsStore.createChannel(activeWorkspaceId.value, props.agentId, {
      name: trimmedName,
    });
  }

  token.value = "";
  modalStore.close(modalKey);
}
</script>
