<template>
  <div class="tr-wizard-step">
    <h2 class="tr-card__title">Проверьте и запустите агента</h2>

    <WizardHint :expanded="hintsExpanded">
      <template #compact>
        «Сохранить без запуска» ничего не включает — ответы начинаются только после «Включить ответы в Telegram».
      </template>
      Проверьте, с чем именно выходит агент — аудитория, знания, правила,
      модель и канал — прежде чем включать реальные ответы. «Сохранить без
      запуска» оставляет агента черновиком/готовым к запуску: клиенты пока
      ничего не получают. «Включить ответы в Telegram» — единственное
      действие, которое переводит агента в активное состояние.
    </WizardHint>

    <dl class="tr-wizard-review-summary">
      <div class="tr-wizard-review-summary__row">
        <dt>Агент</dt>
        <dd>{{ agentName }}</dd>
      </div>

      <div class="tr-wizard-review-summary__row">
        <dt>Аудитория и задача</dt>
        <dd>
          <p v-if="scenario">{{ scenario.title }}</p>
          <p v-if="task" class="tr-muted">{{ task }}</p>
          <p v-if="!scenario && !task" class="tr-muted">Не заполнено.</p>
        </dd>
      </div>

      <div class="tr-wizard-review-summary__row">
        <dt>Знания</dt>
        <dd>
          <p v-if="knowledgeSummary.total > 0">
            Источников: {{ knowledgeSummary.total }} — готово {{ knowledgeSummary.ready }},
            обрабатывается {{ knowledgeSummary.processing }}, с ошибкой {{ knowledgeSummary.error }}.
          </p>
          <p v-else class="tr-muted">Источники не добавлены — агент отвечает без собственных материалов.</p>
        </dd>
      </div>

      <div class="tr-wizard-review-summary__row">
        <dt>Правила ответов</dt>
        <dd>
          <p v-if="styleLabel">Стиль: {{ styleLabel }}.</p>
          <p v-if="noAnswerLabel">Если ответа нет: {{ noAnswerLabel }}.</p>
          <p v-if="handoffLabel">Связь с оператором: {{ handoffLabel }}.</p>
          <p v-if="restrictions" class="tr-muted">Ограничения: {{ restrictions }}</p>
        </dd>
      </div>

      <div class="tr-wizard-review-summary__row">
        <dt>Модель</dt>
        <dd>
          <p>{{ modelClassLabel }}</p>
          <p v-if="fields.useOwnApiKey" class="tr-muted">Используется собственный ключ (BYOK).</p>
        </dd>
      </div>

      <div class="tr-wizard-review-summary__row">
        <dt>Канал</dt>
        <dd>
          <p v-if="channel?.providerIdentity">
            <b-icon icon="check-circle-outline" size="is-small" />
            Telegram-бот {{ channel.providerIdentity }} подключён, ответы пока не включены.
          </p>
          <p v-else class="tr-muted">
            Telegram не подключён.
            <button type="button" class="tr-wizard__hints-toggle" @click="emit('go-to-step', 'telegram')">
              Подключить сейчас
            </button>
          </p>
        </dd>
      </div>

      <div v-if="channel" class="tr-wizard-review-summary__row">
        <dt>Лимиты канала</dt>
        <dd>
          <ul class="tr-wizard-review-limits">
            <li v-for="limit in channel.limits" :key="limit.key">
              {{ limit.label }}: {{ limit.effective }}
            </li>
          </ul>
        </dd>
      </div>

      <div class="tr-wizard-review-summary__row">
        <dt>Последствия запуска</dt>
        <dd class="tr-muted">
          После «Включить ответы в Telegram» подключённый бот начинает реально
          отвечать клиентам по заданным правилам и знаниям — отменить это можно
          только явной паузой, а не возвратом по шагам мастера.
        </dd>
      </div>
    </dl>

    <b-message v-if="launchStage === 'error'" type="is-danger" :closable="false">
      {{ launchErrorMessage }}
    </b-message>

    <template v-if="!isCompleted">
      <div class="tr-row mt-4">
        <b-button
          :loading="launchStage === 'pending' && pendingAction === 'save'"
          :disabled="launchStage === 'pending'"
          @click="handleSaveWithoutLaunch"
        >
          Сохранить без запуска
        </b-button>
        <b-button
          type="is-primary"
          icon-left="rocket-launch-outline"
          :disabled="!canLaunch || launchStage === 'pending'"
          :loading="launchStage === 'pending' && pendingAction === 'launch'"
          @click="handleLaunch"
        >
          Включить ответы в Telegram
        </b-button>
      </div>
      <p v-if="!canLaunch" class="tr-muted">
        Подключите и подтвердите Telegram-бота на предыдущем шаге, чтобы включить ответы.
      </p>
    </template>

    <template v-else-if="wasLaunched">
      <b-notification v-if="!isPaused" type="is-success is-light" :closable="false">
        <p>
          <b-icon icon="check-circle-outline" size="is-small" />
          Агент активен — бот {{ channel?.providerIdentity }} отвечает клиентам.
        </p>
      </b-notification>
      <b-notification v-else type="is-warning is-light" :closable="false">
        <p>
          <b-icon icon="pause-circle-outline" size="is-small" />
          Агент приостановлен — бот {{ channel?.providerIdentity }} сейчас не отвечает клиентам.
        </p>
      </b-notification>

      <div class="tr-row mt-4">
        <a
          v-if="channel?.providerPublicUrl"
          :href="channel.providerPublicUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="button"
        >
          <b-icon icon="send-outline" size="is-small" />
          <span>Открыть бота</span>
        </a>
        <b-button
          tag="router-link"
          :to="{ name: 'conversations-agent', params: { agentId: String(agent?.id) } }"
          icon-left="forum-outline"
        >
          Перейти к диалогам
        </b-button>
        <b-button icon-left="pause-circle-outline" @click="togglePause">
          {{ isPaused ? "Возобновить ответы" : "Приостановить ответы" }}
        </b-button>
        <b-button icon-left="plus-circle-outline" @click="startNextAgent">
          Создать следующего агента
        </b-button>
      </div>
    </template>

    <template v-else>
      <b-notification type="is-info is-light" :closable="false">
        <p>
          <b-icon icon="content-save-outline" size="is-small" />
          Черновик сохранён. Ответы клиентам ещё не включены.
        </p>
      </b-notification>

      <div class="tr-row mt-4">
        <b-button
          tag="router-link"
          :to="{ name: 'agent-settings', params: { id: String(agent?.id) } }"
          icon-left="cog-outline"
        >
          Открыть настройки агента
        </b-button>
        <b-button icon-left="plus-circle-outline" @click="startNextAgent">
          Создать следующего агента
        </b-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getRecommendedModelClassId,
  getWizardAgentName,
  getWizardPainScenario,
  useWizardStore,
  WIZARD_RULES_HANDOFF_OPTIONS,
  WIZARD_RULES_NO_ANSWER_OPTIONS,
  WIZARD_RULES_STYLE_OPTIONS,
} from "../../../../stores/wizard";
import { useAgentsStore } from "../../../../stores/agents";
import { useChannelsStore } from "../../../../stores/channels";
import { useKnowledgeStore } from "../../../../stores/knowledge";
import { getWizardDictionary } from "../../../../locales/wizard";
import WizardHint from "../WizardHint.vue";

