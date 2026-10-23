<template>
  <!--
    Statistics reference (Task S2-11, Issue #21): the workspace LLM/RAG section
    and a second Agent / Model / Knowledge / Requests context share one
    contract. Controls switch the deterministic fixture variant and state.
  -->
  <section class="tr-card mb-5" data-testid="stats-reference">
    <h2 class="tr-card__title">Статистика: карточки и разбивки</h2>

    <div class="tr-row mb-4">
      <b-field label="Вариант">
        <b-select v-model="variant" data-testid="stats-variant">
          <option value="tenant">Владелец</option>
          <option value="admin">Администратор</option>
        </b-select>
      </b-field>
      <b-field label="Состояние">
        <b-select v-model="state" data-testid="stats-state">
          <option v-for="option in states" :key="option.value" :value="option.value">{{ option.label }}</option>
        </b-select>
      </b-field>
    </div>

    <div class="tr-stack">
      <KitStatistics context="workspace" :variant="variant" :state="state" />
      <KitStatistics context="agent" :state="state" />
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";

import KitStatistics from "./KitStatistics.vue";

const states = [
  { value: "ready", label: "Данные" },
  { value: "zero", label: "Нули" },
  { value: "loading", label: "Загрузка" },
  { value: "partial", label: "Частично" },
  { value: "unavailable", label: "Недоступно" },
];
const variant = ref("tenant");
const state = ref("ready");
</script>
