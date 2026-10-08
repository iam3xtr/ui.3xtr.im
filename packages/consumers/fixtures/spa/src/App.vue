<script setup>
// Exercises the same public exports a real downstream Vue SPA would use:
// theme-aware Icon (via an injected registry, no kit-specific glob import;
// "cog" below is not a custom SVG, so it demonstrates Icon's Buefy/MDI
// fallback instead), Loader, a router-dependent navigation component, and
// the auto-flip overlay (`ToolbarDropdown`/`MobileFilters`) anchored near
// the bottom of the viewport so a smoke test can catch obvious regressions
// in the public drop-down positioning layer. Two `ModelSelect` instances
// cover the stage 2.1 catalog picker from the packed tarball: one inline,
// one under a clipping ancestor so it moves to a Buefy body portal. Two
// more cover stage 2.2: `mode="byok"` (catalog BYOK id, free-form id and
// the consumer-owned `byok-key` slot) and `mode="both"` (the controlled
// `useOwnApiKey` switch over hidden model/BYOK ids).
import { ref } from "vue";
import { Icon, Loader, NavbarMenu, ToolbarDropdown, MobileFilters, ModelSelect, ChatHistory, MessageComposer } from "@iam3xtr/vue";
import { NavbarTabs, PageHeader } from "@iam3xtr/vue/navigation";

// `NavbarTabs` sits in a deliberately narrow flex bar with long labels so a
// browser smoke run against the packed tarball sees overflow arrows; the
// fixture has a single route, so tabs differ only by query.
const navbarTabs = [
  { label: "Overview and getting started", to: { path: "/" } },
  { label: "Usage and quotas", to: { path: "/", query: { tab: "usage" } } },
  { label: "Members and permissions", to: { path: "/", query: { tab: "members" } } },
  { label: "Billing history", to: { path: "/", query: { tab: "billing" } } },
];

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
// Stage 2.2 BYOK instances. Initial values are chosen so the smoke test
// can prove exclusivity (catalog pick clears a free-form id and vice
// versa) and that the `both` switch never erases hidden ids.
const byokModelId = ref(null);
const byokProviderModelId = ref("vendor/custom-model");
const bothModelId = ref("gpt");
const bothByokModelId = ref("claude");
const bothProviderModelId = ref(null);
const bothUseOwnApiKey = ref(false);
const modelSelectCopy = {
  triggerPlaceholder: "Choose a model",
  searchPlaceholder: "Search models",
  triggerAriaLabel: "Model",
  searchAriaLabel: "Search models",
  emptyLabel: "Nothing found",
  loadingLabel: "Loading models",
  errorLabel: "Could not load models",
};
const byokCopy = {
  switchLabel: "Use my own API key",
  switchAriaLabel: "Use my own API key",
  freeformActionLabel: "Use {id}",
  freeformActionAriaLabel: "Use typed model id",
  freeformHint: "Press Enter to use this id",
  freeformErrorLabel: "Invalid model id",
};

// Stage 3 ChatHistory from the packed tarball. The fixture proves that
// the consumer-owned slots (body / metadata / status) and the empty
// state render as documented — the package never injects user-facing
// text, so the fixture supplies all visible copy itself.
const chatMessages = [
  { id: "c1", text: "Hi there", outgoing: false },
  { id: "c2", text: "Hello back", outgoing: true },
  { id: "c3", text: "Multi\nline message", outgoing: false },
];
const chatEmpty = [];

// Rendered CommonMark HTML for the `body` slot. The string is a static
// fixture; real consumers sanitize their own renderer output. It carries a
// list, a long URL and a wide fenced code block so a browser smoke run can
// check wrapping and horizontal code scroll of `.tr-message-markdown`.
const markdownMessages = [
  {
    id: "m1",
    html:
      "<p>First paragraph</p><ul><li>one</li><li>two</li></ul>" +
      "<p>https://example.com/a/very/long/path/without/any/break/points/that/must/wrap/inside/the/bubble</p>" +
      "<pre><code>const veryLongLine = 'x'.repeat(200); // keeps scrolling horizontally instead of widening the bubble</code></pre>",
  },
];

