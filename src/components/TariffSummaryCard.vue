<template>
  <RouterLink
    :to="{ name: 'workspace-plan' }"
    class="tr-card tr-card--interactive tr-sidebar-tariff"
  >
    <div class="tr-sidebar-tariff__heading">
      <span class="tr-sidebar-tariff__label">
        <!-- <b-icon icon="credit-card-outline" size="is-small" /> -->
        Тариф
      </span>

      <strong
        class="tr-sidebar-tariff__name"
        :class="{ 'tr-sidebar-tariff__name--accent': tariff.tagType }"
      >
        {{ tariff.displayName }}
      </strong>
    </div>

    <div class="tr-stack tr-sidebar-tariff__limits">
      <div v-for="limit in tariff.limits" :key="limit.key">
        <span class="tr-sidebar-tariff__limit-label">{{ limit.label }}</span>
        <b-progress
          v-if="limit.progress !== null"
          :value="limit.progress"
          type="is-primary"
          size="is-small"
        />
        <span class="tr-muted tr-sidebar-tariff__caption">{{ limit.caption }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

import type { WorkspaceTariff } from "../stores/workspace";

defineProps<{
  tariff: WorkspaceTariff;
}>();
</script>

<style scoped lang="scss">
.tr-sidebar-tariff {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  text-decoration: none;
}

.tr-sidebar-tariff__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  column-gap: 0.375rem;
  row-gap: 0;
}

.tr-sidebar-tariff__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--tr-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tr-sidebar-tariff__name {
  margin-left: auto;
  color: var(--tr-text-strong);
  font-size: 1.375rem;
  line-height: 1.2;
  text-align: end;
}

.tr-sidebar-tariff__name--accent {
  color: var(--tr-primary);
}

.tr-sidebar-tariff__limits {
  gap: 0.375rem;
}

.tr-sidebar-tariff__limit-label {
  font-size: 0.875rem;
}

// Buefy wraps `<progress>` in `.progress-wrapper` and gives *that* a 1.5rem
// bottom margin (`:not(:last-child)`, same specificity as the override below,
// so `!important` to reliably win regardless of stylesheet order) — the
// `.progress` element itself already has its own margin zeroed by Buefy.
.tr-sidebar-tariff__limits :deep(.progress-wrapper) {
  margin-bottom: 0.125rem !important;
}

.tr-sidebar-tariff__caption {
  display: block;
  font-size: 0.75rem;
  text-align: end;
}
</style>
