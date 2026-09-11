<template>
  <div class="tr-workspace-picker" role="dialog" aria-modal="true" aria-label="Выбор пространства">
    <div class="tr-workspace-picker__card tr-card">
      <div class="tr-workspace-picker__header">
        <b-icon icon="office-building-cog-outline" size="is-large" />
        <h2 class="tr-card__title mb-0">Выберите пространство</h2>
        <p class="tr-muted">Продолжите работу в одном из ваших пространств.</p>
      </div>

      <ul class="tr-workspace-picker__list">
        <li v-for="workspace in workspaces" :key="workspace.id">
          <button
            type="button"
            class="tr-workspace-picker__item"
            @click="select(workspace.id)"
          >
            <span class="tr-workspace-picker__item-name">{{ workspace.name }}</span>
            <span class="tr-workspace-picker__item-role">{{ workspace.role }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
// Пикер пространства (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/components/WorkspaceSelector.vue`. Кабинетная
// версия — полноэкранный гейт в `App.vue`, который решает "нужно ли выбрать
// пространство" по флагу сессии `auth.needsWorkspace`; кит не моделирует
// сессию (см. CLAUDE.md, «Backend changes»), поэтому это переиспользуемый
// оверлей, который `LoginView.vue` показывает поверх auth-маршрута сразу
// после фикстурного входа — самостоятельный демонстрационный шаг данной
// задачи, а не воспроизведение точной кабинетной логики гейта. Список и
// создание пространства берутся из уже существующего `stores/workspace.js`
// (Task A5.8) — отдельного фикстурного стора создание/список не заводит.
import { storeToRefs } from "pinia";

import { useWorkspaceStore } from "../../stores/workspace";

const emit = defineEmits(["select"]);

const workspaceStore = useWorkspaceStore();
const { workspaces, activeWorkspaceId } = storeToRefs(workspaceStore);

/** @param {string} id */
function select(id) {
  activeWorkspaceId.value = id;
  emit("select", id);
}
</script>
