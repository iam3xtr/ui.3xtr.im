<template>
  <b-dropdown
    v-model="model"
    class="tr-dropdown tr-toolbar-dropdown"
    position="is-bottom-left"
    aria-role="list"
    expanded
  >
    <template #trigger>
      <button
        type="button"
        class="button tr-toolbar-dropdown__trigger"
        :aria-label="ariaLabel ?? allLabel"
      >
        <span class="tr-toolbar-dropdown__label">{{ selectedLabel }}</span>
        <b-icon icon="chevron-down" size="is-small" />
      </button>
    </template>

    <b-dropdown-item
      v-for="option in normalizedOptions"
      :key="option.value"
      :value="option.value"
      aria-role="listitem"
    >
      {{ option.label }}
    </b-dropdown-item>

    <b-dropdown-item separator />

    <b-dropdown-item value="" aria-role="listitem">
      {{ allLabel }}
    </b-dropdown-item>
  </b-dropdown>
</template>

<script setup>
import { computed } from "vue";

/**
 * @typedef {Object} ToolbarDropdownOption
 * @property {string} value
 * @property {string} label
 */

const props = defineProps({
  /** @type {import("vue").PropType<(string | ToolbarDropdownOption)[]>} */
  options: {
    type: Array,
    required: true,
  },
  allLabel: {
    type: String,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: undefined,
  },
});

const model = defineModel({ required: true });

const normalizedOptions = computed(
  () => props.options.map((option) => (
    typeof option === "string"
      ? { value: option, label: option }
      : option
  )),
);

const selectedLabel = computed(() => {
  const selected = normalizedOptions.value.find(
    (option) => option.value === model.value,
  );

  return selected ? selected.label : props.allLabel;
});
</script>
