<template>
  <div class="tr-wizard-step">
    <h2 class="tr-card__title">Расскажите о бизнесе</h2>

    <WizardHint :expanded="hintsExpanded">
      <template #compact>
        Коротко опишите бизнес, клиента и цель — этого достаточно, чтобы агент понял свою роль.
      </template>
      Три коротких ответа помогают агенту понять свою роль и то, каким должен
      быть полезный ответ клиенту. Выбирать пространство или модель здесь не
      нужно — это можно настроить позже.
    </WizardHint>

    <div class="tr-form">
      <b-field
        label="Чем вы занимаетесь"
        :type="showError('businessDescription') ? 'is-danger' : undefined"
        :message="showError('businessDescription') ? 'Расскажите коротко о бизнесе.' : undefined"
      >
        <b-input
          :model-value="fields.businessDescription ?? ''"
          type="textarea"
          rows="2"
          placeholder="Например: кофейня с доставкой и точкой самовывоза."
          @update:model-value="(value) => update({ businessDescription: value })"
          @blur="touch('businessDescription')"
        />
      </b-field>

      <b-field
        label="Кто ваш клиент"
        :type="showError('customerDescription') ? 'is-danger' : undefined"
        :message="showError('customerDescription') ? 'Опишите, кто обращается к агенту.' : undefined"
      >
        <b-input
          :model-value="fields.customerDescription ?? ''"
          type="textarea"
          rows="2"
          placeholder="Например: постоянные клиенты района и новые посетители по рекламе."
          @update:model-value="(value) => update({ customerDescription: value })"
          @blur="touch('customerDescription')"
        />
      </b-field>

      <b-field
        label="Что агент должен помочь решить"
        :type="showError('goalDescription') ? 'is-danger' : undefined"
        :message="showError('goalDescription') ? 'Опишите ожидаемый результат.' : undefined"
      >
        <b-input
          :model-value="fields.goalDescription ?? ''"
          type="textarea"
          rows="2"
          placeholder="Например: отвечать на вопросы о меню и графике работы."
          @update:model-value="(value) => update({ goalDescription: value })"
          @blur="touch('goalDescription')"
        />
      </b-field>

      <b-field
        label="Имя агента"
        :type="showError('agentName') ? 'is-danger' : undefined"
        :message="showError('agentName') ? 'Укажите имя агента.' : 'Предложено по сценарию — можно изменить.'"
      >
        <b-input
          :model-value="fields.agentName ?? ''"
          placeholder="Имя агента"
          @update:model-value="onNameInput"
          @blur="touch('agentName')"
        />
      </b-field>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue";
import { getWizardPainScenario } from "../../../../stores/wizard";
import WizardHint from "../WizardHint.vue";

// Шаг «Контекст бизнеса» (Task A9.3, `.plan` таблица, строка 2). Имя агента
// приходит как редактируемое предложение по выбранному на предыдущем шаге
// сценарию (`fields.scenarioId`) — как только пользователь один раз
// отредактирует поле сам, авто-подстановка больше не перезаписывает его
// (флаг `agentNameTouched` хранится в самом `draft.fields`, а не в локальном
// состоянии компонента, чтобы уход на шаг «Боль» и обратно не «забыл» о
// ручной правке).
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

function update(patch) {
  emit("update", patch);
}

const touched = reactive({
  businessDescription: false,
  customerDescription: false,
  goalDescription: false,
  agentName: false,
});

function touch(field) {
  touched[field] = true;
}

function showError(field) {
  return touched[field] && !String(props.fields[field] ?? "").trim();
}

function onNameInput(value) {
  update({ agentName: value, agentNameTouched: true });
}

// Подставляет имя по сценарию, пока пользователь не начал редактировать поле
// сам — срабатывает и сразу при первом входе на шаг (`immediate`), и при
// возврате назад к «Боли» со сменой сценария.
watch(
  () => props.fields.scenarioId,
  (scenarioId) => {
    if (props.fields.agentNameTouched) {
      return;
    }

    const suggestion = getWizardPainScenario(scenarioId)?.suggestedAgentName ?? "";

    if (suggestion && suggestion !== props.fields.agentName) {
      update({ agentName: suggestion });
    }
  },
  { immediate: true },
);
</script>
