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
