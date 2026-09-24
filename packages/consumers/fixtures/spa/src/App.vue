<script setup>
// Exercises the same public exports a real downstream Vue SPA would use:
// theme-aware Icon (via an injected registry, no kit-specific glob import;
// "cog" below is not a custom SVG, so it demonstrates Icon's Buefy/MDI
// fallback instead), Loader, a router-dependent navigation component, and
// the auto-flip overlay (`ToolbarDropdown`/`MobileFilters`) anchored near
// the bottom of the viewport so a smoke test can catch obvious regressions
// in the public drop-down positioning layer.
import { ref } from "vue";
import { Icon, Loader, NavbarMenu, ToolbarDropdown, MobileFilters } from "@iam3xtr/vue";
import { PageHeader } from "@iam3xtr/vue/navigation";

// `provideIconRegistry(app, registry)` takes the app instance, so it is
// called once in main.js at app-creation time, not here.
const status = ref("");
const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];
</script>

<template>
  <PageHeader title="Consumer SPA fixture" />
  <Icon name="cog" />
  <Loader size="inline" label="Loading" />
  <NavbarMenu />

  <!-- Near the viewport edge: ToolbarDropdown (inline) and MobileFilters
       (body-portal) sit there so a future browser smoke run can verify
       auto-flip against the published tarball. The jsdom smoke here only
       asserts public-class presence; the actual flip is covered by
       focused tests inside `@iam3xtr/vue`. -->
  <div class="tr-consumer-flow__low">
    <ToolbarDropdown
      v-model="status"
      :options="statusOptions"
      all-label="All statuses"
      aria-label="Status filter"
    />
    <MobileFilters active>
      <p>Filters slot content</p>
    </MobileFilters>
  </div>
</template>

<style>
.tr-consumer-flow__low {
  margin-top: 90vh;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
</style>
