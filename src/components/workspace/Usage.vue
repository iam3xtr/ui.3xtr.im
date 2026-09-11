<template>
  <section class="tr-workspace-usage">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Обзор пространства</h1>
        <p class="tr-page-subtitle">{{ workspace?.name }}</p>
      </div>
    </div>

    <Loader v-if="isLoading" size="section" class="tr-loader--standalone" />

    <section v-else class="tr-grid tr-grid--2">
      <article class="tr-card">
        <h2 class="tr-card__title">Пространство</h2>

        <div class="tr-stack">
          <div class="tr-row tr-row--between">
            <span>Идентификатор</span>
            <strong>{{ workspace?.id }}</strong>
          </div>
          <div class="tr-row tr-row--between">
            <span>Роль</span>
            <strong>{{ workspace?.role }}</strong>
          </div>
          <div class="tr-row tr-row--between">
            <span>Тариф</span>
            <b-tag v-if="tariff.tagType" :type="tariff.tagType">{{ tariff.displayName }}</b-tag>
            <strong v-else>{{ tariff.displayName }}</strong>
          </div>
        </div>
      </article>

      <article class="tr-card">
        <div class="tr-row tr-row--between mb-4">
          <h2 class="tr-card__title mb-0">Использование</h2>
          <RouterLink :to="{ name: 'workspace-plans' }">Сменить тариф</RouterLink>
        </div>

        <div class="tr-stack">
          <div v-for="limit in tariff.limits" :key="limit.key">
            <div class="tr-row tr-row--between">
              <span>{{ limit.label }}</span>
              <span class="tr-muted">{{ limit.caption }}</span>
            </div>
            <b-progress
              v-if="limit.progress !== null"
              :value="limit.progress"
              type="is-primary"
              size="is-small"
            />
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useWorkspaceStore } from "../../stores/workspace";
import Loader from "../common/Loader.vue";

// Overview tab (Task A5.8), routed at `/workspace/` — equivalent of
// get.3xtr.im's `workspace/components/Usage.vue` (there: `<LLMSummary
// :workspace-id />`). The kit has no `LLMSummary` component/fixture, so this
// renders the workspace identity plus the same tariff/limit shape already
// modeled by `stores/workspace.js` (`activeWorkspaceTariff`) and rendered in
// the sidebar by `TariffSummaryCard.vue` — same data, full-page layout
// instead of a compact card.
const { isLoading } = useSimulatedLoading();
const workspaceStore = useWorkspaceStore();
const { workspaces, activeWorkspaceId, activeWorkspaceTariff } = storeToRefs(workspaceStore);

const workspace = computed(
  () => workspaces.value.find((item) => item.id === activeWorkspaceId.value) ?? null,
);
const tariff = activeWorkspaceTariff;
</script>
