<template>
  <!--
    Source-mode-only reference (Issue #18): `FilterSelect` is not in the
    published 0.1.4 pins, so ChatComponents loads this file only when Vite
    runs in the explicit "development" mode (package source aliases). It is
    never imported by normal tests, `npm run build` or Pages. All visible
    strings are consumer-owned copy of this page (ru/en/es).
  -->
  <section class="tr-card mb-5" data-testid="kit-filter-select">
    <h2 class="tr-card__title">FilterSelect</h2>
    <p class="tr-muted mb-4">{{ copy.intro }}</p>

    <div class="tr-stack mb-4">
      <b-field :label="copy.language">
        <b-radio-button v-for="value in LOCALES" :key="value" v-model="lang" :native-value="value" size="is-small">
          {{ value }}
        </b-radio-button>
      </b-field>
      <div class="tr-row">
        <b-switch v-model="searchable">{{ copy.searchable }}</b-switch>
        <b-switch v-model="allowCustom">{{ copy.allowCustom }}</b-switch>
        <b-switch v-model="loading">loading</b-switch>
        <b-switch v-model="disabled">disabled</b-switch>
        <b-switch v-model="empty">{{ copy.emptyCatalog }}</b-switch>
        <b-switch v-model="longLabels">{{ copy.longLabels }}</b-switch>
      </div>
    </div>

    <h3 class="tr-card__subtitle">Toolbar + MobileFilters</h3>
    <p class="tr-muted mb-2">{{ copy.toolbar }}</p>
    <div class="mb-4" :style="{ maxWidth: width }">
      <b-radio-button v-for="value in WIDTHS" :key="value" v-model="width" :native-value="value" size="is-small">
        {{ value }}
      </b-radio-button>
      <Toolbar
        class="mt-2"
        :filters-active="filtersActive"
        :filters-aria-label="copy.filters"
        :filters-title="copy.filters"
      >
        <template #filters>
          <FilterSelect
            v-bind="shared"
            v-model="provider"
            :aria-label="copy.provider"
            :placeholder="copy.anyProvider"
            :options="providerOptions"
            :searchable="searchable"
            :allow-custom="allowCustom"
          />
          <FilterSelect
            v-bind="shared"
            v-model="modelIds"
            multiple
            :aria-label="copy.models"
            :placeholder="copy.anyModel"
            :options="modelOptions"
            :searchable="searchable"
            :allow-custom="allowCustom"
          />
        </template>
      </Toolbar>
    </div>

    <h3 class="tr-card__subtitle">{{ copy.hosts }}</h3>
    <div class="tr-row mb-4">
      <b-button size="is-small" @click="modalOpen = true">Modal</b-button>
      <b-button size="is-small" @click="drawerOpen = true">FormDrawer</b-button>
    </div>
    <div class="mb-4" style="overflow: hidden; max-width: 14rem" data-testid="filter-clip-host">
      <FilterSelect
        v-bind="shared"
        v-model="provider"
        :aria-label="copy.provider"
        :placeholder="copy.anyProvider"
        :options="providerOptions"
        :searchable="searchable"
        :allow-custom="allowCustom"
      />
    </div>

    <b-modal v-model="modalOpen" has-modal-card trap-focus aria-role="dialog" aria-modal>
      <div class="modal-card">
        <section class="modal-card-body">
          <FilterSelect
            v-bind="shared"
            v-model="provider"
            :aria-label="copy.provider"
            :placeholder="copy.anyProvider"
            :options="providerOptions"
            :searchable="searchable"
            :allow-custom="allowCustom"
          />
        </section>
      </div>
    </b-modal>

    <FormDrawer v-model="drawerOpen" :title="copy.drawer" :close-aria-label="copy.close">
      <FilterSelect
        v-bind="shared"
        v-model="modelIds"
        multiple
        :aria-label="copy.models"
        :placeholder="copy.anyModel"
        :options="modelOptions"
        :searchable="searchable"
        :allow-custom="allowCustom"
      />
    </FormDrawer>

    <dl class="tr-model-select-kit__state mt-4">
      <dt>provider</dt>
      <dd><code data-testid="filter-provider">{{ JSON.stringify(provider) }}</code></dd>
      <dt>model_id</dt>
      <dd><code data-testid="filter-models">{{ JSON.stringify(modelIds) }}</code></dd>
    </dl>
    <p class="tr-muted">{{ copy.scalar }}</p>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

import { FilterSelect, FormDrawer, Toolbar } from "@iam3xtr/vue";

const LOCALES = ["ru", "en", "es"];
const WIDTHS = ["100%", "360px", "320px"];

const COPY = {
  ru: {
    intro: "Контролируемый фильтр: пакет ничего не загружает и не выбирает за потребителя. Один state питает оба экземпляра слота filters в Toolbar.",
    language: "Язык подписей", searchable: "Поиск", allowCustom: "Своё значение", emptyCatalog: "Пустой каталог", longLabels: "Длинные подписи",
    toolbar: "Слот filters рендерится дважды: inline и внутри MobileFilters (ниже 768px).",
    hosts: "Хосты: clipping, modal, drawer", filters: "Фильтры", provider: "Провайдер", models: "Модель",
    anyProvider: "Все провайдеры", anyModel: "Все модели", drawer: "Фильтры", close: "Закрыть панель",
    scalar: "provider — скалярный протокол, model_id — скаляр; multi-select здесь только демонстрация пакета, не контракт API.",
    reset: "Сбросить", selectedCount: "Выбрано: {count}", empty: "Нет вариантов", loading: "Загрузка",
    search: "Поиск", noResults: "Ничего не найдено", custom: "Использовать {value}", invalid: "Недопустимое значение", duplicate: "Уже выбрано",
  },
  en: {
    intro: "Controlled filter: the package neither fetches nor selects for the consumer. One state feeds both instances of the Toolbar filters slot.",
    language: "Copy language", searchable: "Search", allowCustom: "Custom value", emptyCatalog: "Empty catalog", longLabels: "Long labels",
    toolbar: "The filters slot is rendered twice: inline and inside MobileFilters (below 768px).",
    hosts: "Hosts: clipping, modal, drawer", filters: "Filters", provider: "Provider", models: "Model",
    anyProvider: "All providers", anyModel: "All models", drawer: "Filters", close: "Close panel",
    scalar: "provider is a scalar protocol and model_id is a scalar; multi-select here only demonstrates the package, not an API contract.",
    reset: "Reset", selectedCount: "{count} selected", empty: "No options", loading: "Loading",
    search: "Search", noResults: "No matches", custom: "Use {value}", invalid: "Invalid value", duplicate: "Already selected",
  },
  es: {
    intro: "Filtro controlado: el paquete no carga ni elige por el consumidor. Un estado alimenta ambas instancias del slot filters de Toolbar.",
    language: "Idioma de textos", searchable: "Busqueda", allowCustom: "Valor propio", emptyCatalog: "Catalogo vacio", longLabels: "Etiquetas largas",
    toolbar: "El slot filters se renderiza dos veces: en linea y dentro de MobileFilters (por debajo de 768px).",
    hosts: "Hosts: clipping, modal, drawer", filters: "Filtros", provider: "Proveedor", models: "Modelo",
    anyProvider: "Todos los proveedores", anyModel: "Todos los modelos", drawer: "Filtros", close: "Cerrar panel",
    scalar: "provider es un protocolo escalar y model_id un escalar; el multi-select solo demuestra el paquete, no un contrato de API.",
    reset: "Restablecer", selectedCount: "{count} elegidos", empty: "Sin opciones", loading: "Cargando",
    search: "Buscar", noResults: "Sin resultados", custom: "Usar {value}", invalid: "Valor no valido", duplicate: "Ya elegido",
  },
};

const lang = ref("ru");
const searchable = ref(true);
const allowCustom = ref(true);
const loading = ref(false);
const disabled = ref(false);
const empty = ref(false);
const longLabels = ref(false);
const width = ref("100%");
const modalOpen = ref(false);
const drawerOpen = ref(false);

// "legacy-gateway" and "retired-model" are historical values absent from the
// catalog: they stay visible and removable.
const provider = ref("legacy-gateway");
const modelIds = ref(["gpt-4o", "retired-model"]);

const copy = computed(() => COPY[lang.value]);
const suffix = computed(() => (longLabels.value
  ? " — a deliberately long catalog label that must stay compact inside the trigger"
  : ""));
const providerOptions = computed(() => (empty.value ? [] : [
  { value: "openai", label: `OpenAI${suffix.value}` },
  { value: "anthropic", label: `Anthropic${suffix.value}` },
  { value: "openrouter", label: `OpenRouter${suffix.value}` },
  { value: "disabled-provider", label: "Disabled provider", disabled: true },
]));
const modelOptions = computed(() => (empty.value ? [] : [
  { value: "gpt-4o", label: `GPT-4o${suffix.value}` },
  { value: "claude-sonnet", label: `Claude Sonnet${suffix.value}` },
  { value: "mistral-large", label: `Mistral Large${suffix.value}` },
]));

const shared = computed(() => ({
  resetLabel: copy.value.reset,
  selectedCountLabel: copy.value.selectedCount,
  emptyLabel: copy.value.empty,
  loadingLabel: copy.value.loading,
  searchLabel: copy.value.search,
  searchPlaceholder: copy.value.search,
  noResultsLabel: copy.value.noResults,
  customLabel: copy.value.custom,
  customInvalidLabel: copy.value.invalid,
  customDuplicateLabel: copy.value.duplicate,
  loading: loading.value,
  disabled: disabled.value,
}));

const filtersActive = computed(() => Boolean(provider.value) || modelIds.value.length > 0);
</script>
