<template>
  <section class="tr-profile">
    <NavbarMenu>
      <NavbarTabs :items="profileTabs" aria-label="Навигация по профилю" />
    </NavbarMenu>

    <RouterView />
  </section>
</template>

<script setup>
import { RouterView } from "vue-router";

import { NavbarMenu } from "@iam3xtr/vue";
import { NavbarTabs } from "@iam3xtr/vue/navigation";

// Route-driven shell for `/profile` (Task A5.9), mirroring `Workspace.vue`
// (Task A5.8): a bare wrapper that only teleports `NavbarTabs` into the
// Navbar's menu slot and renders whichever child route is active. Two tabs,
// per the cabinet's `profile/views/Profile.vue` (`accountItems`).
// Task A10.8 adds two more tabs — «История уведомлений» (route-backed
// history over the existing `stores/notifications.js` bell fixture) and
// «Помощь» (a static reference) — both permanently reachable from here and
// from `Navbar.vue`'s user-menu dropdown, per `.plan` item 7 "постоянный
// пункт меню профиля/помощи".
/** @type {{ label: string, to: import("vue-router").RouteLocationRaw }[]} */
const profileTabs = [
  { label: "Профиль", to: { name: "profile" } },
  { label: "Безопасность", to: { name: "security" } },
  { label: "История уведомлений", to: { name: "notification-history" } },
  { label: "Помощь", to: { name: "help" } },
];
</script>
