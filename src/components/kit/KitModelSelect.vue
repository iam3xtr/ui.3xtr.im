<template>
  <!--
    Stage 5 (.plan этап 5 «Выпуск пакетов, миграция демо и передача
    изменений потребителям»): рабочие варианты публичного `ModelSelect`
    из `@iam3xtr/vue`. Каталог приходит из того же demo-адаптера
    (`useModelSelectCatalog`), что и у реальных экранов; все видимые
    строки — consumer-owned copy этой страницы.
  -->
  <section class="tr-card mb-5">
    <h2 class="tr-card__title">ModelSelect</h2>
    <p class="tr-muted mb-4">
      Один picker с тремя scope. Пакет не фильтрует каталог и ничего не
      загружает: потребитель передаёт <code>models</code>,
      <code>recommendedModels</code> и <code>searchResults</code> по
      <code>update:query</code>. Состояния <code>loading</code> и
      <code>error</code> видны при пустых результатах.
    </p>

    <div class="tr-model-select-kit__controls mb-4">
      <b-field label="mode">
        <b-radio-button
          v-for="value in MODES"
          :key="value"
          v-model="mode"
          :native-value="value"
          size="is-small"
        >
          {{ value }}
        </b-radio-button>
      </b-field>
      <b-field label="Состояния">
        <div class="tr-model-select-kit__flags">
          <b-checkbox v-model="loading">loading</b-checkbox>
          <b-checkbox v-model="error">error</b-checkbox>
          <b-checkbox v-model="invalid">invalid</b-checkbox>
          <b-checkbox v-model="disabled">disabled</b-checkbox>
        </div>
      </b-field>
    </div>

    <b-field
      label="Модель"
      label-for="kit-model-select"
      :type="invalid ? 'is-danger' : undefined"
      :message="invalid ? 'Выберите модель из каталога.' : undefined"
    >
      <ModelSelect
        v-model:model-id="modelId"
        v-model:byok-model-id="byokModelId"
        v-model:provider-model-id="providerModelId"
        v-model:use-own-api-key="useOwnApiKey"
        class="tr-model-select-kit__picker"
        :mode="mode"
        input-id="kit-model-select"
        :models="catalog.models.value"
        :recommended-models="statusOnly ? [] : catalog.recommendedModels.value"
        :search-results="statusOnly ? [] : catalog.searchResults.value"
        :loading="loading"
        :error="error"
        :invalid="invalid"
        :disabled="disabled"
        :trigger-aria-label="triggerAriaLabel"
        v-bind="COPY"
        :freeform-error-label="freeformErrorLabel"
        @update:query="onQuery"
      >
        <template v-if="isByokScope" #byok-key>
          <p class="help">
            Ключ OpenRouter выбирает потребитель — пакет не читает и не
            хранит секрет.
          </p>
        </template>
      </ModelSelect>
    </b-field>

    <dl class="tr-model-select-kit__state">
      <dt>modelId</dt>
      <dd><code>{{ format(modelId) }}</code></dd>
      <dt>byokModelId</dt>
      <dd><code>{{ format(byokModelId) }}</code></dd>
      <dt>providerModelId</dt>
      <dd><code>{{ format(providerModelId) }}</code></dd>
      <dt>useOwnApiKey</dt>
      <dd><code>{{ useOwnApiKey }}</code></dd>
      <dt>query</dt>
      <dd><code>{{ format(lastQuery) }}</code></dd>
    </dl>

    <h3 class="tr-card__subtitle mt-4">Публичный API</h3>
    <ul class="tr-muted">
      <li>
        Импорт: <code>import { ModelSelect } from "@iam3xtr/vue";</code>
      </li>
      <li>
        Props: <code>mode</code> (<code>"model"</code> |
        <code>"byok"</code> | <code>"both"</code>), <code>models</code>
        (обязателен, <code>{id, name, provider?}</code>),
        <code>recommendedModels</code> (массив id),
        <code>searchResults</code>, <code>loading</code>,
        <code>error</code>, <code>invalid</code>, <code>disabled</code>,
        <code>inputId</code> (id закрытого trigger для
        <code>&lt;label for&gt;</code>).
      </li>
      <li>
        Copy и accessible names (без встроенных строк):
        <code>triggerPlaceholder</code>, <code>searchPlaceholder</code>,
        <code>triggerAriaLabel</code>, <code>searchAriaLabel</code>,
        <code>triggerTitle</code>, <code>emptyLabel</code>,
        <code>loadingLabel</code>, <code>errorLabel</code>,
        <code>switchLabel</code>, <code>switchAriaLabel</code>,
        <code>freeformActionLabel</code> (с подстановкой
        <code>{id}</code>), <code>freeformActionAriaLabel</code>,
        <code>freeformHint</code>, <code>freeformErrorLabel</code>.
      </li>
      <li>
        v-model: <code>v-model:modelId</code>,
        <code>v-model:byokModelId</code>,
        <code>v-model:providerModelId</code> (free-form BYOK id,
        взаимоисключающий с <code>byokModelId</code>),
        <code>v-model:useOwnApiKey</code> (switch только в
        <code>mode="both"</code>; переключение не стирает скрытые id).
      </li>
      <li>
        Events: <code>update:modelId</code>,
        <code>update:byokModelId</code>,
        <code>update:providerModelId</code>,
        <code>update:useOwnApiKey</code>, <code>update:query</code>
        (только при фактическом изменении строки поиска).
      </li>
      <li>
        Slots: <code>#byok-key</code> (no scope) — consumer-owned UI под
        строкой поиска.
      </li>
      <li>
        Keyboard: ArrowDown на закрытом trigger открывает picker и
        переносит focus в поиск; Enter в поиске фиксирует валидный
        free-form id (trimmed, без пробелов, ≤ 255 символов); Tab/Escape
        закрывают меню средствами Buefy.
      </li>
      <li>
        Места применения в демо:
        <RouterLink :to="{ name: 'agent-settings', params: { id: 1 } }">
          настройки агента
        </RouterLink>
        (обычная модель и BYOK),
        <RouterLink :to="{ name: 'agent-wizard', params: { step: 'rules' } }">
          шаг «Правила» мастера
        </RouterLink>
        → «Расширенные параметры» (если шаг ещё недостижим, мастер
        откроет актуальный шаг черновика).
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

