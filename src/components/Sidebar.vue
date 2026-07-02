<template>
  <aside class="tr-sidebar">
    <b-menu>
      <b-menu-list>
        <b-menu-item
          v-for="item in mainNavigationItems"
          :key="item.routeName"
          tag="router-link"
          :to="{ name: item.routeName }"
          :icon="item.icon"
          :label="item.label"
          :model-value="route.name === item.routeName"
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
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

import {
  administrationNavigationItems,
  mainNavigationItems,
} from "../navigation";

const route = useRoute();
</script>