// Шаг «Проверка и запуск» (Task A9.8, `.plan` шаг 7 и «Система статусов» S2:
// «Активация: review → подтверждённый успех → активное состояние»). Единственный
// шаг, который реально пишет собранные `fields` на агента
// (`wizardStore.finalizeAgentFields`, вызывается и «Сохранить без запуска», и
// «Включить ответы в Telegram») и единственное место, включающее ответы
// (`wizardStore.launchAgent` — `agent.status = "Активен"` и активация уже
// подтверждённого на шаге «Telegram» канала). Оба действия retry-safe: ни
// одно не создаёт второго агента/канала при повторном клике.
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

const emit = defineEmits(["go-to-step"]);

const router = useRouter();
const wizardStore = useWizardStore();
const agentsStore = useAgentsStore();
const channelsStore = useChannelsStore();
const knowledgeStore = useKnowledgeStore();

const workspaceId = computed(() => props.draft.workspaceId);
const fields = computed(() => props.draft.fields);
const t = computed(() => getWizardDictionary(props.draft.locale));

const agentName = computed(() => getWizardAgentName(fields.value));
const scenario = computed(() => getWizardPainScenario(fields.value.scenarioId));
const task = computed(() => String(fields.value.task ?? "").trim());
const restrictions = computed(() => String(fields.value.restrictions ?? "").trim());

const styleLabel = computed(
  () => WIZARD_RULES_STYLE_OPTIONS.find((option) => option.id === fields.value.style)?.label,
);
const noAnswerLabel = computed(
  () => WIZARD_RULES_NO_ANSWER_OPTIONS.find((option) => option.id === fields.value.noAnswerAction)?.label,
);
const handoffLabel = computed(
  () => WIZARD_RULES_HANDOFF_OPTIONS.find((option) => option.id === fields.value.operatorHandoff)?.label,
);

