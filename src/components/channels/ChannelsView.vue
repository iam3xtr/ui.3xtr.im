<template>
  <section class="tr-workbench-page tr-channels">
    <Toolbar v-model:search="query" search-placeholder="Поиск каналов">
      <template #actions>
        <b-button type="is-primary" icon-left="plus" @click="openCreateModal">
          Добавить канал
        </b-button>
      </template>
    </Toolbar>

    <Loader v-if="loading" size="section" />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <template v-else>
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показаны не все каналы агента: часть списка недоступна из-за
        временной ошибки. Остальные каналы ниже — актуальны.
      </b-message>

      <!--
        `loading` из `demoStore.listAsyncState` переопределён в false: этот
        блок и так рендерится только в v-else от внешнего `Loader`, который
        уже перехватил `demoStore.isLoading` выше — без переопределения
        одноимённое поле объекта осталось бы мёртвым и вводящим в заблуждение
        (структурно недостижимым в этой позиции).
      -->
      <ListAsyncState
        v-bind="demoStore.listAsyncState"
        :loading="false"
        :empty="channels.length === 0 || demoStore.isEmpty"
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
              v-for="channel in displayChannels"
              :key="channel._demoKey ?? channel.id"
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
    </template>

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
import { useDemoStore } from "../../stores/demo";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";
import AsyncState from "../common/AsyncState.vue";
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
const demoStore = useDemoStore();
const channelsStore = useChannelsStore();
const modalStore = useModalStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const agentId = computed(() => route.params.id);

// Demo-режим (Stage A7, Task A7.3) — тот же контракт, что и в
// `Agents.vue`: loading/empty/error через `ListAsyncState`,
// permission-denied прямым `AsyncState`, partial — `b-message`-баннером
// поверх доступных каналов, «много данных»/«длинные подписи» —
// presentation-only в `displayChannels`.
const loading = computed(() => isLoading.value || demoStore.isLoading);

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

const DENSE_TARGET_COUNT = 24;
const LONG_LABEL_SUFFIX = " — демонстрационное длинное название для проверки переноса строк карточки канала";

const displayChannels = computed(() => {
  let list = filteredChannels.value;

  if (demoStore.denseData && list.length > 0 && list.length < DENSE_TARGET_COUNT) {
    const dense = [...list];
    let i = 0;
    while (dense.length < DENSE_TARGET_COUNT) {
      const source = list[i % list.length];
      const copyIndex = Math.floor(dense.length / list.length) + 1;
      dense.push({
        ...source,
        name: `${source.name} (${copyIndex})`,
        _demoKey: `${source.id}-dense-${dense.length}`,
      });
      i += 1;
    }
    list = dense;
  }

  if (demoStore.longLabels) {
    list = list.map((channel) => ({
      ...channel,
      name: `${channel.name}${LONG_LABEL_SUFFIX}`,
    }));
  }

  return list;
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

// Task A10.2: удаление канала подтверждается — «уточнить последствия
// удаления сущностей перед подтверждением» (`.plan` Stage A10 «Явное
// сохранение и безопасное редактирование»). Пауза (`handleDeactivate`) и
// перехват (`handleActivate`/`TakeoverModal`) остаются мгновенными
// командами без confirm — они не разрушают данные и обратимы обычной
// повторной активацией, в отличие от удаления канала.
function handleDelete(channel) {
  modalStore.confirm({
    title: `Удалить канал «${channel.name}»?`,
    message: channel.isEnabled
      ? "Канал сейчас доставляет ответы агента — после удаления он "
        + "перестанет отвечать в этом мессенджере без возможности "
        + "восстановления. Подключить заново можно только как новый канал."
      : "Канал будет удалён без возможности восстановления. Подключить "
        + "заново можно только как новый канал.",
    confirmText: "Удалить канал",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      channelsStore.deleteChannel(activeWorkspaceId.value, agentId.value, channel.id);
    },
  });
}

watch(agentId, () => {
  query.value = "";
  modalStore.close("channel-form");
  modalStore.close("channel-takeover");
});
</script>
