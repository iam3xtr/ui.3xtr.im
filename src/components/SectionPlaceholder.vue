<template>
  <section>
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">{{ title }}</h1>
        <p class="tr-page-subtitle">
          Этот раздел пока находится в разработке.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>
