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

    <b-message
      v-if="sendConflict"
      type="is-warning"
      class="tr-conversation-handoff-conflict"
      @close="sendConflict = ''"
    >
      {{ sendConflict }}
    </b-message>

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
import {
  computed, ref, watch,
} from "vue";
import { useRoute } from "vue-router";

import { useConversationsStore } from "../../stores/conversations";
import { useDemoStore } from "../../stores/demo";
import { useProfileStore } from "../../stores/profile";
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
//
// Task A10.5: `sendMessage` now returns `{ ok, reason, handoff }` — when the
// dialog is escalated and owned by a different operator, `ok` is `false`
// and the draft is deliberately *not* cleared (`draft.value = ""` only runs
// on `ok: true`), so the composer never silently drops what was typed nor
// sends it under the wrong operator's name. `sendConflict` renders that
// refusal as a warning banner right above the composer; the owner it names
// comes straight from the result's own `handoff` (the same reactive store
// state `ConversationHeader.vue`'s owner tag already shows), so there is
// nothing to separately "refresh" — the state shown here already is current.
const route = useRoute();
const demoStore = useDemoStore();
const conversationsStore = useConversationsStore();
const workspaceStore = useWorkspaceStore();
const profileStore = useProfileStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const { profile } = storeToRefs(profileStore);

const draft = ref("");
const sendConflict = ref("");

const conversation = computed(() => conversationsStore.getConversation(
  activeWorkspaceId.value,
  route.params.agentId,
  route.params.conversationId,
));

// A stale conflict banner from a previous dialog must not survive switching
// to another one — the draft (a plain local `ref`) already resets on
// navigation for the same reason (`History.vue` is re-mounted per route).
watch(() => route.params.conversationId, () => {
  sendConflict.value = "";
});

/**
 * @param {"not-found" | "owned-by-another" | "lease-missing"} reason
 * @param {import("../../stores/conversations").ConversationHandoff} [handoff]
 * @returns {string}
 */
function describeSendConflict(reason, handoff) {
  if (reason === "owned-by-another" && handoff?.owner) {
    return `Сообщение не отправлено: диалог сейчас ведёт ${handoff.owner.name}. `
      + "Возьмите диалог, чтобы отвечать от своего имени.";
  }

  return "Сообщение не отправлено: возьмите диалог, чтобы отвечать от своего имени.";
}

function sendMessage() {
  const text = draft.value.trim();

  if (!text || !conversation.value) {
    return;
  }

  const operator = { id: profile.value.id, name: profile.value.name };
  const result = conversationsStore.sendMessage(
    activeWorkspaceId.value,
    conversation.value.id,
    text,
    operator,
  );

  if (!result.ok) {
    sendConflict.value = describeSendConflict(result.reason, result.handoff);
    return;
  }

  sendConflict.value = "";
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
