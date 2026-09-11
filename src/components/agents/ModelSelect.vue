<template>
  <div class="tr-model-select">
    <b-autocomplete
      v-model="query"
      :data="options"
      field="name"
      group-field="group"
      open-on-focus
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      @select="onSelect"
    >
      <template #default="{ option }">
        <span class="tr-model-select__option">
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
            @mousedown.prevent="selectFreeform"
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

    <p v-if="useOwnApiKey" class="help tr-model-select__hint">
      Список ограничен моделями OpenRouter — так работает собственный ключ (BYOK).
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

import { useModelsStore } from "../../stores/models.js";

// Task A6.2: accessible replacement for the hand-rolled `.dropdown` in
// get.3xtr.im's ModelSelect.vue (direct `classList.toggle`, no keyboard
// support, no aria-expanded). Built entirely on `b-autocomplete` — no direct
// DOM access anywhere in this file.
//
// The catalog model id (`modelValue`) and the free-form BYOK identifier
// (`providerModelId`) are two independent v-models: selecting a catalog
// entry never overwrites the other's meaning, matching the store contract
// in `src/stores/agents.js` (`model` stays the catalog UID; `provider_model_id`
// is a separate, BYOK-only override). Wiring this component into
// AgentSettings.vue and its save/confirm flow is Task A6.3.
//
// Free-form BYOK identifier (`vendor/model`, ≤255 chars, no whitespace) is
// implemented ahead of the server contract as a specification for
// api.3xtr.im#112 — see Stage A6 `.plan` "Блокер серверного контракта".

const props = defineProps({
  useOwnApiKey: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: "Выберите модель",
  },
  ariaLabel: {
    type: String,
    default: "Модель",
  },
});

const modelValue = defineModel({ type: String, default: null });
const providerModelId = defineModel("providerModelId", { type: String, default: null });

const modelsStore = useModelsStore();
const query = ref("");

const scopeProviderId = computed(() => (props.useOwnApiKey ? "openrouter" : undefined));
const trimmedQuery = computed(() => query.value.trim());

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

// Reflects the canonical selection (catalog model or free-form id) into the
// input text whenever it changes from the outside — e.g. the parent form
// loads a different agent, or BYOK is switched off (watcher below). Typing
// itself never touches `modelValue`/`providerModelId`, so this does not
// fight the user mid-search.
watch(
  () => [modelValue.value, providerModelId.value],
  ([nextModelId, nextProviderModelId]) => {
    if (nextProviderModelId) {
      query.value = nextProviderModelId;
      return;
    }
    query.value = modelsStore.getModel(nextModelId)?.name ?? "";
  },
  { immediate: true },
);

// BYOK решение 3 (Stage A6 `.plan`): свободный идентификатор действителен
// только вместе с включённым ключом.
watch(
  () => props.useOwnApiKey,
  (useOwnApiKey) => {
    if (!useOwnApiKey && providerModelId.value !== null) {
      providerModelId.value = null;
    }
  },
);

function onSelect(option) {
  if (!option) {
    return;
  }

  modelValue.value = option.id;
  if (providerModelId.value !== null) {
    providerModelId.value = null;
  }
}

function selectFreeform() {
  if (!freeformValid.value) {
    return;
  }

  providerModelId.value = trimmedQuery.value;
}
</script>
