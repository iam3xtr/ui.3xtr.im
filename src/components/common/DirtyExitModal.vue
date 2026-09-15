<template>
  <b-modal
    :model-value="active"
    has-modal-card
    :can-cancel="['escape']"
    @update:model-value="(value) => !value && $emit('stay')"
  >
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ t.dirtyExit.title }}</p>
      </header>

      <section class="modal-card-body">
        <p>{{ t.dirtyExit.body }}</p>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="$emit('stay')">{{ t.dirtyExit.stay }}</b-button>
        <b-button type="is-danger" outlined @click="$emit('discard')">
          {{ t.dirtyExit.discard }}
        </b-button>
        <b-button type="is-primary" @click="$emit('save')">
          {{ t.dirtyExit.save }}
        </b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { getCommonDictionary } from "../../locales/common";
import { useLocaleStore } from "../../stores/locale.js";

// Shared dirty-exit dialog (Task A10.1), driven by `useDirtyExitGuard`'s
// `active` state — every savable form in scope (workspace/knowledge
// config, profile, agent model/BYOK key) reuses this one markup instead of
// each screen rebuilding its own three-way confirmation, mirroring how
// `channels/TakeoverModal.vue` factors out a single-purpose confirm modal.
// Copy comes from the scoped `locales/common` dictionary (Task A10.9) via
// the kit-wide `locale` pick in `stores/locale.js` — not each form's own
// state, so switching locale mid-edit never touches the draft itself.
defineProps({
  active: { type: Boolean, default: false },
});

defineEmits(["save", "discard", "stay"]);

const { locale } = storeToRefs(useLocaleStore());
const t = computed(() => getCommonDictionary(locale.value));
</script>
