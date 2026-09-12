<template>
  <section class="tr-conversation-panel tr-conversation-chat">
    <AsyncState
      v-if="conversation && demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <ListAsyncState
      v-else
      :loading="isLoading || (Boolean(conversation) && demoStore.isLoading)"
      :error="!conversation || demoStore.isError"
      :error-icon="conversation ? demoStore.listAsyncState.errorIcon : 'message-off-outline'"
      :error-title="conversation ? demoStore.listAsyncState.errorTitle : 'Диалог не найден'"
      :error-message="conversation
        ? demoStore.listAsyncState.errorMessage
        : 'Возможно, диалог был удалён или вы переключили рабочее пространство.'"
    >
      <template #error-action>
        <b-button tag="router-link" :to="{ name: 'conversations' }" type="is-primary">
          К диалогам
        </b-button>
      </template>

      <header class="tr-conversation-header">
        <b-button
          class="tr-conversation-list-action tr-conversation-icon-action"
          tag="router-link"
          :to="{ name: 'conversations' }"
          icon-left="arrow-left"
          aria-label="К диалогам"
          title="К диалогам"
        />

        <div class="tr-conversation-identity">
          <span class="tr-conversation-avatar">
            {{ conversation?.initials }}
          </span>
          <span>
            <strong>{{ conversation?.contact }}</strong>
            <ConversationHeader v-if="conversation" :conversation="conversation" />
          </span>
        </div>

        <b-button
          v-if="!propertiesOpen"
          class="tr-conversation-settings-action tr-conversation-icon-action"
          icon-left="cog-outline"
          aria-label="Настройки диалога"
          title="Настройки диалога"
          aria-controls="conversation-properties"
          @click="openProperties"
        />
      </header>

      <div class="tr-conversation-detail-body">
        <ConversationHistory />
      </div>
    </ListAsyncState>
  </section>

  <aside
    v-if="isReady && propertiesOpen"
    id="conversation-properties"
    class="tr-conversation-panel tr-conversation-properties"
    @keydown.esc="closeProperties"
  >
    <header class="tr-conversation-header">
      <b-button
        class="tr-conversation-properties-action tr-conversation-icon-action"
        icon-left="arrow-left"
        :aria-label="conversation?.contact"
        :title="conversation?.contact"
        @click="closeProperties"
      />
      <h2 class="tr-conversation-title">Настройки</h2>
    </header>

    <div class="tr-conversation-properties-body">
      <ConversationSettings />
    </div>
  </aside>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, inject } from "vue";
import { useRoute } from "vue-router";

import { conversationPropertiesKey } from "../../composables/conversationProperties";
import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useConversationsStore } from "../../stores/conversations";
import { useDemoStore } from "../../stores/demo";
import { useWorkspaceStore } from "../../stores/workspace";
import AsyncState from "../common/AsyncState.vue";
import ListAsyncState from "../common/ListAsyncState.vue";
import ConversationHeader from "./ConversationHeader.vue";
import ConversationHistory from "./History.vue";
import ConversationSettings from "./Settings.vue";

// Route-driven detail shell (Task A5.7), the conversations counterpart of
// `agents/AgentDetail.vue` (Task A5.4) and `knowledge/CollectionDetail.vue`
// (Task A5.6): resolves the dialog by the `:agentId/:conversationId` route
// params and passes it down to `History.vue`/`Settings.vue` (each re-derives
// it from the same route params rather than receiving it as a prop, see
// those files). Losing the dialog mid-view (workspace switched to one
// without it, or a bad `:agentId`/`:conversationId` combination) falls
// through to the same `ListAsyncState` error branch as the other detail
// shells, with a way back to the list — no request is ever made for either
// case, there being no backend.
//
// Settings is a third grid column, not a routed tab or a body swap: matching
// get.3xtr.im's own `conversations/views/Conversation.vue` three-pane
// workbench (chat + list, both owned by `Conversations.vue`, plus this
// shell's own properties aside), this template is a two-root fragment — the
// `<section class="tr-conversation-chat">` and the `<aside
// class="tr-conversation-properties">` below are siblings, both rendered
// through `Conversations.vue`'s `<RouterView>` straight into its
// `.tr-conversations` grid (see that file), so CSS Grid lays all three
// columns (list/chat/properties) out together. `conversationPropertiesKey`
// (provided by `Conversations.vue`, which owns the grid's
// `is-properties-open` class and defaults `propertiesOpen` to `true`) is
// what shows/hides the aside — no NavbarMenu/NavbarTabs, no
// `conversation-settings` route (see router.js's comment above the
// conversations routes for why that was dropped). Mirroring
// `AgentPlayground.vue`'s sandbox pane: the gear button in the chat header
// only renders while the aside is closed (`v-if="!propertiesOpen"`) — it can
// only actually become closed on a narrow viewport, where the aside's own
// arrow-left (`tr-conversation-properties-action`, not a `×` — there is
// nothing to close at that point, just a pane to leave) switches back to
// history. The aside only ever renders once the chat pane itself is
// `isReady` (dialog found, not permission-denied/error/loading) — there is
// nothing to configure for a dialog that failed to load, and gating it the
// same way `ListAsyncState` gates the chat pane keeps both in sync without
// duplicating its loading/error inputs onto a second component.
//
// Task A8.4: this shell is nested under `Conversations.vue`'s own
// `conversations-agent` route — the `.tr-conversation-panel`/`.tr-conversation-chat`
// box, header (avatar/name/channel-status tags) and back button that used to
// live in `conversations/History.vue`'s own now-removed standalone wrapper
// live here instead, so the chat pane shares one header and one "back to
// list" button instead of History duplicating it. That back button
// (`tr-conversation-list-action`, a `router-link` to the plain `/conversations`
// route) actually navigates and clears `route.params.conversationId` — it
// used to only flip a shared `mobileView` ref, leaving the dialog selected
// underneath so widening past the shell's `1024px` breakpoint (see
// `trickster-buefy.scss`) would instantly reveal it again, but that was
// surprising rather than useful (see `Conversations.vue`'s own comment for
// the fix). The same `{ name: "conversations" }` target backs the
// error-state "К диалогам" button below.
//
// Demo-режим (Stage A7, Task A7.5): тот же приём, что
// `agents/AgentDetail.vue` и `knowledge/CollectionDetail.vue` (Task A7.4) —
// route-валидация (`!conversation`) побеждает над глобальным demo-режимом,
// а когда диалог найден, `ListAsyncState` дополнительно отражает
// `demoStore.isLoading`/`isError`, permission-denied — прямым `AsyncState`.
const route = useRoute();
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const conversationsStore = useConversationsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const { propertiesOpen, openProperties, closeProperties } = inject(conversationPropertiesKey);

const conversation = computed(() => conversationsStore.getConversation(
  activeWorkspaceId.value,
  route.params.agentId,
  route.params.conversationId,
));

const isReady = computed(() => Boolean(conversation.value)
  && !demoStore.isPermissionDenied
  && !demoStore.isError
  && !isLoading.value
  && !demoStore.isLoading);
</script>
