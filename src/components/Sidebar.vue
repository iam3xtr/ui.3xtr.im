<template>
  <aside class="tr-sidebar">
    <b-menu class="tr-sidebar__nav">
      <b-menu-list>
        <b-menu-item
          v-for="item in mainNavigationItems"
          :key="item.routeName"
          tag="router-link"
          :to="{ name: item.routeName }"
          :icon="item.icon"
          :label="item.label"
          :model-value="isNavigationItemActive(item.routeName)"
        />
      </b-menu-list>

      <b-menu-list label="Администрирование">
        <b-menu-item
          v-for="item in administrationNavigationItems"
          :key="item.routeName"
          tag="router-link"
          :to="{ name: item.routeName }"
          :icon="item.icon"
          :label="item.label"
          :model-value="isAdministrationItemActive(item.routeName)"
        />
      </b-menu-list>
    </b-menu>

    <TariffSummaryCard :tariff="activeWorkspaceTariff" />
  </aside>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";

import {
  administrationNavigationItems,
  mainNavigationItems,
} from "../navigation";
import { useWorkspaceStore } from "../stores/workspace";
import { TariffSummaryCard } from "@iam3xtr/vue/navigation";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceTariff } = storeToRefs(workspaceStore);

/**
 * Prefix-aware match: every main navigation item is the root of a route
 * family (catalog + its detail/settings/channels/statistics children), so a
 * nested route (e.g. "agent-settings" under "/agents/:id/settings") must
 * still keep the "agents" item active. See docs/design-system.md,
 * "Навигация".
 * @param {string} routeName
 */
function isNavigationItemActive(routeName) {
  return route.path.startsWith(`/${routeName}`);
}

/**
 * Administration items are exact-name matches, except `kit` (Task A8.6):
 * its route family's non-default tabs are named `kit-forms`/`kit-tables`/…,
 * so this also matches on that name prefix — the same family-active idea as
 * `isNavigationItemActive` above, applied by route name instead of path
 * since administration route names and paths diverge (e.g.
 * `administration-users` → `/users`).
 * @param {string} routeName
 */
function isAdministrationItemActive(routeName) {
  return (
    route.name === routeName ||
    (typeof route.name === "string" && route.name.startsWith(`${routeName}-`))
  );
}
</script>
