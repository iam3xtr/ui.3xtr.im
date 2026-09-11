<template>
  <section class="tr-workbench-page">
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
        Показаны не все диалоги: часть списка недоступна из-за временной
        ошибки. Остальные диалоги ниже — актуальны.
      </b-message>

      <Toolbar
        v-if="conversations.length > 0 && !demoStore.isEmpty && !demoStore.isError"
        class="tr-workbench-page__header"
        v-model:search="query"
        search-placeholder="Поиск по диалогам"
        :filters-active="Boolean(statusFilter || channelFilter || agentFilter)"
      >
        <template #filters>
          <ToolbarDropdown
            v-if="agentOptions.length > 0"
            v-model="agentFilter"
            class="tr-page-toolbar__filter"
            aria-label="Фильтр диалогов по агенту"
            all-label="Все агенты"
            :options="agentOptions"
          />

          <ToolbarDropdown
            v-model="statusFilter"
            class="tr-page-toolbar__filter"
            aria-label="Фильтр диалогов по статусу"
            all-label="Все статусы"
            :options="conversationStatuses"
          />

          <ToolbarDropdown
            v-model="channelFilter"
            class="tr-page-toolbar__filter"
            aria-label="Фильтр диалогов по каналу"
            all-label="Все каналы"
            :options="conversationChannels"
          />
        </template>
      </Toolbar>

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
        :empty="conversations.length === 0 || demoStore.isEmpty"
        empty-icon="message-outline"
        empty-title="Диалогов пока нет"
        empty-message="Новые диалоги появятся после обращения пользователей."
      >
        <section class="tr-conversations">
          <aside class="tr-conversation-panel tr-conversations-list">
            <nav class="tr-conversations-list__items" aria-label="Список диалогов">
              <button
                v-for="conversation in displayConversations"
                :key="conversation._demoKey ?? conversation.id"
                class="tr-conversation-item"
                type="button"
                @click="openConversation(conversation)"
              >
                <span class="tr-conversation-avatar">
                  {{ conversation.initials }}
                </span>
                <span class="tr-conversation-item__content">
                  <span class="tr-conversation-item__heading">
                    <strong>{{ conversation.contact }}</strong>
                    <small>{{ conversation.updated }}</small>
                  </span>
                  <span class="tr-conversation-item__preview">
                    {{ conversation.preview }}
                  </span>
                  <span class="tr-conversation-item__channel">
                    {{ conversation.channel }} · {{ conversation.agent }}
                  </span>
                </span>
              </button>

              <AsyncState
                v-if="filteredConversations.length === 0"
                variant="no-results"
                message="Диалоги не найдены."
              />
            </nav>
          </aside>

          <article class="tr-conversations-placeholder">
            <b-icon icon="message-text-outline" size="is-large" />
            <strong>Выберите диалог</strong>
            <span>Сообщения и свойства диалога откроются на отдельной странице.</span>
          </article>
        </section>
      </ListAsyncState>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { useAgentsStore } from "../stores/agents";
import {
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  useConversationsStore,
} from "../stores/conversations";
import { useDemoStore } from "../stores/demo";
import { useWorkspaceStore } from "../stores/workspace";
import AsyncState from "./common/AsyncState.vue";
import ListAsyncState from "./common/ListAsyncState.vue";
import Loader from "./common/Loader.vue";
import Toolbar from "./common/Toolbar.vue";
import ToolbarDropdown from "./common/ToolbarDropdown.vue";

// List screen (Task A5.7), routed at `/conversations` and, agent-scoped, at
// `/conversations/:agentId` — picking a dialog now navigates to the fully
// separate `conversation`/`conversation-settings` routes
// (`components/conversations/ConversationDetail.vue`) instead of switching
// an internal `viewMode` the way this component used to. The list therefore
// always renders the same two-column `.tr-conversations` layout (list +
// "pick a dialog" placeholder); there is no way back to reflect which
// dialog is currently open in the list's own selection state any more
// (that would be exactly the internal view-mode state Task A5.7 removes),
// so list items never carry an `is-active` state.
const route = useRoute();
const router = useRouter();
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const conversationsStore = useConversationsStore();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

