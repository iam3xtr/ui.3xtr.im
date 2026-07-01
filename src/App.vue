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
      @create-workspace="createWorkspace"
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

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";

import Navbar from "./components/Navbar.vue";
import Sidebar from "./components/Sidebar.vue";

type Theme = "light" | "dark";

const workspaces = ref([
  {
    id: "demo",
    name: "Демо-пространство",
    role: "Владелец",
    plan: "Free",
  },
  {
    id: "trickster",
    name: "Trickster Team",
    role: "Администратор",
    plan: "Pro",
  },
  {
    id: "personal",
    name: "Личное пространство",
    role: "Участник",
    plan: "Free",
  },
]);

const user = {
  firstName: "Иван",
  lastName: "Петров",
  role: "Владелец",
};

const workspace = ref(workspaces.value[0].id);
const isDark = ref(false);
const route = useRoute();

const isFluidContent = computed(
  () => route.meta.contentMode === "fluid",
);

function createWorkspace(): void {
  const number = workspaces.value.length + 1;
  const id = `workspace-${number}`;

  workspaces.value.push({
    id,
    name: `Пространство ${number}`,
    role: "Владелец",
    plan: "Free",
  });
  workspace.value = id;
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("trickster-theme", theme);
}

watch(isDark, (value) => {
  applyTheme(value ? "dark" : "light");
});

onMounted(() => {
  const saved = localStorage.getItem("trickster-theme") as Theme | null;
  const preferred: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  const initial: Theme = saved ?? preferred;

  isDark.value = initial === "dark";
  applyTheme(initial);
});
</script>
