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

import { NavbarMenu } from "@iam3xtr/vue";
import { NavbarTabs } from "@iam3xtr/vue/navigation";

/**
 * @type {{ label: string, to: import("vue-router").RouteLocationRaw }[]}
 */
const workspaceTabs = [
  { label: "Обзор", to: { name: "workspace" } },
  { label: "Настройки", to: { name: "workspace-settings" } },
  { label: "Участники", to: { name: "workspace-members" } },
  { label: "Тариф", to: { name: "workspace-plans" } },
  { label: "Биллинг", to: { name: "workspace-billing" } },
  // Task A10.8: capability-gated audit tab (`workspace/Audit.vue` decides
  // visibility of its own content per role, `Members.vue` sibling — the tab
  // itself stays listed for every role so a denied user still gets an
  // explained blocker instead of a missing/broken link).
  { label: "Аудит", to: { name: "workspace-audit" } },
];
</script>