// Demo-режим (Stage A7, Task A7.3) — тот же контракт, что и в
// `Agents.vue`/`ChannelsView.vue`: loading/empty/error через
// `ListAsyncState`, permission-denied прямым `AsyncState`, partial —
// `b-message`-баннером поверх доступных диалогов. Список внутри панели
// сохраняет свой собственный no-results (`AsyncState variant="no-results"`)
// для «диалоги не найдены по поиску» — это отдельный случай от demo-режима
// и не трогается.
const loading = computed(() => isLoading.value || demoStore.isLoading);

/** @typedef {import("../stores/conversations").Conversation} Conversation */

const query = ref("");
const statusFilter = ref("");
const channelFilter = ref("");

const conversationStatuses = CONVERSATION_STATUSES;
const conversationChannels = CONVERSATION_CHANNELS;

const agentOptions = computed(
  () => agentsStore.listByWorkspace(activeWorkspaceId.value)
    .map((agent) => ({ value: String(agent.id), label: agent.name })),
);

// The agent filter scopes to a different route (`conversations-agent`)
// rather than narrowing the current list client-side — same
// route-is-the-filter convention as get.3xtr.im's own agent filter — so it
// proxies through router.push instead of a plain ref.
const agentFilter = computed({
  get: () => (route.params.agentId ? String(route.params.agentId) : ""),
  set: (value) => {
    router.push(value
      ? { name: "conversations-agent", params: { agentId: value } }
      : { name: "conversations" });
  },
});

const conversations = computed(() => (
  route.params.agentId
    ? conversationsStore.listByAgent(activeWorkspaceId.value, route.params.agentId)
    : conversationsStore.listByWorkspace(activeWorkspaceId.value)
));

const filteredConversations = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return conversations.value.filter((conversation) => {
    const matchesSearch = !search || [
      conversation.contact,
      conversation.channel,
      conversation.agent,
      conversation.preview,
    ].some((value) => value.toLocaleLowerCase().includes(search));
    const matchesStatus = !statusFilter.value
      || conversation.status === statusFilter.value;
    const matchesChannel = !channelFilter.value
      || conversation.channel === channelFilter.value;

    return matchesSearch && matchesStatus && matchesChannel;
  });
});

// Плотность и длина подписей списка диалогов для demo-режима (Task A7.3):
// presentation-проекция `filteredConversations`, ничего не пишет в
// `useConversationsStore()`. Клик по дублю открывает тот же реальный
// диалог — `id`/`agentId` не меняются, меняется только `contact`/`preview`
// и служебный `_demoKey` для `v-for`.
const DENSE_TARGET_COUNT = 30;
const LONG_LABEL_SUFFIX = " — демонстрационное длинное имя для проверки переноса текста в списке диалогов";

const displayConversations = computed(() => {
  let list = filteredConversations.value;

  if (demoStore.denseData && list.length > 0 && list.length < DENSE_TARGET_COUNT) {
    const dense = [...list];
    let i = 0;
    while (dense.length < DENSE_TARGET_COUNT) {
      const source = list[i % list.length];
      const copyIndex = Math.floor(dense.length / list.length) + 1;
      dense.push({
        ...source,
        contact: `${source.contact} (${copyIndex})`,
        _demoKey: `${source.id}-dense-${dense.length}`,
      });
      i += 1;
    }
    list = dense;
  }

  if (demoStore.longLabels) {
    list = list.map((conversation) => ({
      ...conversation,
      contact: `${conversation.contact}${LONG_LABEL_SUFFIX}`,
      preview: `${conversation.preview}${LONG_LABEL_SUFFIX}`,
    }));
  }

  return list;
});

/**
 * @param {Conversation} conversation
 */
function openConversation(conversation) {
  router.push({
    name: "conversation",
    params: { agentId: conversation.agentId, conversationId: conversation.id },
  });
}
</script>
