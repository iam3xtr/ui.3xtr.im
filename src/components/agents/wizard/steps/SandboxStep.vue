<template>
  <div class="tr-wizard-step">
    <h2 class="tr-card__title">Проверьте агента в песочнице</h2>

    <WizardHint :expanded="hintsExpanded">
      <template #compact>
        Задайте пару вопросов от имени клиента — сообщения сюда не попадут в реальные диалоги.
      </template>
      Отправьте несколько вопросов так, как их мог бы задать клиент — это тест
      настроенных правил и знаний, а не оценка возможностей модели в целом.
      Если ответа не хватает, вернитесь и поправьте правила или знания —
      песочница остаётся доступной для повторной проверки в любой момент.
    </WizardHint>

    <p class="tr-agents__sandbox-note">
      <b-icon icon="flask-outline" size="is-small" />
      Вы тестируете от имени клиента — сообщения здесь не публикуются и не попадут в реальные диалоги.
    </p>

    <b-message v-if="isStale" type="is-warning" :closable="false">
      Изменения не проверены: правила, знания или класс модели изменились
      после последней проверки. Отправьте новый вопрос ниже, чтобы увидеть
      актуальную реакцию агента.
    </b-message>
    <p v-else-if="isVerified" class="tr-muted">
      <b-icon icon="check-circle-outline" size="is-small" />
      Проверено в песочнице с текущими правилами и знаниями.
    </p>

    <div class="tr-wizard-source-add__actions">
      <b-button
        v-for="question in quickQuestions"
        :key="question.id"
        size="is-small"
        @click="ask(question.text, question.hasAnswer)"
      >
        {{ question.text }}
      </b-button>
    </div>

    <div class="tr-conversation-messages tr-wizard-sandbox-messages" aria-live="polite">
      <p v-if="!messages.length" class="tr-muted">
        Ещё нет тестовых сообщений — выберите вопрос выше или напишите свой.
      </p>
      <div
        v-for="message in messages"
        :key="message.id"
        class="tr-chat-message"
        :class="{ 'is-outgoing': message.outgoing }"
      >
        <p>{{ message.text }}</p>
      </div>
    </div>

    <footer class="tr-conversation-composer">
      <b-input
        v-model="customQuestion"
        class="tr-conversation-composer-input"
        placeholder="Свой вопрос от имени клиента"
        @keyup.enter="sendCustom"
      />
      <b-button
        type="is-primary"
        icon-left="send"
        aria-label="Отправить"
        @click="sendCustom"
      />
    </footer>

    <div class="tr-row mt-4">
      <b-button icon-left="tune-variant" @click="emit('go-to-step', 'rules')">
        Изменить правила
      </b-button>
      <b-button icon-left="book-outline" @click="emit('go-to-step', 'knowledge')">
        Изменить знания
      </b-button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import {
  getSandboxNoAnswerReply,
  getSandboxVerificationSignature,
  getWizardPainScenario,
  isSandboxVerificationStale,
  useWizardStore,
  WIZARD_SANDBOX_ANSWERED_REPLY,
  WIZARD_SANDBOX_GENERIC_QUESTIONS,
  WIZARD_SANDBOX_NO_INFO_QUESTION,
} from "../../../../stores/wizard";
import { useKnowledgeStore } from "../../../../stores/knowledge";
import WizardHint from "../WizardHint.vue";

// Шаг «Песочница» (Task A9.6, `.plan` шаг 5 и «Система статусов» S2).
// Получает весь `draft` (не только `fields`), как Knowledge/Rules, потому что
// проверка зависит и от `workspaceId` (доступ к добавленным знаниям), и от
// `resources` (`isSandboxVerificationStale`). Транскрипт — чисто локальное
// состояние компонента: он никогда не пишет в `useAgentsStore().messages` и
// не создаёт канал — «Песочница не включает канал» (acceptance) в буквальном
// смысле не имеет здесь ни одного вызова `useChannelsStore()`.
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

