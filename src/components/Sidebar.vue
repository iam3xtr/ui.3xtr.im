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
          :title="item.label"
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
          :title="item.label"
          :model-value="isAdministrationItemActive(item.routeName)"
        />
      </b-menu-list>
    </b-menu>

    <section aria-label="Версии библиотек" >
      <b-field grouped group-multiline position="is-right">
        <div class="control">
          <b-taglist attached :title="`@iam3xtr/ui ${uiVersion}`">
            <b-tag type="is-dark">ui</b-tag>
            <b-tag v-if="usesWorkspaceSources" type="is-danger">dev</b-tag>
            <b-tag v-else type="is-info">{{ uiVersion }}</b-tag>
          </b-taglist>
        </div>
        <div class="control">
          <b-taglist attached :title="`@iam3xtr/vue ${vueVersion}`">
            <b-tag type="is-dark">vue</b-tag>
            <b-tag v-if="usesWorkspaceSources" type="is-danger">dev</b-tag>
            <b-tag v-else type="is-success">{{ vueVersion }}</b-tag>
          </b-taglist>
        </div>
      </b-field>
    </section>


    <TariffSummaryCard
      :tariff="activeWorkspaceTariff"
      :to="{ name: 'workspace-plans' }"
    />

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

// Defined by vite.config.js from root package.json. In `npm run dev` Vite
// aliases the packages to their submodule sources, so the visible marker
// must not imply that these exact published pins are currently executing.
const uiVersion =
  typeof __TRICKSTER_UI_VERSION__ === "string" ? __TRICKSTER_UI_VERSION__ : "development";
const vueVersion =
  typeof __TRICKSTER_VUE_VERSION__ === "string" ? __TRICKSTER_VUE_VERSION__ : "development";
const usesWorkspaceSources =
  typeof __TRICKSTER_LOCAL_PACKAGE_SOURCES__ !== "undefined" &&
  __TRICKSTER_LOCAL_PACKAGE_SOURCES__;

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
