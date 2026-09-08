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
          :model-value="route.name === item.routeName"
        />
      </b-menu-list>
    </b-menu>

    <TariffSummaryCard :tariff="activeWorkspaceTariff" />
  </aside>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";

import {
  administrationNavigationItems,
  mainNavigationItems,
} from "../navigation";
import { useWorkspaceStore } from "../stores/workspace";
import TariffSummaryCard from "./TariffSummaryCard.vue";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceTariff } = storeToRefs(workspaceStore);

function isNavigationItemActive(routeName: string): boolean {
  return routeName === "workspace"
    ? route.path.startsWith("/workspace")
    : route.name === routeName;
}
</script>
