<template>
  <div class="tr-conversation-channel-context">
    <b-tag size="is-small">{{ conversation.channel }}</b-tag>
    <b-tag
      size="is-small"
      :type="conversation.status === 'Активен' ? 'is-primary' : undefined"
    >
      {{ conversation.status }}
    </b-tag>
  </div>
</template>

<script setup>
// Channel/status context row (Task A5.7), the kit counterpart of
// get.3xtr.im's `conversations/components/ConversationHeader.vue` scoped to
// what the fixture models: the dialog's channel and status. The cabinet
// version also renders live channel runtime/webhook badges and an "open
// channel" link sourced from its channels store — the kit's conversation
// fixtures are not linked to a channel instance id, so that part is left for
// a coordinated follow-up rather than fabricated here.
defineProps({
  /** @type {import("vue").PropType<import("../../stores/conversations").Conversation>} */
  conversation: {
    type: Object,
    required: true,
  },
});
</script>