import { ModelSelect } from "@iam3xtr/vue";

import { useModelSelectCatalog } from "../agents/modelSelectAdapter.js";

const MODES = ["model", "byok", "both"];

// Consumer-owned copy: the package ships no user-facing strings.
const COPY = {
  triggerPlaceholder: "Выберите модель",
  searchPlaceholder: "Поиск модели",
  searchAriaLabel: "Поиск модели",
  emptyLabel: "Ничего не найдено.",
  loadingLabel: "Загрузка каталога…",
  errorLabel: "Каталог недоступен.",
  switchLabel: "Собственный ключ (OpenRouter)",
  freeformActionLabel: "Использовать «{id}» как идентификатор модели",
  freeformHint: "Формат: vendor/model",
};
const FREEFORM_ERROR_COPY = {
  whitespace: "Идентификатор не должен содержать пробелов.",
  tooLong: "Не более 255 символов.",
};

const mode = ref("model");
const loading = ref(false);
const error = ref(false);
const invalid = ref(false);
const disabled = ref(false);

const modelId = ref(null);
const byokModelId = ref(null);
const providerModelId = ref(null);
const useOwnApiKey = ref(false);
const lastQuery = ref("");

const isByokScope = computed(
  () => mode.value === "byok" || (mode.value === "both" && useOwnApiKey.value),
);
const catalog = useModelSelectCatalog(isByokScope);

// Loading/error are rendered by the package only while no option is
// visible, so the showcase hides the options for those two states.
const statusOnly = computed(() => loading.value || error.value);

const triggerAriaLabel = computed(() => {
  const value = isByokScope.value
    ? catalog.displayName(byokModelId.value, providerModelId.value)
    : catalog.displayName(modelId.value);
  return `Модель: ${value || COPY.triggerPlaceholder}`;
});
const freeformErrorLabel = computed(
  () => FREEFORM_ERROR_COPY[catalog.freeformIssue.value] ?? "",
);

function onQuery(value) {
  lastQuery.value = value ?? "";
  catalog.onQuery(value);
}

function format(value) {
  return value === null || value === undefined ? "null" : JSON.stringify(value);
}
</script>

<!--
  kit-style-exception: раскладка showcase для `/kit/chat` — строка
  переключателей вариантов, ограниченная ширина picker и таблица текущих
  v-model значений. Сам `ModelSelect` стилизуется общим
  `.tr-model-select*` namespace из `@iam3xtr/ui`; эти правила не часть
  публичного contract.
-->
<style scoped>
.tr-model-select-kit__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.tr-model-select-kit__flags {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.tr-model-select-kit__picker {
  max-width: 24rem;
}

.tr-model-select-kit__state {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 0.25rem 1rem;
  font-size: 0.875rem;
}

.tr-model-select-kit__state dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
