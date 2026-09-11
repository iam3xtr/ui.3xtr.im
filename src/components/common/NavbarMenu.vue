<template>
  <Teleport v-if="target && active" :to="target">
    <slot />
  </Teleport>
</template>

<script setup>
import { inject, onActivated, onDeactivated, ref } from "vue";

import { navbarMenuKey } from "../../composables/navbarMenu";

/**
 * Teleport wrapper that projects a page's menu (typically `NavbarTabs`) into
 * the Navbar's `menu` slot target, provided by the app shell via
 * `navbarMenuKey`. The page keeps its own handlers, permissions and
 * reactive state — only the DOM output moves.
 *
 * Until the shell provides a target, or after this instance unmounts,
 * nothing renders. While kept alive by a parent `<KeepAlive>` and
 * deactivated, the menu is hidden rather than left stale in the target; it
 * reappears on reactivation. Several `NavbarMenu` instances mounted at once
 * simply append to the same target — only one page branch is expected to
 * own it at a time.
 */

const target = inject(navbarMenuKey, null);
const active = ref(true);

onActivated(() => {
  active.value = true;
});

onDeactivated(() => {
  active.value = false;
});
</script>
