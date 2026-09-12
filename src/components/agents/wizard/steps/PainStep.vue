<template>
  <div class="tr-wizard-step">
    <h2 class="tr-card__title">Какую боль клиента должен закрыть агент?</h2>

    <WizardHint :expanded="hintsExpanded">
      <template #compact>
        Выберите близкий сценарий — от него зависят подсказки на следующих шагах.
      </template>
      Каждый сценарий — готовый пример того, чем агент будет полезен клиентам:
      посмотрите пример вопроса и ожидаемый результат, прежде чем выбрать.
      Агент не оформляет заказы, не ведёт CRM и не записывает на приём — только
      отвечает по знаниям, которые вы ему дадите.
    </WizardHint>

    <div class="tr-wizard-scenario-grid" role="radiogroup" aria-label="Сценарий использования">
      <button
        v-for="(scenario, index) in scenarios"
        :key="scenario.id"
        :ref="(el) => setScenarioRef(el, index)"
        type="button"
        role="radio"
        class="tr-card tr-card--interactive tr-wizard-scenario"
        :class="{ 'tr-wizard-scenario--selected': fields.scenarioId === scenario.id }"
        :aria-checked="fields.scenarioId === scenario.id"
        :tabindex="tabIndexFor(scenario, index)"
        @click="selectScenario(scenario.id)"
        @keydown="onScenarioKeydown($event, index)"
      >
        <strong class="tr-wizard-scenario__title">{{ scenario.title }}</strong>
        <p class="tr-wizard-scenario__description">{{ scenario.description }}</p>

        <dl v-if="scenario.sampleQuestion" class="tr-wizard-scenario__example">
          <dt>Пример вопроса клиента</dt>
          <dd>«{{ scenario.sampleQuestion }}»</dd>
          <dt>Результат</dt>
          <dd>{{ scenario.expectedResult }}</dd>
        </dl>
      </button>
    </div>

    <b-field
      v-if="fields.scenarioId === 'other'"
      label="Опишите задачу"
      class="mt-4"
      :type="showCustomError ? 'is-danger' : undefined"
      :message="showCustomError ? 'Опишите, с чем должен помогать агент.' : undefined"
    >
      <b-input
        :model-value="fields.customPainDescription ?? ''"
        type="textarea"
        rows="3"
        placeholder="Например: уточнять у клиента детали заявки, прежде чем её увидит оператор."
        @update:model-value="(value) => emit('update', { customPainDescription: value })"
        @blur="customTouched = true"
      />
    </b-field>

    <p v-if="!fields.scenarioId" class="tr-muted mt-4">
      Выберите сценарий, чтобы продолжить — можно изменить его позже.
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { WIZARD_PAIN_SCENARIOS } from "../../../../stores/wizard";
import WizardHint from "../WizardHint.vue";

// Шаг «Боль» (Task A9.3, `.plan` таблица «Шаги и обучающий результат»,
// строка 1). Presentation-only: все поля читаются/пишутся через
// `draft.fields` родителя (`AgentWizard.vue`) — сам компонент не хранит
// выбор сценария, чтобы back/forward и смена пространства не теряли его
// (Task A9.1 контракт `updateFields`).
const props = defineProps({
  fields: {
    type: Object,
    required: true,
  },
  hintsExpanded: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update"]);

const scenarios = WIZARD_PAIN_SCENARIOS;
const customTouched = ref(false);

const showCustomError = computed(
  () => customTouched.value && !String(props.fields.customPainDescription ?? "").trim(),
);

function selectScenario(scenarioId) {
  customTouched.value = false;
  emit("update", { scenarioId });
}

// Roving tabindex для `role="radiogroup"` (WAI-ARIA APG radio group
// pattern, post-review fix): Tab входит в группу один раз, дальше стрелки
// перемещают фокус и выбор между карточками — как в нативной группе
// `<input type="radio">`, а не независимо Tab-доступная кнопка на каждую
// карточку. Пока ничего не выбрано, tabindex="0" держит первая карточка.
const scenarioRefs = ref([]);

function setScenarioRef(el, index) {
  scenarioRefs.value[index] = el;
}

function tabIndexFor(scenario, index) {
  if (props.fields.scenarioId) {
    return props.fields.scenarioId === scenario.id ? 0 : -1;
  }

  return index === 0 ? 0 : -1;
}

function focusScenarioAt(index) {
  const total = scenarios.length;
  scenarioRefs.value[(index + total) % total]?.focus();
}

function onScenarioKeydown(event, index) {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    const nextIndex = (index + 1) % scenarios.length;
    focusScenarioAt(nextIndex);
    selectScenario(scenarios[nextIndex].id);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    const prevIndex = (index - 1 + scenarios.length) % scenarios.length;
    focusScenarioAt(prevIndex);
    selectScenario(scenarios[prevIndex].id);
  }
}
</script>
