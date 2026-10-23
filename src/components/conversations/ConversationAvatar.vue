<template>
  <span class="tr-conversation-avatar" aria-hidden="true">
    <img v-if="conversation.avatarUrl" :src="conversation.avatarUrl" alt="" loading="lazy" />
    <template v-else>{{ conversation.initials }}</template>
  </span>
</template>

<script setup>
// Opt-in conversation avatar (Task S2-14). Callers render it only when
// `useDemoStore().conversationAvatars` is on; by default the list and header
// have no avatar container, placeholder or inset. Decorative: the contact
// name beside it is the accessible name. An `avatarUrl` is shown only when
// the fixture supplies one — nothing is fetched otherwise.
defineProps({
  /** @type {import("vue").PropType<import("../../stores/conversations").Conversation>} */
  conversation: { type: Object, required: true },
});
</script>
