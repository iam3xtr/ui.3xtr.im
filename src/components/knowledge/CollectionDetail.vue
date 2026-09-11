<template>
  <section class="tr-knowledge-collection">
    <ListAsyncState
      :loading="isLoading"
      :error="!collection"
      error-icon="book-off-outline"
      error-title="Коллекция не найдена"
      error-message="Возможно, коллекция была удалена или вы переключили рабочее пространство."
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
import { useKnowledgeStore } from "../../stores/knowledge";
import { useWorkspaceStore } from "../../stores/workspace";
import ListAsyncState from "../common/ListAsyncState.vue";
import NavbarMenu from "../common/NavbarMenu.vue";
import NavbarTabs from "../common/NavbarTabs.vue";
import PageHeader from "../common/PageHeader.vue";

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
const route = useRoute();
const { isLoading } = useSimulatedLoading();
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
