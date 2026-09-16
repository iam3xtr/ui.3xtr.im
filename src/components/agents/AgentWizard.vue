<template>
  <section class="tr-workbench-page tr-agent-wizard">
    <PageHeader
      title="Новый агент"
      :subtitle="`Шаг ${stepIndex + 1} из ${WIZARD_STEPS.length}: ${stepLabel}`"
      :back="{ to: { name: 'agents' }, title: 'К списку агентов' }"
    >
      <b-button v-if="!isCompleted" @click="handleCancel">Отменить</b-button>
    </PageHeader>

    <ol class="tr-wizard-progress" aria-label="Прогресс мастера">
      <li
        v-for="(step, index) in WIZARD_STEPS"
        :key="step"
        class="tr-wizard-progress__item"
        :class="{
          'tr-wizard-progress__item--current': index === stepIndex,
          'tr-wizard-progress__item--done': index < stepIndex,
        }"
        :aria-current="index === stepIndex ? 'step' : undefined"
      >
        <span class="tr-wizard-progress__marker">
          <b-icon v-if="index < stepIndex" icon="check" size="is-small" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="tr-wizard-progress__label">{{ STEP_LABELS[step] }}</span>
      </li>
    </ol>

    <article class="tr-card">
      <div class="tr-row tr-row--between tr-wizard__intro">
        <p class="tr-muted">
          Черновик продолжается с того же шага при повторном входе — переходы
          назад/вперёд и обновление адреса не сбрасывают введённое.
        </p>
        <button
          v-if="!hintsExpanded"
          type="button"
          class="tr-wizard__hints-toggle"
          @click="hintsExpanded = true"
        >
          Показать подсказки
        </button>
      </div>

      <PainStep
        v-if="draft?.step === 'pain'"
        :fields="draft.fields"
        :hints-expanded="hintsExpanded"
        @update="patchFields"
      />
      <ContextStep
        v-else-if="draft?.step === 'context'"
        :fields="draft.fields"
        :hints-expanded="hintsExpanded"
        @update="patchFields"
      />
      <RulesStep
        v-else-if="draft?.step === 'rules'"
        :draft="draft"
        :hints-expanded="hintsExpanded"
        @update="patchFields"
      />
      <KnowledgeStep
        v-else-if="draft?.step === 'knowledge'"
        :draft="draft"
        :hints-expanded="hintsExpanded"
        @update="patchFields"
      />
      <SandboxStep
        v-else-if="draft?.step === 'sandbox'"
        :draft="draft"
        :hints-expanded="hintsExpanded"
        @go-to-step="goToStepDirect"
      />
      <TelegramStep
        v-else-if="draft?.step === 'telegram'"
        :draft="draft"
        :hints-expanded="hintsExpanded"
        @go-to-step="goToStepDirect"
      />
      <ReviewStep
        v-else-if="draft?.step === 'review'"
        :draft="draft"
        :hints-expanded="hintsExpanded"
        @go-to-step="goToStepDirect"
      />

      <div v-if="!isCompleted" class="tr-row tr-row--between mt-5">
        <b-button
          :disabled="isFirstStep"
          @click="goPrevious"
        >
          Назад
        </b-button>

        <div class="tr-row">
          <b-button @click="handleSaveDraft">Сохранить черновик</b-button>
          <b-button
            v-if="!isLastStep"
            type="is-primary"
            :disabled="!canAdvance"
            @click="goNext"
          >
            Далее
          </b-button>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { isStepComplete, isStepReachable, useWizardStore, WIZARD_STEPS } from "../../stores/wizard";
import { useWorkspaceStore } from "../../stores/workspace";
import { PageHeader } from "@iam3xtr/vue/navigation";
import PainStep from "./wizard/steps/PainStep.vue";
import ContextStep from "./wizard/steps/ContextStep.vue";
import RulesStep from "./wizard/steps/RulesStep.vue";
import KnowledgeStep from "./wizard/steps/KnowledgeStep.vue";
import SandboxStep from "./wizard/steps/SandboxStep.vue";
import TelegramStep from "./wizard/steps/TelegramStep.vue";
import ReviewStep from "./wizard/steps/ReviewStep.vue";

