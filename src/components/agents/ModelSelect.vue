<template>
  <div ref="rootRef" class="tr-model-select" @focusout="onFocusOut">
    <b-button
      ref="triggerRef"
      class="tr-model-select__trigger"
      icon-right="chevron-down"
      :id="inputId || undefined"
      :aria-label="ariaLabel ? `${ariaLabel}: ${canonicalDisplay || placeholder}` : undefined"
      :aria-expanded="isOpen"
      :aria-controls="popupId"
      :title="canonicalDisplay || undefined"
      @click="togglePicker"
      @keydown.down.prevent="openPicker"
    >
      <span class="tr-model-select__trigger-value">
        {{ canonicalDisplay || placeholder }}
      </span>
    </b-button>

    <div v-show="isOpen" :id="popupId" class="tr-model-select__popup">
      <b-autocomplete
        ref="autocompleteRef"
        v-model="searchQuery"
        :data="options"
        field="name"
        group-field="group"
        open-on-focus
        dropdown-position="bottom"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
        @select="onSelect"
        @active="onActiveChange"
      >
        <template #default="{ option }">
          <span
            class="tr-model-select__option"
            :class="{ 'tr-model-select__option--selected': isCatalogSelection(option) }"
            :aria-current="isCatalogSelection(option) ? 'true' : undefined"
          >
            <span
              v-if="isCatalogSelection(option)"
              class="tr-model-select__option-marker"
              aria-hidden="true"
            >
              ✓
            </span>
            <icon
              :name="option.provider?.icon || option.provider?.protocol || option.provider?.id || 'brain'"
              aria-hidden="true"
            />
            <span class="tr-model-select__option-name">{{ option.name }}</span>
          </span>
        </template>

        <template #empty>
          <div v-if="freeformCandidateVisible" class="tr-model-select__freeform">
            <button
              type="button"
              class="dropdown-item tr-model-select__freeform-action"
              :disabled="!freeformValid"
              @mousedown.prevent.stop="selectFreeform"
              @click.prevent="selectFreeform"
              @keydown.enter.prevent="selectFreeform"
              @keydown.space.prevent="selectFreeform"
            >
              Использовать «{{ trimmedQuery }}» как идентификатор модели
            </button>
            <p class="tr-model-select__freeform-hint">
              {{ freeformError || "Формат: vendor/model" }}
            </p>
          </div>
          <p v-else class="tr-model-select__empty">Ничего не найдено.</p>
        </template>
      </b-autocomplete>
    </div>

    <p v-if="useOwnApiKey" class="help tr-model-select__hint">
      Список ограничен моделями OpenRouter — так работает собственный ключ (BYOK).
    </p>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";

import { useModelsStore } from "../../stores/models.js";

// The closed trigger displays the canonical choice. The Buefy autocomplete
// lives at the top of the opened popover, so its own input is the search row
// and its built-in result selection and keyboard navigation remain intact.
// BYOK catalog and free-form ids are separate, mutually exclusive models;
// this UI Kit fixture does not assert a production API contract (#112).
const props = defineProps({
  useOwnApiKey: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: "Выберите модель",
  },
  searchPlaceholder: {
    type: String,
    default: "Поиск модели",
  },
  ariaLabel: {
    type: String,
    default: null,
  },
  // The label and FormErrorSummary target the focusable closed trigger.
  inputId: {
    type: String,
    default: null,
  },
});

const modelValue = defineModel({ type: String, default: null });
const providerModelId = defineModel("providerModelId", { type: String, default: null });

const modelsStore = useModelsStore();
const rootRef = ref(null);
const triggerRef = ref(null);
const autocompleteRef = ref(null);
const popupId = `model-select-${useId()}`;
const isOpen = ref(false);
const searchQuery = ref("");
let focusOutTimer;

const scopeProviderId = computed(() => (props.useOwnApiKey ? "openrouter" : undefined));
const trimmedQuery = computed(() => searchQuery.value.trim());
const canonicalDisplay = computed(() => {
  if (providerModelId.value) {
    return providerModelId.value;
  }
  return modelsStore.getModel(modelValue.value)?.name ?? "";
});

const options = computed(() => {
  if (!trimmedQuery.value) {
    return modelsStore
      .listRecommended({ providerId: scopeProviderId.value })
      .map((model) => ({ ...model, group: "Рекомендуемые" }));
  }
  return modelsStore
    .search(trimmedQuery.value, { providerId: scopeProviderId.value })
    .map((model) => ({ ...model, group: "Все модели" }));
});

const freeformCandidateVisible = computed(
  () => props.useOwnApiKey && trimmedQuery.value.length > 0 && options.value.length === 0,
);
const freeformError = computed(() => {
  if (!trimmedQuery.value) {
    return "Введите идентификатор модели.";
  }
  if (/\s/.test(trimmedQuery.value)) {
    return "Идентификатор не должен содержать пробелов.";
  }
  if (trimmedQuery.value.length > 255) {
    return "Не более 255 символов.";
  }
  return "";
});
const freeformValid = computed(() => freeformCandidateVisible.value && !freeformError.value);

function searchInput() {
  return autocompleteRef.value?.$el?.querySelector("input");
}

function focusTrigger() {
  triggerRef.value?.$el?.focus();
}

async function openPicker() {
  if (isOpen.value) {
    return;
  }
  searchQuery.value = "";
  isOpen.value = true;
  await nextTick();
  searchInput()?.focus();
}

function closePicker(restoreFocus = false) {
  if (!isOpen.value) {
    return;
  }
  isOpen.value = false;
  searchQuery.value = "";
  if (restoreFocus) {
    nextTick(focusTrigger);
  }
}

function togglePicker() {
  if (isOpen.value) {
    closePicker(true);
  } else {
    openPicker();
  }
}

function onActiveChange(active) {
  if (!active && isOpen.value) {
    closePicker(document.activeElement === searchInput());
  }
}

function onFocusOut() {
  // A pointer selection emits blur before click. Defer the outside check so
  // Buefy can process that click; focus moving inside the popover stays open.
  clearTimeout(focusOutTimer);
  focusOutTimer = setTimeout(() => {
    if (isOpen.value && !rootRef.value?.contains(document.activeElement)) {
      closePicker();
    }
  }, 0);
}

function isCatalogSelection(option) {
  return !providerModelId.value && Boolean(modelValue.value) && option?.id === modelValue.value;
}

function onSelect(option) {
  if (!option) {
    return;
  }
  modelValue.value = option.id;
  if (providerModelId.value !== null) {
    providerModelId.value = null;
  }
  closePicker(true);
}

function selectFreeform() {
  if (!isOpen.value || !freeformValid.value) {
    return;
  }
  if (modelValue.value !== null) {
    modelValue.value = null;
  }
  providerModelId.value = trimmedQuery.value;
  closePicker(true);
}

watch(
  () => props.useOwnApiKey,
  (useOwnApiKey) => {
    if (!useOwnApiKey && providerModelId.value !== null) {
      providerModelId.value = null;
    }
  },
);

onBeforeUnmount(() => clearTimeout(focusOutTimer));
</script>
