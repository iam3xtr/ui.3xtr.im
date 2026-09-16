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
        <section
          class="tr-conversations tr-conversation-split"
          :class="[splitViewClass, { 'is-properties-open': propertiesOpen }]"
        >
          <aside class="tr-conversation-panel tr-conversations-list">
            <nav class="tr-conversations-list__items" aria-label="Список диалогов">
              <button
                v-for="conversation in displayConversations"
                :key="conversation._demoKey ?? conversation.id"
                class="tr-conversation-item"
                :class="{ 'is-active': isConversationActive(conversation) }"
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

          <RouterView v-if="hasSelectedConversation" />

          <article v-else class="tr-conversations-placeholder">
            <b-icon icon="message-text-outline" size="is-large" />
            <strong>Выберите диалог</strong>
            <span>Сообщения и свойства диалога откроются рядом со списком.</span>
          </article>
        </section>
      </ListAsyncState>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import {
  computed, provide, ref, watch,
} from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import { conversationPropertiesKey } from "../composables/conversationProperties";
import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { useAgentsStore } from "../stores/agents";
import {
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  useConversationsStore,
} from "../stores/conversations";
import { useDemoStore } from "../stores/demo";
import { useWorkspaceStore } from "../stores/workspace";
import { AsyncState, ListAsyncState, Loader, Toolbar, ToolbarDropdown } from "@iam3xtr/vue";

// List screen (Task A5.7), routed at `/conversations`. Task A8.4 nests the
// `conversation` route under `conversations-agent` (`/conversations/:agentId`,
// see `router.js`) and renders it through this component's own
// `<RouterView>` next to the list, restoring the persistent split-view the
// list lost when Task A5.7 moved detail to a fully separate route tree —
// selected dialogs get their `is-active` list state back as a result. The
// `:agentId` in that nested route identifies which agent's conversation to
// look up (`ConversationDetail.vue`'s own `getConversation` call) — it is
// not, and must not become, the agent *filter*'s state; see `agentFilter`'s
// own comment below for the bug that conflating the two caused. Below the
// shell's own `1024px` sidebar-collapse breakpoint, `.tr-conversation-split`
// (see `trickster-buefy.scss`) shows only one pane at a time, picked by
// `mobileView`, a plain computed off whether a dialog is selected —
// `ConversationDetail.vue`'s "К диалогам" button actually navigates back to
// this plain `/conversations` route (this message's fix; it used to only
// flip a shared `mobileView` ref via a `conversationMobileViewKey` provide/
// inject pair, leaving `route.params.conversationId` set so the dialog
// stayed selected underneath — since the button no longer needs to mutate
// anything here, that whole provide/inject pair is gone, along with
// `composables/conversationMobileView.js`). This same shell also owns the
// settings pane as a third grid column (`conversationPropertiesKey`, see
// that composable) — the gear button in `ConversationDetail.vue`'s header
// opens/closes it without touching the route.
const route = useRoute();
const router = useRouter();
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const conversationsStore = useConversationsStore();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

/** @typedef {import("../stores/conversations").Conversation} Conversation */

const hasSelectedConversation = computed(() => Boolean(route.params.conversationId));
const mobileView = computed(() => (hasSelectedConversation.value ? "detail" : "list"));

// Settings-pane state: a local toggle, not a route — `ConversationDetail.vue`'s
// gear button opens it through `conversationPropertiesKey` instead of owning
// the grid itself, mirroring get.3xtr.im's `conversation-workbench` provide
// (see that composable's own comment). `splitViewClass` folds it into the
// `mobileView` pane picker above: below the shell's `1024px` breakpoint
// exactly one of list/chat/properties is visible at a time
// (`.tr-conversation-split`'s own `is-${view}-view` rules in
// `trickster-buefy.scss`); at/above it, `is-properties-open` alone controls
// whether the properties column exists in the persistent 3-column grid, and
// list+chat stay visible regardless. Open by default (matching
// `AgentPlayground.vue`'s sandbox pane) — every freshly opened dialog shows
// its settings right away; it only disappears on a narrow viewport, where
// there is no `×` any more, only the aside's own arrow-left
// (`ConversationDetail.vue`'s `tr-conversation-properties-action`) to switch
// back to history.
const propertiesOpen = ref(true);
const splitViewClass = computed(() => {
  if (mobileView.value !== "detail") {
    return "is-list-view";
  }

  return propertiesOpen.value ? "is-properties-view" : "is-chat-view";
});

// Resets `propertiesOpen` back to its open-by-default state whenever the
// selected dialog changes (a genuinely different one — an empty id, i.e.
// leaving the dialog entirely, is included, though harmless there since
// nothing reads it once `hasSelectedConversation` is false), so the next
// dialog always starts with settings showing regardless of what the
// previous one was left at.
watch(() => route.params.conversationId, () => {
  propertiesOpen.value = true;
});

provide(conversationPropertiesKey, {
  propertiesOpen,
  openProperties: () => {
    propertiesOpen.value = true;
  },
  closeProperties: () => {
    propertiesOpen.value = false;
  },
});

/**
 * @param {Conversation} conversation
 */
function isConversationActive(conversation) {
  return hasSelectedConversation.value
    && String(conversation.id) === String(route.params.conversationId);
}

// Demo-режим (Stage A7, Task A7.3) — тот же контракт, что и в
// `Agents.vue`/`ChannelsView.vue`: loading/empty/error через
// `ListAsyncState`, permission-denied прямым `AsyncState`, partial —
// `b-message`-баннером поверх доступных диалогов. Список внутри панели
// сохраняет свой собственный no-results (`AsyncState variant="no-results"`)
// для «диалоги не найдены по поиску» — это отдельный случай от demo-режима
// и не трогается.
const loading = computed(() => isLoading.value || demoStore.isLoading);

const query = ref("");
const statusFilter = ref("");
const channelFilter = ref("");

const conversationStatuses = CONVERSATION_STATUSES;
const conversationChannels = CONVERSATION_CHANNELS;

const agentOptions = computed(
  () => agentsStore.listByWorkspace(activeWorkspaceId.value)
    .map((agent) => ({ value: String(agent.id), label: agent.name })),
);

// A plain ref, same as `statusFilter`/`channelFilter` — narrows the list
// client-side, nothing more. It used to proxy through `router.push` to a
// dedicated `conversations-agent` route, on the theory that the route *is*
// the filter (get.3xtr.im's own agent filter still works that way) — but
// `conversation`'s route already carries `:agentId` for an entirely
// different reason (identifying which agent's conversation to look up), so
// opening *any* dialog from an unfiltered list silently dragged this
// dropdown to that dialog's agent too, with no way to tell "I chose this
// filter" apart from "I merely opened a dialog". Decoupling the two (this
// message's fix) means picking a dialog never moves the dropdown, and
// picking the dropdown never has to fight over which nested route to land
// on.
const agentFilter = ref("");

const conversations = computed(() => (
  agentFilter.value
    ? conversationsStore.listByAgent(activeWorkspaceId.value, agentFilter.value)
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