// Смысловые подписи шагов (Stage A9 `.plan`, «Шаги и обучающий результат»).
// Порядок здесь не задаётся — он приходит из `WIZARD_STEPS` (Task A9.1);
// таблица `.plan` перечисляет шаги в другом порядке (знания после правил),
// это сознательное решение стора, а не расхождение с этим экраном.
const STEP_LABELS = {
  pain: "Боль",
  context: "Контекст бизнеса",
  rules: "Правила ответов",
  knowledge: "Знания",
  sandbox: "Песочница",
  telegram: "Telegram",
  review: "Проверка и запуск",
};

const route = useRoute();
const router = useRouter();
const wizardStore = useWizardStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

/**
 * Развёрнутые подсказки по умолчанию для первого агента пространства,
 * компактные — для последующих, с возможностью снова их раскрыть (Stage A9
 * `.plan`, «Общий вход и жизненный цикл мастера»). Один переключатель на весь
 * мастер, а не по шагам — раскрыв подсказки один раз, пользователь не должен
 * заново раскрывать их на каждом следующем шаге. Явно не пересчитывается при
 * каждом переходе между шагами одного и того же draft'а — только при первом
 * входе в мастер и при смене пространства, и то лишь чтобы подхватить чужой
 * (уже существующий) draft пространства: «первый агент» читается из
 * `draft.isFirstAgent`, зафиксированного один раз в момент создания draft'а
 * (`useWizardStore().createDraft`), а не пересчитывается заново из
 * `agentsStore` — иначе собственный, ещё не завершённый агент этого же
 * черновика (`ensureAgent`/`ensureTelegramChannel` создают его раньше
 * завершения мастера) сделал бы пространство «не первым» уже при повторном
 * входе в тот же самый draft (Task A9.3 post-review fix).
 */
const hintsExpanded = ref(true);

function resetHintsForWorkspace() {
  hintsExpanded.value = wizardStore.ensureDraft(activeWorkspaceId.value).isFirstAgent;
}

/**
 * Выправляет адрес под фактический шаг draft'а, когда они разошлись.
 * @param {import("../../stores/wizard").WizardDraft} draft
 */
function reconcileRoute(draft) {
  if (route.params.step !== draft.step) {
    router.replace({ name: "agent-wizard", params: { step: draft.step } });
  }
}

/**
 * Единственный controller, который сверяет URL с draft'ом текущего
 * пространства (Task A9.2 acceptance: "Direct URL, browser back/forward и
 * невалидный step используют один controller и fallback, не сбрасывая
 * валидный draft"):
 * - нет draft'а для пространства — продолжает существующий либо заводит
 *   новый (`ensureDraft`), ничего не удаляя;
 * - запрошенный шаг валиден, отличается от текущего и достижим
 *   (`isStepReachable` — post-review fix, Task A9.3) — синхронизирует
 *   draft на него (покрывает прямой URL и back/forward);
 * - запрошенный шаг отсутствует/невалиден/недостижим — не трогает draft и
 *   просто выправляет адрес на его фактический шаг (`reconcileRoute`).
 *   Недостижимый шаг обрабатывается тем же fallback'ом, что невалидный:
 *   прямой URL вперёд по ещё не заполненным pain/context/rules (например,
 *   `/agents/new/review` на пустом draft) не должен молча собрать агента с
 *   пустыми обязательными полями (acceptance: «шаги нельзя молча
 *   пропустить»); для уже завершённого draft'а (`status === "completed"`)
 *   единственный достижимый шаг — `"review"`.
 */
function syncStepFromRoute() {
  const draft = wizardStore.ensureDraft(activeWorkspaceId.value);
  const requestedStep = route.params.step;

  if (
    typeof requestedStep === "string"
    && WIZARD_STEPS.includes(requestedStep)
    && draft.step !== requestedStep
    && isStepReachable(draft, requestedStep)
  ) {
    wizardStore.goToStep(activeWorkspaceId.value, requestedStep);
  }

  reconcileRoute(wizardStore.getDraft(activeWorkspaceId.value));
}