// Stage 3 MessageComposer from the packed tarball. The fixture proves
// that the controlled draft round-trips through v-model, that Enter /
// button submit produce the same submit event, and that consumer-owned
// `submit-icon` slot replaces the default glyph. A second instance
// carries a multi-line draft so a browser smoke run can verify the
// auto-grow geometry and the bounded 100px max-height from
// `.tr-message-composer__textarea`.
const composerDraft = ref("");
const multilineDraft = ref("First line\nSecond line\nThird line");
const composerCopy = {
    placeholder: "Write a message",
    textareaAriaLabel: "Message body",
    submitAriaLabel: "Send",
    ariaLabel: "Composer",
};
const submittedDrafts = ref([]);
// Exposed so the smoke test can assert the bound `v-model:*` values.
// Vue allows a single `defineExpose()` per `<script setup>`.
defineExpose({
  inlineModelId,
  portalModelId,
  byokModelId,
  byokProviderModelId,
  bothModelId,
  bothByokModelId,
  bothProviderModelId,
  bothUseOwnApiKey,
  composerDraft,
  multilineDraft,
  submittedDrafts,
});
</script>

<template>
  <PageHeader title="Consumer SPA fixture" />
  <Icon name="cog" />
  <Loader size="inline" label="Loading" />
  <NavbarMenu />

  <div class="tr-consumer-flow__tabs-bar" style="display: flex; width: 320px;">
    <NavbarTabs
      :items="navbarTabs"
      aria-label="Fixture sections"
      prev-label="Previous sections"
      next-label="Next sections"
    />
  </div>

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

  <!-- Stage 3 ChatHistory and MessageComposer from the packed tarball. -->
  <div class="tr-consumer-flow__chat">
    <!-- Bounded chat pane: a fixed-height flex column, the way a real
         consumer embeds the pair. The history scrolls inside its own box
         (`.tr-chat-history` from `@iam3xtr/ui`) and the composer stays
         anchored at the bottom. Inline style so jsdom sees the bounds. -->
    <div
      class="tr-consumer-flow__chat-pane"
      style="display: flex; flex-direction: column; height: 240px; overflow: hidden"
    >
      <ChatHistory
        :messages="chatMessages"
        class="tr-consumer-flow__chat-history"
        aria-label="Dialog history"
      >
        <template #metadata="{ message }">
          <span class="tr-consumer-flow__chat-meta">@{{ message.id }}</span>
        </template>
        <template #status="{ message }">
          <span class="tr-consumer-flow__chat-status">{{ message.outgoing ? "sent" : "received" }}</span>
        </template>
      </ChatHistory>
      <MessageComposer
        v-model="composerDraft"
        class="tr-consumer-flow__composer"
        v-bind="composerCopy"
        @submit="(text) => submittedDrafts.push(text)"
      >
        <template #submit-icon>
          <span class="tr-consumer-flow__composer-icon" aria-hidden="true">&#10148;</span>
        </template>
      </MessageComposer>
    </div>
    <ChatHistory
      :messages="markdownMessages"
      class="tr-consumer-flow__chat-markdown"
      aria-label="Rendered markdown history"
    >
      <template #body="{ message }">
        <div class="tr-message-markdown" v-html="message.html" />
      </template>
    </ChatHistory>
    <ChatHistory
      :messages="chatEmpty"
      class="tr-consumer-flow__chat-empty"
      aria-label="Empty history"
    >
      <template #empty>
        <p class="tr-consumer-flow__chat-empty-text">No messages yet</p>
      </template>
    </ChatHistory>
    <MessageComposer
      v-model="multilineDraft"
      class="tr-consumer-flow__composer-multiline"
      v-bind="composerCopy"
      placeholder="Multi-line draft"
    />
  </div>

  <!-- Stage 2.2 BYOK modes from the packed tarball. -->
  <div class="tr-consumer-flow__byok">
    <ModelSelect
      v-model:byok-model-id="byokModelId"
      v-model:provider-model-id="byokProviderModelId"
      class="tr-consumer-flow__model-byok"
      mode="byok"
      :models="models"
      :recommended-models="recommendedModels"
      v-bind="{ ...modelSelectCopy, ...byokCopy }"
    >
      <template #byok-key>
        <input
          class="tr-consumer-flow__byok-key-input"
          type="password"
          aria-label="API key"
        >
      </template>
    </ModelSelect>
    <ModelSelect
      v-model:model-id="bothModelId"
      v-model:byok-model-id="bothByokModelId"
      v-model:provider-model-id="bothProviderModelId"
      v-model:use-own-api-key="bothUseOwnApiKey"
      class="tr-consumer-flow__model-both"
      mode="both"
      :models="models"
      :recommended-models="recommendedModels"
      v-bind="{ ...modelSelectCopy, ...byokCopy }"
    />
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
