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

    <b-dropdown-item value="" aria-role="listitem">
      {{ allLabel }}
    </b-dropdown-item>

    <b-dropdown-item separator />

    <b-dropdown-item
      v-for="option in normalizedOptions"
      :key="option.value"
      :value="option.value"
      aria-role="listitem"
    >
      {{ option.label }}
    </b-dropdown-item>
  </b-dropdown>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface ToolbarDropdownOption {
  value: string;
  label: string;
}

const props = withDefaults(defineProps<{
  options: (string | ToolbarDropdownOption)[];
  allLabel: string;
  ariaLabel?: string;
}>(), {
  ariaLabel: undefined,
});

const model = defineModel<string>({ required: true });

const normalizedOptions = computed<ToolbarDropdownOption[]>(
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