/**
 * Переключение пространства прямо во время мастера показывает его
 * собственный draft (Task A9.1 isolation), а не продолжает чужой — в
 * отличие от `syncStepFromRoute`, здесь шаг из ещё не обновлённого URL
 * (оставшийся от прежнего пространства) сознательно не переносится на
 * (возможно только что созданный) draft нового пространства: адрес всегда
 * подстраивается под draft, а не наоборот.
 */
function syncStepForWorkspace() {
  reconcileRoute(wizardStore.ensureDraft(activeWorkspaceId.value));
}

onMounted(() => {
  syncStepFromRoute();
  resetHintsForWorkspace();
});
watch(() => route.params.step, syncStepFromRoute);
watch(activeWorkspaceId, () => {
  syncStepForWorkspace();
  resetHintsForWorkspace();
});

const draft = computed(() => wizardStore.getDraft(activeWorkspaceId.value));
const stepIndex = computed(
  () => (draft.value ? WIZARD_STEPS.indexOf(draft.value.step) : 0),
);
const stepLabel = computed(() => STEP_LABELS[draft.value?.step] ?? "");
/**
 * После `completeDraft` (Task A9.8, «Сохранить без запуска»/успешный запуск)
 * draft остаётся читаемым (`ReviewStep.vue` показывает post-launch действия),
 * но «Назад»/«Отменить»/«Сохранить черновик»/«Далее» больше не имеют смысла —
 * review → confirmed success — терминальное состояние, а не ещё один шаг,
 * с которого можно вернуться назад в Telegram/Rules (post-review fix,
 * Task A9.8).
 */
const isCompleted = computed(() => draft.value?.status === "completed");
const isFirstStep = computed(() => stepIndex.value <= 0);
const isLastStep = computed(() => stepIndex.value >= WIZARD_STEPS.length - 1);

/**
 * Шаги нельзя молча пропустить (Task A9.3 acceptance): «Далее» неактивна,
 * пока текущий шаг не заполнен — `isStepComplete` уже знает, что шаги за
 * пределами A9.3 (знания/песочница/telegram/review) всегда считаются
 * пройденными, чтобы не запирать ещё не реализованный UI.
 */
const canAdvance = computed(
  () => Boolean(draft.value) && isStepComplete(draft.value.step, draft.value.fields),
);

function patchFields(patch) {
  wizardStore.updateFields(activeWorkspaceId.value, patch);
}

function goPrevious() {
  const result = wizardStore.goToPreviousStep(activeWorkspaceId.value);

  if (result.ok) {
    router.push({ name: "agent-wizard", params: { step: result.draft.step } });
  }
}

function goNext() {
  if (!canAdvance.value) {
    return;
  }

  const result = wizardStore.goToNextStep(activeWorkspaceId.value);

  if (result.ok) {
    router.push({ name: "agent-wizard", params: { step: result.draft.step } });
  }
}

/**
 * Прямой переход на произвольный шаг — используется «Песочницей» (Task
 * A9.6), чтобы предложить вернуться к правилам/знаниям без обхода
 * `wizardStore.goToStep`'s собственной валидации имени шага.
 *
 * @param {string} step
 */
function goToStepDirect(step) {
  const result = wizardStore.goToStep(activeWorkspaceId.value, step);

  if (result.ok) {
    router.push({ name: "agent-wizard", params: { step: result.draft.step } });
  }
}

/**
 * Выход предлагает сохранить либо явно отменить draft (Stage A9 `.plan`,
 * «Знания без внутренних структур»). «Сохранить черновик» ничего
 * дополнительно не пишет — draft уже живёт в `useWizardStore()` — и просто
 * возвращает к каталогу, где продолжение того же draft'а снова доступно
 * через любую точку входа.
 */
function handleSaveDraft() {
  router.push({ name: "agents" });
}

/**
 * Явная отмена: удаляет только сам draft, не трогая уже созданные им
 * fixture-ресурсы (агента/коллекцию/источники — это общие данные, см.
 * `useWizardStore().cancelDraft`).
 */
function handleCancel() {
  wizardStore.cancelDraft(activeWorkspaceId.value);
  router.push({ name: "agents" });
}
</script>
