<template>
  <section v-if="collection" class="tr-knowledge-stats">
    <div class="tr-grid tr-grid--3 mb-5">
      <article class="tr-card">
        <span class="tr-muted">Всего объектов</span>
        <strong class="tr-knowledge-stats__value">{{ collection.objects.length }}</strong>
      </article>

      <article class="tr-card">
        <span class="tr-muted">Общий размер</span>
        <strong class="tr-knowledge-stats__value">{{ formatBytes(totalSize) }}</strong>
      </article>

      <article class="tr-card">
        <span class="tr-muted">Проиндексировано</span>
        <strong class="tr-knowledge-stats__value">{{ statusCounts.indexed }} / {{ collection.objects.length }}</strong>
      </article>
    </div>

    <article class="tr-card">
      <h2 class="tr-card__title">Статус по объектам</h2>

      <div class="tr-stack">
        <div v-for="entry in statusBreakdown" :key="entry.status">
          <div class="tr-row tr-row--between mb-1">
            <span>{{ entry.label }}</span>
            <span class="tr-muted">{{ entry.count }} ({{ entry.percent }}%)</span>
          </div>
          <b-progress :value="entry.percent" :type="entry.tagType || 'is-primary'" size="is-small" />
        </div>

        <p v-if="collection.objects.length === 0" class="tr-catalog-empty">
          В коллекции пока нет объектов — статистике не по чему считаться.
        </p>
      </div>
    </article>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { OBJECT_STATUSES, useKnowledgeStore } from "../../stores/knowledge";
import { useWorkspaceStore } from "../../stores/workspace";

// Statistics tab (Task A5.6), routed at `/knowledge/:id/statistics` — the
// kit's stand-in for get.3xtr.im's `llms/components/Summary.vue` (a shared
// usage-summary widget this repo has no equivalent module for yet). Numbers
// are derived straight from the fixture collection's own objects — no
// separate stats fixture to keep in sync, and no backend to disagree with it.
const route = useRoute();
const knowledgeStore = useKnowledgeStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const collection = computed(
  () => knowledgeStore.getCollection(activeWorkspaceId.value, route.params.id),
);

const totalSize = computed(
  () => (collection.value?.objects ?? []).reduce((sum, object) => sum + object.size, 0),
);

const statusCounts = computed(() => {
  const counts = { indexing: 0, indexed: 0, error: 0 };
  (collection.value?.objects ?? []).forEach((object) => {
    counts[object.status] = (counts[object.status] ?? 0) + 1;
  });
  return counts;
});

const statusBreakdown = computed(() => {
  const total = collection.value?.objects.length || 0;

  return Object.keys(OBJECT_STATUSES).map((status) => {
    const count = statusCounts.value[status] ?? 0;
    return {
      status,
      label: OBJECT_STATUSES[status].label,
      tagType: OBJECT_STATUSES[status].tagType,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
});

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex > 0 && value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
</script>
