<template>
  <section class="tr-kit">
    <NavbarMenu>
      <NavbarTabs :items="kitTabs" aria-label="Навигация по справочнику UI Kit" />
    </NavbarMenu>

    <RouterView />
  </section>
</template>

<script setup>
import { RouterView } from "vue-router";

import NavbarMenu from "../common/NavbarMenu.vue";
import NavbarTabs from "../common/NavbarTabs.vue";

// Route-driven shell for `/kit` (Task A8.6), mirroring `ProfileShell.vue`/
// `Workspace.vue`: a bare wrapper that only teleports `NavbarTabs` into the
// Navbar and renders whichever child route is active. Splits the former
// single-file `UiKit.vue` into five addressable sections — the "overview"
// tab keeps the `kit` route name and its `overview` path carries the `/kit`
// alias (see router.js), so both the bare `/kit` URL and the sidebar's
// existing `{ name: "kit" }` link keep working unchanged.
const kitTabs = [
  { label: "Обзор", to: { name: "kit" } },
  { label: "Формы", to: { name: "kit-forms" } },
  { label: "Таблицы", to: { name: "kit-tables" } },
  { label: "Навигация и состояния", to: { name: "kit-navigation-states" } },
  { label: "Диалоги и оверлеи", to: { name: "kit-dialogs-overlays" } },
];
</script>