const modelClassId = computed(
  () => fields.value.modelClassId ?? getRecommendedModelClassId(fields.value.scenarioId),
);
const modelClassLabel = computed(() => `Класс модели: ${t.value.modelClass[modelClassId.value]?.label ?? modelClassId.value}`);

const collection = computed(() => {
  const { collectionId } = props.draft.resources;

  return collectionId == null ? undefined : knowledgeStore.getCollection(workspaceId.value, collectionId);
});

const knowledgeSummary = computed(() => {
  const objects = collection.value?.objects ?? [];

  return {
    total: objects.length,
    ready: objects.filter((object) => object.status === "indexed").length,
    processing: objects.filter((object) => object.status === "indexing").length,
    error: objects.filter((object) => object.status === "error").length,
  };
});

const agent = computed(() => {
  const { agentId } = props.draft.resources;

  return agentId == null ? undefined : agentsStore.getAgent(workspaceId.value, agentId);
});

const channel = computed(() => {
  const { agentId, channelId } = props.draft.resources;

  if (agentId == null || channelId == null) {
    return undefined;
  }

  return channelsStore.listByAgent(workspaceId.value, agentId).find((item) => item.id === channelId);
});

const canLaunch = computed(() => Boolean(channel.value?.providerIdentity));

/** @type {import("vue").Ref<"idle" | "pending" | "error">} */
const launchStage = ref("idle");
const pendingAction = ref(null);
const launchErrorMessage = ref("");

const LAUNCH_ERROR_MESSAGES = {
  no_channel: "Сначала подтвердите подключение Telegram-бота на предыдущем шаге.",
  channel_conflict: "Этот бот уже активирован в другом рабочем пространстве — подключите другого бота.",
  no_draft: "Черновик недоступен — начните мастер заново.",
};

// «Завершён» и «был запущен» — два разных факта: draft может быть завершён
// «Сохранить без запуска» (канал остаётся не включён), поэтому пост-запуск
// панель показывается только когда завершение — результат именно
// `launchAgent`. Проверка идёт по `channel.isEnabled`, а не по живому
// `agent.status === "Активен"`, потому что «Приостановить ответы» ниже меняет
// именно `agent.status` и не должен на этом основании скрывать пост-launch
// панель обратно за черновик-вид — пауза уже запущенного агента остаётся
// «реальным последствием» (`.plan` S2), а не откатом к «ещё не запускали».
const isCompleted = computed(() => props.draft.status === "completed");
const wasLaunched = computed(() => isCompleted.value && Boolean(channel.value?.isEnabled));

function handleSaveWithoutLaunch() {
  launchStage.value = "pending";
  pendingAction.value = "save";

  const result = wizardStore.saveDraftWithoutLaunch(workspaceId.value);

  launchStage.value = result.ok ? "idle" : "error";
  launchErrorMessage.value = result.ok ? "" : (LAUNCH_ERROR_MESSAGES[result.reason] ?? "Не удалось сохранить черновик.");
  pendingAction.value = null;
}

function handleLaunch() {
  if (!canLaunch.value) {
    return;
  }

  launchStage.value = "pending";
  pendingAction.value = "launch";

  const result = wizardStore.launchAgent(workspaceId.value);

  launchStage.value = result.ok ? "idle" : "error";
  launchErrorMessage.value = result.ok ? "" : (LAUNCH_ERROR_MESSAGES[result.reason] ?? "Не удалось включить ответы.");
  pendingAction.value = null;
}

const isPaused = computed(() => agent.value?.status === "Приостановлен");

/**
 * Пауза/возобновление всего агента (не только канала) — тот же прямой
 * `agent.status =`, которым уже управляет `<b-select v-model="agent.status">`
 * в `AgentSettings.vue`, а не отдельный store-сеттер, дублирующий то же
 * присваивание. Показывает «реальные последствия» (`.plan` S2): пауза не
 * переименовывает ошибку канала, а явно останавливает уже активного агента.
 */
function togglePause() {
  if (!agent.value) {
    return;
  }

  agent.value.status = isPaused.value ? "Активен" : "Приостановлен";
  agent.value.updated = "Сейчас";
}

/**
 * «Создать следующего агента» (acceptance: «доступно... создание следующего
 * агента»; «экспертный личный сценарий не появляется» — обычный `startDraft`
 * заводит новый черновик с первого, клиентского шага «Боль», как любой другой
 * вход в мастер). Явно новый draft, а не продолжение текущего — прежний уже
 * завершён и не подлежит `continueDraft`.
 */
function startNextAgent() {
  wizardStore.startDraft(workspaceId.value);
  router.push({ name: "agent-wizard", params: { step: "pain" } });
}
</script>