const wizardStore = useWizardStore();
const knowledgeStore = useKnowledgeStore();

const workspaceId = computed(() => props.draft.workspaceId);
const fields = computed(() => props.draft.fields);
const scenario = computed(() => getWizardPainScenario(fields.value.scenarioId));

/**
 * Готовые (`indexed`) источники личной коллекции draft'а — используется
 * только чтобы решить, есть ли агенту чем ответить по существу; ноль готовых
 * источников ведёт себя как явный «вопрос без ответа», даже для вопросов,
 * которые в принципе имеют ответ при наличии знаний.
 */
const readyKnowledgeCount = computed(() => {
  const { collectionId } = props.draft.resources;

  if (collectionId == null) {
    return 0;
  }

  const collection = knowledgeStore.getCollection(workspaceId.value, collectionId);

  return collection?.objects.filter((object) => object.status === "indexed").length ?? 0;
});

const quickQuestions = computed(() => {
  const list = [];

  if (scenario.value?.sampleQuestion) {
    list.push({
      id: `scenario-${scenario.value.id}`,
      text: scenario.value.sampleQuestion,
      hasAnswer: true,
    });
  }

  WIZARD_SANDBOX_GENERIC_QUESTIONS.forEach((question) => {
    list.push({ ...question, hasAnswer: true });
  });

  list.push({ ...WIZARD_SANDBOX_NO_INFO_QUESTION, hasAnswer: false });

  return list;
});

const isStale = computed(() => isSandboxVerificationStale(props.draft));
const isVerified = computed(
  () => Boolean(fields.value.sandboxVerifiedSignature) && !isStale.value,
);

const messages = reactive([]);
let messageSequence = 0;

function pushMessage(text, outgoing) {
  messageSequence += 1;
  messages.push({ id: messageSequence, text, outgoing });
}

/**
 * @param {string} text
 * @param {boolean} [hasAnswer] По умолчанию `true` — свой вопрос считается
 *   потенциально отвечаемым, пока знаний ещё нет ни одного готового
 *   (`readyKnowledgeCount`), после чего фактический ответ всё равно уйдёт в
 *   fallback ветку ниже.
 */
function ask(text, hasAnswer = true) {
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  pushMessage(trimmed, true);

  const canAnswer = hasAnswer && readyKnowledgeCount.value > 0;
  const reply = canAnswer
    ? WIZARD_SANDBOX_ANSWERED_REPLY
    : getSandboxNoAnswerReply(fields.value.noAnswerAction);

  // Конфигурация, которую реально проверяет этот вопрос, фиксируется здесь,
  // в момент отправки, а не в момент срабатывания таймера ниже: пользователь
  // может успеть за эти 400мс уйти на «Изменить правила»/«Изменить знания»,
  // поменять там что-то и вернуться — тогда таймер, привязанный к текущим (уже
  // другим) `draft.fields`, не должен тихо пометить их как проверенные,
  // хотя реально был протестирован предыдущий вариант (post-review fix,
  // Task A9.6 acceptance: «изменение проверенных правил/знаний/class
  // помечает необходимость повторной проверки»).
  const testedSignature = getSandboxVerificationSignature(props.draft);

  setTimeout(() => {
    pushMessage(reply, false);
    // Pending/error никогда не выглядит успехом (acceptance): подпись
    // «Проверено» фиксируется только здесь, после реально показанного
    // ответа, не в момент отправки вопроса — и только если конфигурация с
    // момента отправки не изменилась; иначе показанный ответ отвечает уже не
    // на неё, и текущая (непроверенная) конфигурация не должна выглядеть
    // проверенной.
    if (getSandboxVerificationSignature(props.draft) === testedSignature) {
      wizardStore.markSandboxVerified(workspaceId.value);
    }
  }, 400);
}

const customQuestion = ref("");

function sendCustom() {
  const text = customQuestion.value;
  customQuestion.value = "";
  ask(text, true);
}
</script>
