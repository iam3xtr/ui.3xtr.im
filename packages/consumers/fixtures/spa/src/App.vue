<script setup>
// Exercises the same public exports a real downstream Vue SPA would use:
// theme-aware Icon (via an injected registry, no kit-specific glob import),
// Loader and a router-dependent navigation component in one tree.
import { Icon, Loader, NavbarMenu } from "@iam3xtr/vue";
import { PageHeader } from "@iam3xtr/vue/navigation";

// `provideIconRegistry(app, registry)` takes the app instance, so it is
// called once in main.js at app-creation time, not here.
</script>

<template>
  <PageHeader title="Consumer SPA fixture" />
  <Icon name="cog" />
  <Loader size="inline" label="Loading" />
  <NavbarMenu />
</template>
