<template>
  <section class="tr-settings">
    <PageHeader
      title="Настройки агента"
      :subtitle="agent?.name"
      :back="{ to: { name: 'agent', params: { id: route.params.id } }, title: 'К агенту' }"
    />

    <div class="tr-settings__panel">
      <div v-if="agent" class="tr-form">
        <b-field label="Название">
          <b-input v-model="agent.name" />
        </b-field>

        <b-field label="Статус">
          <b-select v-model="agent.status" expanded>
            <option v-for="status in agentStatuses" :key="status">
              {{ status }}
            </option>
          </b-select>
        </b-field>

        <b-field label="Модель">
          <b-select v-model="agent.model" expanded>
            <option v-for="model in agentModels" :key="model">
              {{ model }}
            </option>
          </b-select>
        </b-field>

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
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { AGENT_MODELS, AGENT_STATUSES, useAgentsStore } from "../../stores/agents";
import { useWorkspaceStore } from "../../stores/workspace";
import PageHeader from "../common/PageHeader.vue";

// Agent settings tab (Task A5.4), routed at `/agents/:id/settings`. Fields
// bind straight onto the store's fixture object (same immediate-apply
// pattern as WorkspaceSettings.vue) — there is no backend to save to, and
// no separate draft/apply step in this kit's Playground unlike
// get.3xtr.im's widget-config aside, which this screen does not reproduce.
const route = useRoute();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const agentStatuses = AGENT_STATUSES;
const agentModels = AGENT_MODELS;

const agent = computed(
  () => agentsStore.getAgent(activeWorkspaceId.value, route.params.id),
);
</script>
