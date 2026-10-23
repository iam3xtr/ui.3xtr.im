<template>
  <span class="tr-conversation-channel">
    <component :is="ChannelIcon" v-if="ChannelIcon" :type="type" :label="label" decorative />
    <span class="tr-conversation-channel__text">{{ label }}</span>
  </span>
</template>

<script setup>
import { defineAsyncComponent } from "vue";

// Channel type symbol next to its readable label (Task S2-14, Issue #29). The
// symbol is decorative here because the label text beside it already names
// the type, so assistive technology reads it once. `ChannelTypeIcon` is an
// unreleased `@iam3xtr/vue` export: it is resolved from sources in
// development only; with the published pins the label renders text-only
// (Stage 4 activation: replace with a static import).
defineProps({
  /** Canonical visual type (`telegram`, `widget`, `email`, ...); unknown renders the neutral symbol. */
  type: { type: String, default: null },
  /** Consumer-localized readable label. */
  label: { type: String, required: true },
});

const ChannelIcon = import.meta.env.MODE === "development"
  ? defineAsyncComponent(() => import("@iam3xtr/vue").then((m) => m.ChannelTypeIcon))
  : null;
</script>
