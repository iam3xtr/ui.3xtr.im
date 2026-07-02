<template>
  <RouterLink
    class="tr-brand"
    :to="{ name: 'dashboard' }"
    aria-label="На главную"
  >
    <svg
      class="tr-brand__logo"
      width="36"
      height="15"
      viewBox="0 0 72 30"
      aria-hidden="true"
      focusable="false"
    >
      <g class="tr-brand__logo-dark">
        <rect width="6" height="30" x="0" y="0" />
        <rect width="6" height="30" x="12" y="0" />
        <rect width="6" height="30" x="24" y="0" />
      </g>
      <g class="tr-brand__logo-light">
        <rect width="36" height="6" x="36" y="0" />
        <rect width="36" height="6" x="36" y="12" />
        <rect width="36" height="6" x="36" y="24" />
      </g>
    </svg>

    <strong class="tr-brand__name" aria-hidden="true">Trickster</strong>
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
