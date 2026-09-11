<template>
  <section class="tr-workbench-page">
    <Loader v-if="isLoading" size="section" />

    <template v-else>
    <Toolbar
      v-if="conversations.length > 0"
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

    <section v-if="conversations.length === 0" class="tr-section-empty">
      <AsyncState
        variant="empty"
        icon="message-outline"
        title="Диалогов пока нет"
        message="Новые диалоги появятся после обращения пользователей."
      />
    </section>

    <section v-else class="tr-conversations">
      <aside class="tr-conversation-panel tr-conversations-list">
        <nav class="tr-conversations-list__items" aria-label="Список диалогов">
          <button
            v-for="conversation in filteredConversations"
            :key="conversation.id"
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
import { useWorkspaceStore } from "../stores/workspace";
import AsyncState from "./common/AsyncState.vue";
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
const conversationsStore = useConversationsStore();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

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
