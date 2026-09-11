<template>
  <section class="tr-workbench-page">
    <section class="tr-conversations tr-agents tr-agents__workbench">
      <article class="tr-conversation-panel tr-conversation-chat">
        <header class="tr-conversation-header">
          <b-button
            class="tr-conversation-list-action tr-conversation-icon-action"
            icon-left="arrow-left"
            aria-label="К агентам"
            title="К агентам"
            @click="router.push({ name: 'agents' })"
          />

          <div class="tr-conversation-identity">
            <span class="tr-conversation-avatar">
              <b-icon icon="robot-outline" size="is-small" />
            </span>
            <span>
              <strong>{{ agent?.name }}</strong>
              <small>{{ agent?.status }}</small>
            </span>
          </div>
        </header>

        <div class="tr-conversation-messages" aria-live="polite">
          <div class="tr-agents__sandbox-note">
            <b-icon icon="flask-outline" size="is-small" />
            Сообщения здесь не попадут в реальные диалоги.
          </div>

          <div
            v-for="message in agent?.messages"
            :key="message.id"
            class="tr-chat-message"
            :class="{ 'is-outgoing': message.outgoing }"
          >
            <p>{{ message.text }}</p>
            <small>{{ message.time }}</small>
          </div>
        </div>

        <footer class="tr-conversation-composer">
          <b-input
            v-model="draft"
            class="tr-conversation-composer-input"
            placeholder="Сообщение для агента"
            @keyup.enter="sendMessage"
          />
          <b-button
            type="is-primary"
            icon-left="send"
            aria-label="Отправить"
            @click="sendMessage"
          />
        </footer>
      </article>
    </section>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAgentsStore } from "../../stores/agents";
import { useWorkspaceStore } from "../../stores/workspace";

// Agent sandbox tab (Task A5.4), routed at `/agents/:id`. Renders inside
// `AgentDetail`'s `RouterView`, which already gates on the agent existing —
// `agent` is re-derived here from the route param rather than passed down,
// mirroring get.3xtr.im's `agents/components/Playground.vue`.
const route = useRoute();
const router = useRouter();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const draft = ref("");

const agent = computed(
  () => agentsStore.getAgent(activeWorkspaceId.value, route.params.id),
);

function sendMessage() {
  const text = draft.value.trim();

  if (!text || !agent.value) {
    return;
  }

  agentsStore.sendMessage(activeWorkspaceId.value, agent.value.id, text);
  draft.value = "";
}
</script>
