<template>
  <div class="tr-model-select">
    <b-autocomplete
      ref="autocompleteRef"
      v-model="searchQuery"
      :data="options"
      field="name"
      group-field="group"
      open-on-focus
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      @select="onSelect"
      @focus="onFocusOpen"
      @blur="onBlurClose"
      @active="onActiveChange"
    >
      <template #default="{ option }">
        <span
          class="tr-model-select__option"
          :class="{ 'tr-model-select__option--selected': isCatalogSelection(option) }"
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
import { computed, onMounted, ref, watch } from "vue";

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
//
// Этап 1.1 (active `.plan` "Улучшение выбора модели и настройки собственного
// ключа"): lifecycle явно разделяет canonical selected display и transient
// search query. Buefy's `b-autocomplete` уже умеет focus/blur/active,
// keyboard navigation и openOnFocus — эти примитивы остаются основой
// контрола; отдельный dropdown, overlay или локальный набор control styles
// не создаётся. На каждом focus/active=true search query очищается (если
// было canonical selection), focus остаётся на реальном input и
// рекомендованный список показывается без фильтрации. На blur/active=false
// без select canonical display восстанавливается, чтобы повторное открытие
// никогда не выглядело как "текст = имени выбранной модели". Catalog
// choice всегда обновляет `modelValue` и очищает `providerModelId`;
// free-form остаётся валидным только при пустых filtered results и
// продолжает соблюдать whitespace/≤255 правила.

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
  // Stage A10 review fix: `FormErrorSummary`'s "jump to field" is a plain
  // `document.getElementById(field)?.focus()` — but Buefy's `b-autocomplete`
  // routes a plain `id` attr to its own outer wrapper `<div>` (via its
  // `CompatFallthroughMixin`, twice over — once for the autocomplete root,
  // once for the inner `b-input`'s own root), never to the actual `<input>`
  // that can take focus. `inputId` is set imperatively on that real input
  // element below instead of relying on attribute fallthrough. Optional —
  // omitted by every consumer that doesn't need a jump target (e.g. the
  // wizard's `ExpertParameters.vue`), so this has no effect there.
  inputId: {
    type: String,
    default: null,
  },
});

const modelValue = defineModel({ type: String, default: null });
const providerModelId = defineModel("providerModelId", { type: String, default: null });

const modelsStore = useModelsStore();
const searchQuery = ref("");
const autocompleteRef = ref(null);
// Track whether the dropdown is currently open so the focus/active handlers
// can decide whether to clear `searchQuery` on open and whether to restore
// the canonical display on close. Buefy's `isActive` is private state on the
// autocomplete component, but its `@active` event exposes the same flag.
const isOpen = ref(false);
// Marker the close handler reads to skip the "restore" pass when the user
// actually picked something (Buefy's `@select` fires after `@active` flips to
// false, so without this the canonical label would clobber the freshly
// selected model name on the way out).
let suppressRestore = false;

function applyInputId() {
  const inputEl = autocompleteRef.value?.$el?.querySelector("input");
  if (!inputEl) {
    return;
  }
  if (props.inputId) {
    inputEl.id = props.inputId;
  } else {
    inputEl.removeAttribute("id");
  }
}

onMounted(applyInputId);
watch(() => props.inputId, applyInputId);

const scopeProviderId = computed(() => (props.useOwnApiKey ? "openrouter" : undefined));
const trimmedQuery = computed(() => searchQuery.value.trim());

// Canonical display value: read-only projection of the selected catalog
// model or free-form BYOK identifier. Used to keep the closed control
// legible and to restore the input on close-without-select. Not used as a
// `b-autocomplete` v-model — that slot is the transient search query.
const canonicalDisplay = computed(() => {
  if (providerModelId.value) {
    return providerModelId.value;
  }
  if (!modelValue.value) {
    return "";
  }
  return modelsStore.getModel(modelValue.value)?.name ?? "";
});

const hasCanonicalSelection = computed(
  () => Boolean(providerModelId.value) || Boolean(modelValue.value),
);

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

// Selected-marker anchor (Этап 1.1): canonical catalog `id`, not display
// name — два BYOK-источника (`modelValue`/`providerModelId`) задают
// mutually exclusive selection, а имя модели не устойчиво как ключ.
function isCatalogSelection(option) {
  return Boolean(modelValue.value) && option?.id === modelValue.value;
}

function onFocusOpen() {
  isOpen.value = true;
  // Если уже есть canonical selection, открытие должно начинаться с пустого
  // search query — иначе Buefy выдаст "filtered по прошлому имени" вместо
  // рекомендованного списка. Empty `searchQuery` показывает scoped
  // `listRecommended`; никакой v-model выше не меняется.
  if (hasCanonicalSelection.value && searchQuery.value !== "") {
    searchQuery.value = "";
  }
}

function onBlurClose() {
  isOpen.value = false;
  // Если пользователь не выбрал ничего нового (catalog или free-form),
  // возвращаем canonical display в input, чтобы повторное открытие
  // показывало ровно выбор, а не случайный ввод.
  if (suppressRestore) {
    suppressRestore = false;
    return;
  }
  if (hasCanonicalSelection.value && searchQuery.value !== canonicalDisplay.value) {
    searchQuery.value = canonicalDisplay.value;
  }
}

function onActiveChange(active) {
  // Buefy отдаёт `isActive` через `@active` с задержкой в один tick.
  // Используем тот же флаг, что и focus/blur, чтобы поведение было
  // одинаковым вне зависимости от того, открыт ли dropdown программно или
  // пользователем.
  isOpen.value = active;
  if (active) {
    onFocusOpen();
  } else {
    onBlurClose();
  }
}

function onSelect(option) {
  if (!option) {
    return;
  }

  suppressRestore = true;
  modelValue.value = option.id;
  if (providerModelId.value !== null) {
    providerModelId.value = null;
  }
  // Сразу обновляем input, чтобы закрытие не прошло через restore-ветку
  // и пользователь увидел имя выбранной модели без мерцания.
  searchQuery.value = option.name ?? "";
}

function selectFreeform() {
  if (!freeformValid.value) {
    return;
  }

  suppressRestore = true;
  providerModelId.value = trimmedQuery.value;
  // Free-form id — это и есть его отображение; закрываем и оставляем то,
  // что пользователь ввёл, в input.
  searchQuery.value = trimmedQuery.value;
}

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

// Этап 1.1: реагируем на внешние изменения canonical selection, обновляя
// только transient search query, если dropdown сейчас НЕ открыт. Когда
// dropdown открыт, `onFocusOpen` уже отвечает за актуальное состояние
// search query, и внешнее изменение не должно молча сбрасывать ввод
// пользователя посреди поиска. `{ immediate: true }` нужен для mount: иначе
// закрытый контрол на старте с уже выбранной draft.model/draft.providerModelId
// рендерит пустой input до первого open/close, нарушая явный acceptance
// criterion "Closed control ясно показывает selected catalog model or free-form
// BYOK id" (Этап 1.1). То же касается wizard consumer
// `ExpertParameters.vue` (Task A9.5), который биндит тот же компонент.
watch(
  () => [modelValue.value, providerModelId.value],
  ([nextModelId, nextProviderModelId]) => {
    const nextDisplay = nextProviderModelId
      || (nextModelId ? (modelsStore.getModel(nextModelId)?.name ?? "") : "");

    if (!isOpen.value) {
      searchQuery.value = nextDisplay;
    }
  },
  { immediate: true },
);
</script>
