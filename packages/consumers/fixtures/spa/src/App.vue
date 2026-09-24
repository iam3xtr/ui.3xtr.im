<script setup>
// Exercises the same public exports a real downstream Vue SPA would use:
// theme-aware Icon (via an injected registry, no kit-specific glob import;
// "cog" below is not a custom SVG, so it demonstrates Icon's Buefy/MDI
// fallback instead), Loader, a router-dependent navigation component, and
// the auto-flip overlay (`ToolbarDropdown`/`MobileFilters`) anchored near
// the bottom of the viewport so a smoke test can catch obvious regressions
// in the public drop-down positioning layer. Two `ModelSelect` instances
// cover the stage 2.1 catalog picker from the packed tarball: one inline,
// one under a clipping ancestor so it moves to a Buefy body portal.
import { ref } from "vue";
import { Icon, Loader, NavbarMenu, ToolbarDropdown, MobileFilters, ModelSelect } from "@iam3xtr/vue";
import { PageHeader } from "@iam3xtr/vue/navigation";

// `provideIconRegistry(app, registry)` takes the app instance, so it is
// called once in main.js at app-creation time, not here.
const status = ref("");
const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const models = [
  { id: "gpt", name: "GPT", provider: { icon: "openai" } },
  { id: "claude", name: "Claude", provider: { icon: "anthropic" } },
  { id: "mistral", name: "Mistral", provider: { icon: "mistral" } },
];
const recommendedModels = ["gpt", "claude"];
const inlineModelId = ref("gpt");
const portalModelId = ref("gpt");
// Exposed so the smoke test can assert the bound `v-model:model-id` value.
defineExpose({ inlineModelId, portalModelId });
const modelSelectCopy = {
  triggerPlaceholder: "Choose a model",
  searchPlaceholder: "Search models",
  triggerAriaLabel: "Model",
  searchAriaLabel: "Search models",
  emptyLabel: "Nothing found",
  loadingLabel: "Loading models",
  errorLabel: "Could not load models",
};
</script>

<template>
  <PageHeader title="Consumer SPA fixture" />
  <Icon name="cog" />
  <Loader size="inline" label="Loading" />
  <NavbarMenu />

  <!-- Near the viewport edge: ToolbarDropdown and MobileFilters (inline
       here; each moves to a body portal only under a clipping ancestor)
       sit there so a future browser smoke run can verify
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
    <ModelSelect
      v-model:model-id="inlineModelId"
      class="tr-consumer-flow__model-inline"
      :models="models"
      :recommended-models="recommendedModels"
      v-bind="modelSelectCopy"
    />
    <!-- Inline style (not the <style> block) so jsdom's getComputedStyle
         sees the clipping ancestor and ModelSelect picks a body portal. -->
    <div
      class="tr-consumer-flow__clip"
      style="overflow: hidden"
    >
      <ModelSelect
        v-model:model-id="portalModelId"
        class="tr-consumer-flow__model-portal"
        :models="models"
        :recommended-models="recommendedModels"
        v-bind="modelSelectCopy"
      />
    </div>
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
