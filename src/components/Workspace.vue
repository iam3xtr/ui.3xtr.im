<template>
  <section class="tr-workspace">
    <NavbarMenu>
      <NavbarTabs
        :items="workspaceTabs"
        aria-label="Навигация по пространству"
      />
    </NavbarMenu>

    <RouterView />
  </section>
</template>

<script setup>
import { RouterView } from "vue-router";

import NavbarMenu from "./common/NavbarMenu.vue";
import NavbarTabs from "./common/NavbarTabs.vue";

/**
 * @type {{ label: string, to: import("vue-router").RouteLocationRaw }[]}
 */
const workspaceTabs = [
  { label: "Обзор", to: { name: "workspace" } },
  { label: "Настройки", to: { name: "workspace-settings" } },
  { label: "Участники", to: { name: "workspace-members" } },
  { label: "Тариф", to: { name: "workspace-plan" } },
];
</script>
