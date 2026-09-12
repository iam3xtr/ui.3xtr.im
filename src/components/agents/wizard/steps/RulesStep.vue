<template>
  <div class="tr-wizard-step">
    <h2 class="tr-card__title">Задайте правила ответов</h2>

    <WizardHint :expanded="hintsExpanded">
      <template #compact>
        Задача, стиль и правило на случай, когда ответа нет — этого достаточно для теста.
      </template>
      Эти правила определяют границы поведения агента: что он делает, как
      отвечает и когда явно предлагает связаться с оператором. Режим
      «спросить оператора» не передаёт диалог автоматически — клиенту нужно
      будет написать оператору отдельно.
    </WizardHint>

    <div class="tr-form">
      <b-field
        label="Задача агента"
        :type="showError('task') ? 'is-danger' : undefined"
        :message="showError('task') ? 'Опишите, что именно должен делать агент.' : undefined"
      >
        <b-input
          :model-value="fields.task ?? ''"
          type="textarea"
          rows="3"
          placeholder="Например: отвечать на вопросы о меню, составе блюд и графике работы."
          @update:model-value="(value) => update({ task: value })"
          @blur="touch('task')"
        />
      </b-field>

      <b-field
        label="Стиль общения"
        :type="showError('style') ? 'is-danger' : undefined"
        :message="showError('style') ? 'Выберите стиль общения.' : undefined"
      >
        <b-select
          :model-value="fields.style ?? ''"
          expanded
          @update:model-value="(value) => onSelect('style', value)"
        >
          <option value="" disabled>Выберите стиль</option>
          <option v-for="option in styleOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </b-select>
      </b-field>

      <b-field label="Ограничения" message="Необязательно — например, темы, которые агент не обсуждает.">
        <b-input
          :model-value="fields.restrictions ?? ''"
          type="textarea"
          rows="2"
          placeholder="Например: не обсуждать цены конкурентов."
          @update:model-value="(value) => update({ restrictions: value })"
        />
      </b-field>

      <b-field
        label="Если ответа нет в знаниях"
        :type="showError('noAnswerAction') ? 'is-danger' : undefined"
        :message="showError('noAnswerAction') ? 'Выберите, что делать при отсутствии ответа.' : undefined"
      >
        <b-select
          :model-value="fields.noAnswerAction ?? ''"
          expanded
          @update:model-value="(value) => onSelect('noAnswerAction', value)"
        >
          <option value="" disabled>Выберите вариант</option>
          <option v-for="option in noAnswerOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </b-select>
      </b-field>

      <b-field
        label="Когда предложить связь с оператором"
        :type="showError('operatorHandoff') ? 'is-danger' : undefined"
        :message="showError('operatorHandoff') ? 'Выберите условие связи с оператором.' : undefined"
      >
        <b-select
          :model-value="fields.operatorHandoff ?? ''"
          expanded
          @update:model-value="(value) => onSelect('operatorHandoff', value)"
        >
          <option value="" disabled>Выберите условие</option>
          <option v-for="option in handoffOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </b-select>
      </b-field>
    </div>

    <!--
      Класс модели остаётся на основном пути (Task A9.5, `.plan` решение 2):
      рекомендованный класс уже проставлен `ensureDefaultModelClass`, менять
      его — необязательное действие, а не отдельный обязательный шаг выбора
      модели. Сырой id модели здесь никогда не показывается.
    -->
    <div class="tr-wizard-model-class">
      <h3 class="tr-card__title">{{ t.modelClass.title }}</h3>
      <p class="tr-muted">{{ t.modelClass.hint }}</p>

      <p v-if="allowedClassIds.length <= 1" class="tr-muted">
        {{ t.modelClass.singleAvailableNote }}
      </p>
      <div v-else class="tr-wizard-scenario-grid">
        <button
          v-for="classId in allowedClassIds"
          :key="classId"
          type="button"
          class="tr-card tr-card--interactive tr-wizard-scenario"
          :class="{ 'tr-wizard-scenario--selected': fields.modelClassId === classId }"
          @click="selectModelClass(classId)"
        >
          <span class="tr-row tr-row--between">
            <strong class="tr-wizard-scenario__title">{{ t.modelClass[classId].label }}</strong>
            <b-tag v-if="recommendedClassId === classId" type="is-primary">
              {{ t.modelClass.recommendedBadge }}
            </b-tag>
          </span>
          <p class="tr-wizard-scenario__description">{{ t.modelClass[classId].purpose }}</p>
          <p class="tr-wizard-model-class__meta">
            <span>{{ t.modelClass[classId].price }}</span>
            <span>{{ t.modelClass[classId].availability }}</span>
          </p>
        </button>
      </div>
    </div>

    <ExpertParameters :draft="draft" @update="update" />
  </div>
</template>

<script setup>
import { computed, reactive, watch } from "vue";
import {
  getRecommendedModelClassId,
  WIZARD_RULES_HANDOFF_OPTIONS,
  WIZARD_RULES_NO_ANSWER_OPTIONS,
  WIZARD_RULES_STYLE_OPTIONS,
  useWizardStore,
} from "../../../../stores/wizard";
import { useModelsStore } from "../../../../stores/models";
import { getWizardDictionary } from "../../../../locales/wizard";
import WizardHint from "../WizardHint.vue";
import ExpertParameters from "../ExpertParameters.vue";

// Шаг «Правила ответов» (Task A9.3, `.plan` таблица, строка 4). Класс модели
// (основной путь) и экспертная зона — температура/системная
// инструкция/каталог/BYOK за вторичной ссылкой «Расширенные параметры» —
// добавлены Task A9.5; получает весь `draft` (не только `fields`), как
// `KnowledgeStep.vue`, потому что классу модели и экспертной зоне нужны
// `workspaceId` (capability по тарифу) и `locale` (scoped-словарь).
const props = defineProps({
  draft: {
    type: Object,
    required: true,
  },
  hintsExpanded: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update"]);

const wizardStore = useWizardStore();
const modelsStore = useModelsStore();

const workspaceId = computed(() => props.draft.workspaceId);
const fields = computed(() => props.draft.fields);
const t = computed(() => getWizardDictionary(props.draft.locale));

const styleOptions = WIZARD_RULES_STYLE_OPTIONS;
const noAnswerOptions = WIZARD_RULES_NO_ANSWER_OPTIONS;
const handoffOptions = WIZARD_RULES_HANDOFF_OPTIONS;

const capability = computed(() => modelsStore.getCapabilityProfile(workspaceId.value));
const allowedClassIds = computed(() => capability.value.allowedClassIds);
const recommendedClassId = computed(() => getRecommendedModelClassId(fields.value.scenarioId));

const touched = reactive({
  task: false,
  style: false,
  noAnswerAction: false,
  operatorHandoff: false,
});

function update(patch) {
  emit("update", patch);
}

function touch(field) {
  touched[field] = true;
}

function onSelect(field, value) {
  touched[field] = true;
  update({ [field]: value });
}

function showError(field) {
  return touched[field] && !String(fields.value[field] ?? "").trim();
}

function selectModelClass(classId) {
  update({ modelClassId: classId });
}

// Рекомендованный класс проставляется один раз при входе на шаг (и заново,
// если сценарий вдруг сменился при возврате назад) — `ensureDefaultModelClass`
// сам ничего не перезаписывает, если пользователь уже выбрал класс
// (`.plan` решение 2: «отдельный обязательный шаг выбора модели не
// добавляется», выбор остаётся необязательным действием).
watch(
  () => fields.value.scenarioId,
  () => wizardStore.ensureDefaultModelClass(workspaceId.value),
  { immediate: true },
);
</script>
