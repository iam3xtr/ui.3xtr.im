<template>
  <section class="tr-workbench-page">
    <section
      class="tr-conversations tr-agents tr-agents__workbench"
      :class="[propertiesOpen ? 'is-properties-view' : 'is-chat-view', { 'is-properties-open': propertiesOpen }]"
    >
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

          <b-button
            v-if="!propertiesOpen"
            class="tr-conversation-settings-action tr-conversation-icon-action"
            icon-left="cog-outline"
            aria-label="Настройки песочницы"
            title="Настройки песочницы"
            aria-controls="agent-playground-properties"
            @click="propertiesOpen = true"
          />
        </header>

        <div class="tr-conversation-messages" aria-live="polite">
          <div class="tr-agents__sandbox-note">
            <b-icon icon="flask-outline" size="is-small" />
            Сообщения здесь не попадут в реальные диалоги.
          </div>

          <b-message
            v-if="demoStore.isPartial"
            type="is-warning"
            :closable="false"
          >
            Показана не вся история песочницы: часть сообщений недоступна
            из-за временной ошибки. Остальные ниже — актуальны.
          </b-message>

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

      <aside
        v-if="propertiesOpen && agent"
        id="agent-playground-properties"
        class="tr-conversation-panel tr-conversation-properties"
        @keydown.esc="propertiesOpen = false"
      >
        <header class="tr-conversation-header">
          <b-button
            class="tr-conversation-properties-action tr-conversation-icon-action"
            icon-left="arrow-left"
            aria-label="К песочнице"
            title="К песочнице"
            @click="propertiesOpen = false"
          />
          <h2 class="tr-conversation-title">Настройки</h2>
        </header>

        <div class="tr-conversation-properties-body">
          <div class="tr-form">
            <b-field label="Температура">
              <b-slider
                v-model="agent.temperature"
                :min="0"
                :max="1"
                :step="0.1"
                :tooltip="true"
              />
            </b-field>

            <b-field label="Системная инструкция">
              <b-input
                v-model="agent.instructions"
                type="textarea"
                rows="7"
              />
            </b-field>
          </div>
        </div>
      </aside>
    </section>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAgentsStore } from "../../stores/agents";
import { useDemoStore } from "../../stores/demo";
import { useWorkspaceStore } from "../../stores/workspace";

// Agent sandbox tab (Task A5.4), routed at `/agents/:id`. Renders inside
// `AgentDetail`'s `RouterView`, which already gates on the agent existing —
// `agent` is re-derived here from the route param rather than passed down,
// mirroring get.3xtr.im's `agents/components/Playground.vue`.
//
// Settings pane: mirrors `conversations/ConversationDetail.vue`'s
// gear-opened properties aside — same `tr-conversation-settings-action`/
// `tr-conversation-properties-*` classes, same `.tr-conversations` grid, but
// a plain local `propertiesOpen` ref instead of a provide/inject pair, since
// this component owns its own grid root directly (`AgentDetail.vue` never
// shares one with it the way `Conversations.vue` shares its grid with
// `ConversationDetail.vue`). Only the fields that actually change the
// sandbox's live generation behaviour — temperature and the system prompt,
// both immediate-apply straight onto the store's fixture object like
// `AgentSettings.vue`'s fields always were — live here; `AgentSettings.vue`'s
// own routed tab keeps the non-runtime fields (name/status) plus the
// model/BYOK section, none of which affect an in-progress sandbox session.
// Open by default, and — unlike the conversations aside — never reset on its
// own: there is only ever one agent here (the route param), not a list of
// them to switch between mid-session. See `propertiesOpen`'s own comment
// below for why it can only ever be closed on a narrow viewport.
//
// Demo-режим (Stage A7, Task A7.5): loading/error/permission-denied are
// gated by the parent shell (`agents/AgentDetail.vue`); this tab only adds
// the `partial` banner over its own message list — the same `b-message`
// contract as `knowledge/Files.vue`/`Agents.vue` (Task A7.3/A7.4).
const route = useRoute();
const router = useRouter();
const demoStore = useDemoStore();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const draft = ref("");

// Open by default (this message's fix) — the sandbox always shows its
// runtime settings alongside chat at widths that fit both; it only
// "disappears" when a narrow viewport collapses the grid to one pane at a
// time (the generic `.tr-conversations` narrow-viewport rules in
// `trickster-buefy.scss`), where `.tr-conversation-properties-action`'s
// arrow-left (not a `×` — there is nothing to "close" at that point, just a
// pane to leave) becomes visible and switches back to chat. The gear only
// ever shows once that happens (`v-if="!propertiesOpen"` in the chat
// header) — on a wide viewport, where settings stay put, there is no
// control that can set `propertiesOpen` back to `false`, so it never
// appears there.
const propertiesOpen = ref(true);

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
