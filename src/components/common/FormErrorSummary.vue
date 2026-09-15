<template>
  <b-message
    v-if="items.length > 0"
    type="is-danger"
    :closable="false"
    class="tr-form-error-summary"
    role="alert"
  >
    <p class="tr-form-error-summary__title">{{ resolvedTitle }}</p>
    <ul class="tr-form-error-summary__list">
      <li v-for="item in items" :key="item.field">
        <button
          type="button"
          class="tr-form-error-summary__link"
          @click="focusField(item.field)"
        >
          {{ item.message }}
        </button>
      </li>
    </ul>
  </b-message>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { getCommonDictionary } from "../../locales/common";
import { useLocaleStore } from "../../stores/locale.js";

// Keyboard-reachable error summary (Task A10.1): a form using
// `useSavableForm` passes its `fieldErrors` map here; each entry is a
// button (not a div/span) so it is tab-reachable and both click- and
// Enter/Space-activatable, moving focus to the offending field by `id` —
// same convention as the `id="…"` attributes added to the inputs this
// summary targets. This does not replace the per-field `b-field` error
// message (still shown at the field itself, per `.todo`'s "field errors
// стоят у поля") — it is the one extra jump-to-first-error affordance for
// keyboard users who cannot rely on colour/position alone.
//
// `title` stays an overridable prop (a caller with a more specific summary
// heading can still pass one) but defaults to the scoped `locales/common`
// dictionary (Task A10.9) instead of a hard-coded Russian string, so every
// consumer picks up RU/EN/ES from the same kit-wide `locale` pick without
// having to thread it through itself.
const props = defineProps({
  errors: { type: Object, default: () => ({}) },
  title: { type: String, default: null },
});

const emit = defineEmits(["focus-field"]);

const { locale } = storeToRefs(useLocaleStore());
const resolvedTitle = computed(() => props.title ?? getCommonDictionary(locale.value).formErrorSummary.title);

const items = computed(() => Object.entries(props.errors)
  .filter(([, message]) => Boolean(message))
  .map(([field, message]) => ({ field, message })));

function focusField(field) {
  emit("focus-field", field);

  if (typeof document !== "undefined") {
    document.getElementById(field)?.focus();
  }
}
</script>
