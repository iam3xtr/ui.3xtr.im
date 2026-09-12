<template>
  <template v-if="conversation">
    <div class="tr-conversation-messages" aria-live="polite">
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показана не вся история диалога: часть сообщений недоступна
        из-за временной ошибки. Остальные ниже — актуальны.
      </b-message>

      <div
        v-for="message in conversation.messages"
        :key="message.id"
        class="tr-chat-message"
        :class="{ 'is-outgoing': message.outgoing }"
      >
        <p>{{ message.text }}</p>
        <small>
          {{ message.time }}
          <MessageDeliveryStatus
            v-if="message.delivery"
            :delivery="message.delivery"
            @retry="retryDelivery(message)"
          />
        </small>
      </div>
    </div>

    <footer class="tr-conversation-composer">
      <b-input
        v-model="draft"
        class="tr-conversation-composer-input"
        placeholder="Напишите сообщение"
        @keyup.enter="sendMessage"
      />
      <b-button
        type="is-primary"
        icon-left="send"
        aria-label="Отправить"
        @click="sendMessage"
      />
    </footer>
  </template>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import { useConversationsStore } from "../../stores/conversations";
import { useDemoStore } from "../../stores/demo";
import { useWorkspaceStore } from "../../stores/workspace";
import MessageDeliveryStatus from "./MessageDeliveryStatus.vue";

// History pane for the open dialog, always rendered inside
// `ConversationDetail.vue`'s `.tr-conversation-detail-body` — `Settings.vue`
// is a separate `<aside>` grid column next to it, opened by that shell's
// header's gear toggle, not a swap of this pane (see that file's top
// comment). That parent shell already gates on the dialog existing;
// `conversation` is re-derived here from the route params via the store's
// own lookup, the same way `AgentPlayground.vue` re-derives its agent
// instead of receiving it as a prop (Task A5.4). The composer only ever
// mutates the store's in-memory `messages` array — no network call is made,
// per Task A5.7's acceptance criteria.
//
// Task A8.4: the identity header (avatar/name, channel/status tags) and
// "back to list" button this used to render for its own now-removed
// standalone `.tr-conversations`/`.tr-conversation-panel` wrapper moved up
// to the parent `ConversationDetail.vue`, which shares one header across
// both this pane and `Settings.vue` instead of each duplicating it — this
// component renders only the messages/composer pair (a template fragment,
// no single root element) that fills the shell's scrollable
// `.tr-conversation-detail-body`.
//
// Demo-режим (Stage A7, Task A7.5): loading/error/permission-denied are
// gated by the parent shell (`conversations/ConversationDetail.vue`); this
// tab only adds the `partial` banner over its own message list — the same
// `b-message` contract as `knowledge/Files.vue`/`agents/AgentPlayground.vue`.
const route = useRoute();
const demoStore = useDemoStore();
const conversationsStore = useConversationsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const draft = ref("");

const conversation = computed(() => conversationsStore.getConversation(
  activeWorkspaceId.value,
  route.params.agentId,
  route.params.conversationId,
));

function sendMessage() {
  const text = draft.value.trim();

  if (!text || !conversation.value) {
    return;
  }

  conversationsStore.sendMessage(activeWorkspaceId.value, conversation.value.id, text);
  draft.value = "";
}

/**
 * @param {import("../../stores/conversations").ChatMessage} message
 */
function retryDelivery(message) {
  if (!conversation.value) {
    return;
  }

  conversationsStore.retryMessageDelivery(
    activeWorkspaceId.value,
    conversation.value.id,
    message.id,
  );
}
</script>
