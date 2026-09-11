<template>
  <section class="tr-conversation-detail">
    <ListAsyncState
      :loading="isLoading"
      :error="!conversation"
      error-icon="message-off-outline"
      error-title="Диалог не найден"
      error-message="Возможно, диалог был удалён или вы переключили рабочее пространство."
    >
      <template #error-action>
        <b-button tag="router-link" :to="backTo" type="is-primary">
          К диалогам
        </b-button>
      </template>

      <NavbarMenu>
        <NavbarTabs :items="tabs" aria-label="Навигация по диалогу" />
      </NavbarMenu>

      <RouterView :key="`${activeWorkspaceId}-${route.params.agentId}-${route.params.conversationId}`" />
    </ListAsyncState>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useConversationsStore } from "../../stores/conversations";
import { useWorkspaceStore } from "../../stores/workspace";
import ListAsyncState from "../common/ListAsyncState.vue";
import NavbarMenu from "../common/NavbarMenu.vue";
import NavbarTabs from "../common/NavbarTabs.vue";

// Route-driven detail shell (Task A5.7), the conversations counterpart of
// `agents/AgentDetail.vue` (Task A5.4) and `knowledge/CollectionDetail.vue`
// (Task A5.6): resolves the dialog by the `:agentId/:conversationId` route
// params and exposes it to the `conversation`/`conversation-settings` child
// routes via their own `conversationsStore.getConversation(...)` call.
// get.3xtr.im keeps history and settings as one component with an internal
// properties-panel toggle instead of a routed tab — the kit reuses the
// NavbarMenu/NavbarTabs convention already established for agent and
// knowledge detail screens instead of introducing a third pattern for this
// shape of screen (see `.todo` Task A5.7 "settings — отдельная navbar tab").
// Losing the dialog mid-view (workspace switched to one without it, or a bad
// `:agentId`/`:conversationId` combination) falls through to the same
// `ListAsyncState` error branch as the other detail shells, with a way back
// to the list — no request is ever made for either case, there being no
// backend.
const route = useRoute();
const { isLoading } = useSimulatedLoading();
const conversationsStore = useConversationsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const conversation = computed(() => conversationsStore.getConversation(
  activeWorkspaceId.value,
  route.params.agentId,
  route.params.conversationId,
));

const backTo = computed(
  () => ({ name: "conversations-agent", params: { agentId: route.params.agentId } }),
);

const tabs = computed(() => [
  {
    label: "Диалог",
    to: {
      name: "conversation",
      params: { agentId: route.params.agentId, conversationId: route.params.conversationId },
    },
  },
  {
    label: "Настройки",
    to: {
      name: "conversation-settings",
      params: { agentId: route.params.agentId, conversationId: route.params.conversationId },
    },
  },
]);
</script>
