<template>
  <section class="tr-knowledge-collection">
    <AsyncState
      v-if="collection && demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <ListAsyncState
      v-else
      :loading="isLoading || (Boolean(collection) && demoStore.isLoading)"
      :error="!collection || demoStore.isError"
      :error-icon="collection ? demoStore.listAsyncState.errorIcon : 'book-off-outline'"
      :error-title="collection ? demoStore.listAsyncState.errorTitle : 'Коллекция не найдена'"
      :error-message="collection
        ? demoStore.listAsyncState.errorMessage
        : 'Возможно, коллекция была удалена или вы переключили рабочее пространство.'"
    >
      <template #error-action>
        <b-button tag="router-link" :to="{ name: 'knowledge' }" type="is-primary">
          К коллекциям
        </b-button>
      </template>

      <PageHeader
        :title="collection?.name"
        :subtitle="collection?.description"
        :back="{ to: { name: 'knowledge' }, title: 'К коллекциям' }"
      />

      <NavbarMenu>
        <NavbarTabs :items="tabs" aria-label="Навигация по коллекции" />
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
import { useDemoStore } from "../../stores/demo";
import { useKnowledgeStore } from "../../stores/knowledge";
import { useWorkspaceStore } from "../../stores/workspace";
import { AsyncState, ListAsyncState, NavbarMenu } from "@iam3xtr/vue";
import { NavbarTabs, PageHeader } from "@iam3xtr/vue/navigation";

// Route-driven detail shell (Task A5.6), the knowledge counterpart of
// `agents/AgentDetail.vue` (Task A5.4): resolves the collection by the `:id`
// route param and exposes it to the `knowledge-collection`/`-settings`/
// `-statistics` child routes via their own `knowledgeStore.getCollection(...)`
// call. get.3xtr.im's `knowledge/views/Collection.vue` instead keeps one
// component alive across all three tabs and derives the active one from
// `route.path` — the kit already has a nested-route + NavbarMenu/NavbarTabs
// pattern for this shape of screen (Task A5.4) and reuses it here instead of
// introducing a second convention. Losing the collection mid-view (workspace
// switched to one without it) falls through to the same `ListAsyncState`
// error branch as a bad `:id`, with a way back to the catalog — no request is
// ever made for either case, there being no backend.
//
// Demo-режим (Stage A7, Task A7.4): route-валидация (`!collection`) всегда
// побеждает над глобальным demo-режимом — «коллекция не найдена» и её
// ссылка "К коллекциям" показываются независимо от `useDemoStore()`, а не
// маскируются, например, режимом `empty`/`ready`. Когда коллекция реально
// найдена, тот же `ListAsyncState` дополнительно отражает
// `demoStore.isLoading`/`isError` (заголовок/сообщение берутся из
// `demoStore.listAsyncState`), а permission-denied рендерится прямым
// `AsyncState` — тем же приёмом, что в `Agents.vue`/`ChannelsView.vue`
// (Task A7.3), и тоже только когда коллекция найдена.
const route = useRoute();
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const knowledgeStore = useKnowledgeStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const collection = computed(
  () => knowledgeStore.getCollection(activeWorkspaceId.value, route.params.id),
);

const tabs = computed(() => [
  { label: "Файлы", to: { name: "knowledge-collection", params: { id: route.params.id } } },
  { label: "Настройки", to: { name: "knowledge-collection-settings", params: { id: route.params.id } } },
  { label: "Статистика", to: { name: "knowledge-collection-statistics", params: { id: route.params.id } } },
]);
</script>
