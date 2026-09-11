<template>
  <section class="tr-agent-detail">
    <AsyncState
      v-if="agent && demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <ListAsyncState
      v-else
      :loading="isLoading || (Boolean(agent) && demoStore.isLoading)"
      :error="!agent || demoStore.isError"
      :error-icon="agent ? demoStore.listAsyncState.errorIcon : 'robot-off-outline'"
      :error-title="agent ? demoStore.listAsyncState.errorTitle : 'Агент не найден'"
      :error-message="agent
        ? demoStore.listAsyncState.errorMessage
        : 'Возможно, агент был удалён или вы переключили рабочее пространство.'"
    >
      <template #error-action>
        <b-button tag="router-link" :to="{ name: 'agents' }" type="is-primary">
          К списку агентов
        </b-button>
      </template>

      <NavbarMenu>
        <NavbarTabs :items="tabs" aria-label="Навигация по агенту" />
      </NavbarMenu>

      <RouterView :key="`${activeWorkspaceId}-${route.params.id}`" />
    </ListAsyncState>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useAgentsStore } from "../../stores/agents";
import { useDemoStore } from "../../stores/demo";
import { useWorkspaceStore } from "../../stores/workspace";
import AsyncState from "../common/AsyncState.vue";
import ListAsyncState from "../common/ListAsyncState.vue";
import NavbarMenu from "../common/NavbarMenu.vue";
import NavbarTabs from "../common/NavbarTabs.vue";

// Route-driven detail shell (Task A5.4; `agent-channels` tab added in
// Task A5.5): resolves the agent by the `:id` route param and exposes it to
// the `agent`/`agent-settings`/`agent-channels` child routes via their own
// `agentsStore.getAgent(...)` call — mirrors get.3xtr.im's
// `agents/views/Agent.vue`, which likewise re-derives the agent in every tab
// component instead of passing it down. Losing the agent mid-view (workspace
// switched to one without it) falls through to the same `ListAsyncState`
// error branch as a bad `:id`, with a way back to the catalog.
//
// Demo-режим (Stage A7, Task A7.5): route-валидация (`!agent`) всегда
// побеждает над глобальным demo-режимом — тот же приём, что
// `knowledge/CollectionDetail.vue` (Task A7.4). Когда агент реально найден,
// тот же `ListAsyncState` дополнительно отражает `demoStore.isLoading`/
// `isError`, а permission-denied рендерится прямым `AsyncState` — тем же
// приёмом, что в `Agents.vue`/`ChannelsView.vue` (Task A7.3), тоже только
// когда агент найден.
const route = useRoute();
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const agentsStore = useAgentsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const agent = computed(
  () => agentsStore.getAgent(activeWorkspaceId.value, route.params.id),
);

const tabs = computed(() => [
  { label: "Песочница", to: { name: "agent", params: { id: route.params.id } } },
  { label: "Настройки", to: { name: "agent-settings", params: { id: route.params.id } } },
  { label: "Каналы", to: { name: "agent-channels", params: { id: route.params.id } } },
]);
</script>
