<template>
  <div
    class="tr-app"
    :class="{ 'tr-app--fluid': isFluidContent }"
  >
    <Navbar
      v-model:workspace="workspace"
      v-model:is-dark="isDark"
      :workspaces="workspaces"
      :user="user"
      @create-workspace="workspaceStore.createWorkspace"
    />

    <div class="tr-app-shell">
      <Sidebar />

      <div class="tr-main">
        <main class="tr-page">
          <div
            class="tr-page__content"
            :class="{ 'tr-page__content--fluid': isFluidContent }"
          >
            <RouterView />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";

import Navbar from "./components/Navbar.vue";
import Sidebar from "./components/Sidebar.vue";
import { useWorkspaceStore } from "./stores/workspace";

/** @typedef {"light" | "dark"} Theme */

const user = {
  firstName: "Иван",
  lastName: "Петров",
  role: "Владелец",
};

const workspaceStore = useWorkspaceStore();
const {
  workspaces,
  activeWorkspaceId: workspace,
} = storeToRefs(workspaceStore);
const isDark = ref(false);
const route = useRoute();

const isFluidContent = computed(
  () => route.meta.contentMode === "fluid",
);

/**
 * @param {Theme} theme
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("trickster-theme", theme);
}

watch(isDark, (value) => {
  applyTheme(value ? "dark" : "light");
});

onMounted(() => {
  /** @type {Theme | null} */
  const saved = localStorage.getItem("trickster-theme");
  /** @type {Theme} */
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  /** @type {Theme} */
  const initial = saved ?? preferred;

  isDark.value = initial === "dark";
  applyTheme(initial);
});
</script>
