<template>
  <aside class="tr-sidebar">
    <b-menu>
      <b-menu-list>
        <b-menu-item
          v-for="item in items"
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

const items = [
  { routeName: "conversations", icon: "forum-outline", label: "Диалоги" },
  { routeName: "agents", icon: "robot-outline", label: "Агенты" },
  { routeName: "channels", icon: "message-outline", label: "Каналы" },
  { routeName: "sessions", icon: "flask-outline", label: "Тест-сессии" },
  { routeName: "settings", icon: "cog-outline", label: "Настройки" },
  { routeName: "ui-kit", icon: "palette-outline", label: "UI Kit" },
];

const route = useRoute();
</script>
