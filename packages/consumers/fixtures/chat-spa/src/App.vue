<script setup>
// Chat-target shell built only from public package exports and a Buefy
// control. No Router, API, auth, SSE or copied consumer code.
import { onBeforeUnmount, ref } from "vue";
import { Icon, ChatHistory, MessageComposer } from "@iam3xtr/vue";
import { applyTheme, watchSystemTheme, THEME_MODES } from "./theme.js";

const props = defineProps({
  initialMode: { type: String, default: "auto" },
  embedded: { type: Boolean, default: false },
});

const mode = ref(props.initialMode);
const draft = ref("");
const submitted = ref([]);
const messages = ref([
  { id: "m1", text: "Hello", outgoing: false },
  { id: "m2", text: "A_very_long_unbroken_message_".repeat(12), outgoing: true },
]);

function setMode(next) {
  mode.value = next;
  applyTheme(next);
}
const stop = watchSystemTheme(() => mode.value);
onBeforeUnmount(stop);

function onSubmit(text) {
  submitted.value.push(text);
  messages.value.push({ id: `m${messages.value.length + 1}`, text, outgoing: true });
  draft.value = "";
}

defineExpose({ mode, draft, submitted, setMode });
</script>

<template>
  <div class="chat-shell" :class="{ 'chat-shell--embedded': embedded }" :data-embedded="embedded ? 'true' : 'false'">
    <div class="chat-shell__toolbar">
      <Icon name="anthropic" :size="20" class="chat-shell__brand" />
      <b-button
        v-for="m in THEME_MODES"
        :key="m"
        size="is-small"
        :aria-pressed="mode === m ? 'true' : 'false'"
        :data-theme-mode="m"
        @click="setMode(m)"
      >{{ m }}</b-button>
    </div>
    <ChatHistory :messages="messages" class="chat-shell__history" aria-label="Dialog history" />
    <MessageComposer
      v-model="draft"
      placeholder="Write a message"
      textarea-aria-label="Message body"
      submit-aria-label="Send"
      aria-label="Composer"
      @submit="onSubmit"
    />
  </div>
</template>
