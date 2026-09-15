<template>
  <div class="tr-conversation-channel-context">
    <b-tag size="is-small">{{ conversation.channel }}</b-tag>
    <b-tag
      size="is-small"
      :type="conversation.status === 'Активен' ? 'is-primary' : undefined"
    >
      {{ conversation.status }}
    </b-tag>

    <template v-if="conversation.awaitingOperator">
      <b-tag size="is-small" :type="ownerTagType">{{ ownerLabel }}</b-tag>

      <b-button
        v-if="canClaim"
        size="is-small"
        class="tr-conversation-handoff-action"
        @click="claim"
      >
        Взять диалог
      </b-button>

      <b-button
        v-if="isOwner"
        size="is-small"
        class="tr-conversation-handoff-action"
        @click="release"
      >
        Вернуть агенту
      </b-button>
    </template>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { isHandoffClaimable, ownsHandoff, useConversationsStore } from "../../stores/conversations";
import { useProfileStore } from "../../stores/profile";
import { useWorkspaceStore } from "../../stores/workspace";

// Channel/status context row (Task A5.7), the kit counterpart of
// get.3xtr.im's `conversations/components/ConversationHeader.vue` scoped to
// what the fixture models: the dialog's channel and status. The cabinet
// version also renders live channel runtime/webhook badges and an "open
// channel" link sourced from its channels store — the kit's conversation
// fixtures are not linked to a channel instance id, so that part is left for
// a coordinated follow-up rather than fabricated here.
//
// Task A10.5 adds the owner/lease row: while the dialog is escalated
// (`conversation.awaitingOperator`), an owner tag says who currently holds
// the handoff (or that it's unclaimed/stale), and «Взять диалог»/«Вернуть
// агенту» are separate store commands (`claimHandoff`/`releaseHandoff`, see
// `stores/conversations.js`) gated by `isHandoffClaimable`/`ownsHandoff` —
// never derived from `conversation.updated`/message `time`. A claim/release
// conflict is only reachable here if the fixture state changes between this
// component's render and the click (there is no second actor in this
// backend-less kit to race against); the composer's own send-time conflict
// in `History.vue` is the one a user can actually trigger through the UI —
// see that file's comment.
const props = defineProps({
  /** @type {import("vue").PropType<import("../../stores/conversations").Conversation>} */
  conversation: {
    type: Object,
    required: true,
  },
});

const conversationsStore = useConversationsStore();
const workspaceStore = useWorkspaceStore();
const profileStore = useProfileStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const { profile } = storeToRefs(profileStore);

// The current operator's identity for the handoff commands below — see
// `profile.js`'s own `id` field comment (Task A10.5) for why this store
// carries it.
const operator = computed(() => ({ id: profile.value.id, name: profile.value.name }));

const owner = computed(() => props.conversation.handoff?.owner ?? null);
const leaseExpired = computed(() => Boolean(props.conversation.handoff?.leaseExpired));
const isOwner = computed(() => ownsHandoff(props.conversation, operator.value.id));
const canClaim = computed(() => !isOwner.value && isHandoffClaimable(props.conversation));

const ownerLabel = computed(() => {
  if (!owner.value) {
    return "Требует оператора";
  }

  if (leaseExpired.value) {
    return `Владение истекло — был(а) ${owner.value.name}`;
  }

  return isOwner.value ? "Ведёте вы" : `Отвечает: ${owner.value.name}`;
});

const ownerTagType = computed(() => {
  if (!owner.value || leaseExpired.value) {
    return "is-warning";
  }

  return isOwner.value ? "is-primary" : undefined;
});

function claim() {
  conversationsStore.claimHandoff(activeWorkspaceId.value, props.conversation.id, operator.value);
}

function release() {
  conversationsStore.releaseHandoff(activeWorkspaceId.value, props.conversation.id, operator.value);
}
</script>
