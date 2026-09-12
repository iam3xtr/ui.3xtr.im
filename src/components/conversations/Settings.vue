<template>
  <section v-if="conversation" class="tr-conversation-settings">
    <div class="tr-form">
      <b-field label="Контакт">
        <b-input :model-value="conversation.contact" disabled />
      </b-field>

      <b-field label="Агент">
        <b-select v-model="conversation.agent" expanded>
          <option v-for="agent in agentOptions" :key="agent">{{ agent }}</option>
        </b-select>
      </b-field>

      <b-field label="Статус">
        <b-select v-model="conversation.status" expanded>
          <option v-for="status in conversationStatuses" :key="status">
            {{ status }}
          </option>
        </b-select>
      </b-field>

      <b-field label="Канал">
        <b-select v-model="conversation.channel" expanded>
          <option v-for="channel in conversationChannels" :key="channel">
            {{ channel }}
          </option>
        </b-select>
      </b-field>

      <dl class="tr-conversation-details">
        <div>
          <dt>Создан</dt>
          <dd>{{ conversation.created }}</dd>
        </div>
        <div>
          <dt>ID</dt>
          <dd>{{ conversation.id }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useAgentsStore } from "../../stores/agents";
import {
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  useConversationsStore,
} from "../../stores/conversations";
import { useWorkspaceStore } from "../../stores/workspace";

// Settings pane for the open dialog — the kit counterpart of get.3xtr.im's
// `conversations/components/Settings.vue`. Rendered by
// `conversations/ConversationDetail.vue` inside its properties `<aside>`,
// next to (not instead of) `History.vue` — a third grid column opened by the
// gear button in that shell's chat header, via `conversationPropertiesKey`
// (a provide/inject pair owned by `Conversations.vue`, not a local ref here
// or a routed tab — see `ConversationDetail.vue`'s top comment for the full
// mechanism). Fields bind straight onto the store's fixture object (same
// immediate-apply pattern as `AgentSettings.vue`) — there is no backend to
// save to. A plain `.tr-form` — no `.tr-settings__panel` card around it,
// unlike `AgentSettings.vue`/`knowledge/Settings.vue`'s routed tabs — since
// the aside itself (`.tr-conversation-properties`) already is the bordered
// panel; nesting another one inside it doubled the frame (this message's
// fix), same reasoning as `AgentPlayground.vue`'s own settings pane. The
// cabinet's rename/external-name field and channel runtime context are not
// modeled here: the kit's fixture has no channel-instance link (see
// `ConversationHeader.vue`), so this scopes to the fields the fixture
// actually carries.
const route = useRoute();
const conversationsStore = useConversationsStore();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const conversationStatuses = CONVERSATION_STATUSES;
const conversationChannels = CONVERSATION_CHANNELS;

const conversation = computed(() => conversationsStore.getConversation(
  activeWorkspaceId.value,
  route.params.agentId,
  route.params.conversationId,
));

const agentOptions = computed(
  () => agentsStore.listByWorkspace(activeWorkspaceId.value).map((agent) => agent.name),
);
</script>
