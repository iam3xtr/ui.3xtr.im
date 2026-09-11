<template>
  <section class="tr-workbench-page tr-channels">
    <Toolbar v-model:search="query" search-placeholder="Поиск каналов">
      <template #actions>
        <b-button type="is-primary" icon-left="plus" @click="openCreateModal">
          Добавить канал
        </b-button>
      </template>
    </Toolbar>

    <Loader v-if="isLoading" size="section" />

    <ListAsyncState
      v-else
      :empty="channels.length === 0"
      empty-icon="send-outline"
      empty-title="У агента нет каналов"
      empty-message="Подключите Telegram-бота, чтобы агент мог отвечать в мессенджере."
    >
      <template #empty-action>
        <b-button type="is-primary" @click="openCreateModal">
          Добавить канал
        </b-button>
      </template>

      <div class="tr-catalog">
        <div class="tr-catalog-grid">
          <ChannelCard
            v-for="channel in filteredChannels"
            :key="channel.id"
            :channel="channel"
            :agent-id="agentId"
            @activate="handleActivate"
            @deactivate="handleDeactivate"
            @edit="openEditModal"
            @delete="handleDelete"
          />

          <p v-if="filteredChannels.length === 0" class="tr-catalog-empty">
            Каналы не найдены.
          </p>
        </div>
      </div>
    </ListAsyncState>

    <ChannelFormModal :channel="editingChannel" :agent-id="agentId" />
    <TakeoverModal :channel="takeoverChannel" :agent-id="agentId" :conflict="takeoverConflict" />
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useChannelsStore } from "../../stores/channels";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";
import Loader from "../common/Loader.vue";
import ListAsyncState from "../common/ListAsyncState.vue";
import Toolbar from "../common/Toolbar.vue";
import ChannelCard from "./ChannelCard.vue";
import ChannelFormModal from "./ChannelFormModal.vue";
import TakeoverModal from "./TakeoverModal.vue";

// Каталог каналов агента (Task A5.5), маршрут `/agents/:id/channels` —
// вложен в `AgentDetail.vue` детальным shell'ом наравне с `agent`/
// `agent-settings` (Task A5.4). Заменяет прежний воркспейс-каталог
// «Интеграции» (`components/Channels.vue`, `stores/channels.js` с
// `INTEGRATION_CATALOG`): в кабинете канал всегда принадлежит одному
// агенту (`get.3xtr.im/src/modules/channels/store.js` грузит список по
// `agent_id`), а не подключается на уровне рабочего пространства.
const route = useRoute();
const { isLoading } = useSimulatedLoading();
const channelsStore = useChannelsStore();
const modalStore = useModalStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const agentId = computed(() => route.params.id);

const query = ref("");
const editingChannel = ref(null);
const takeoverChannel = ref(null);
const takeoverConflict = ref(null);

const channels = computed(
  () => channelsStore.listByAgent(activeWorkspaceId.value, agentId.value),
);

const filteredChannels = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  if (!search) {
    return channels.value;
  }

  return channels.value.filter((channel) => channel.name.toLocaleLowerCase().includes(search));
});

function openCreateModal() {
  editingChannel.value = null;
  modalStore.open("channel-form");
}

function openEditModal(channel) {
  editingChannel.value = channel;
  modalStore.open("channel-form");
}

function handleActivate(channel) {
  const conflict = channelsStore.activateChannel(activeWorkspaceId.value, agentId.value, channel.id);

  if (conflict) {
    takeoverChannel.value = channel;
    takeoverConflict.value = conflict;
    modalStore.open("channel-takeover");
  }
}

function handleDeactivate(channel) {
  channelsStore.deactivateChannel(activeWorkspaceId.value, agentId.value, channel.id);
}

function handleDelete(channel) {
  channelsStore.deleteChannel(activeWorkspaceId.value, agentId.value, channel.id);
}

watch(agentId, () => {
  query.value = "";
  modalStore.close("channel-form");
  modalStore.close("channel-takeover");
});
</script>
