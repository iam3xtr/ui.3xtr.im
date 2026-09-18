<template>
  <span class="icon-text tr-admin-marker">
    <span v-if="iconName" class="icon">
      <Icon :name="iconName" size="16" aria-hidden="true" />
    </span>
    <span>{{ value }}</span>
  </span>
</template>

<script setup>
import { computed } from "vue";

import { Icon } from "@iam3xtr/vue";

import { resolveAdminMarkerIcon } from "./adminMarkers.js";

// Shared presentation helper (Task #12.1): единая точка, где пять
// административных таблиц (Users, Providers, Models, Tariffs, Requests)
// подключают семантический marker к role/status/protocol-ячейке. Иконка —
// decorative-дополнение (`aria-hidden`, Bulma `.icon-text`/`.icon` — без
// локальных стилей, `theme.scss` уже подключает Bulma) к тексту, который
// остаётся источником смысла для desktop и mobile-card рендеринга `b-table`
// (тот же slot-контент используется в обоих режимах): unresolved
// domain/value просто не добавляет иконку — текст никогда не пропадает.
// Использует публичный `Icon`-контракт (#8.2, `Icon` из `@iam3xtr/vue`, тот
// же импорт, что `auth/GoogleButton.vue`), не local SVG registry и не
// дублирующий MDI mapping — сам mapping лежит рядом, в `adminMarkers.js`.
const props = defineProps({
  domain: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});

const iconName = computed(() => resolveAdminMarkerIcon(props.domain, props.value));
</script>
