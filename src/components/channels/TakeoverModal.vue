<template>
  <b-modal
    :model-value="modalStore.isOpen(modalKey)"
    has-modal-card
    @update:model-value="(value) => (value ? modalStore.open(modalKey) : modalStore.close(modalKey))"
  >
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Бот уже активирован в другом пространстве</p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="modalStore.close(modalKey)"
        />
      </header>

      <section class="modal-card-body tr-form">
        <b-notification type="is-warning is-light" :closable="false">
          <p class="has-text-weight-semibold mb-1">
            Перехват отключит бота в текущем владельце
          </p>
          <p v-if="conflict?.message">{{ conflict.message }}</p>
        </b-notification>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="modalStore.close(modalKey)">
          Отмена
        </b-button>
        <b-button type="is-primary" @click="confirm">
          Перехватить бота
        </b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";

import { useChannelsStore } from "../../stores/channels";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";

// Подтверждение перехвата канала (Task A5.5), эквивалент
// `get.3xtr.im/src/modules/channels/components/TakeoverModal.vue` —
// упрощено до одного демо-подтверждения без промежуточных состояний
// `confirmation_expired`/`confirmation_consumed` (у кита нет сервера,
// который мог бы их вернуть). Оверлей — тот же `useModalStore`-контракт,
// что и у `ChannelFormModal.vue`.
const props = defineProps({
  channel: { type: Object, default: null },
  agentId: { type: [String, Number], required: true },
  conflict: { type: Object, default: null },
});

const modalKey = "channel-takeover";

const modalStore = useModalStore();
const channelsStore = useChannelsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

function confirm() {
  if (props.channel) {
    channelsStore.confirmTakeover(activeWorkspaceId.value, props.agentId, props.channel.id);
  }

  modalStore.close(modalKey);
}
</script>
