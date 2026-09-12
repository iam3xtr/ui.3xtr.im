import { defineStore } from "pinia";
import { ref } from "vue";
import { useAgentsStore } from "./agents.js";
import { useKnowledgeStore } from "./knowledge.js";
import { useModelsStore } from "./models.js";
import { useChannelsStore } from "./channels.js";

/**
 * Порядок смысловых шагов мастера (Stage A9 `.plan`): «Боль», «Контекст»,
 * «Правила», «Знания», «Песочница», «Telegram», «Review». Task A9.1 owns
 * only the lifecycle container — the actual per-step fields/UI are built in
 * A9.3–A9.8 on top of this list and `WizardDraft.fields`.
 *
 * @type {ReadonlyArray<"pain" | "context" | "rules" | "knowledge" | "sandbox" | "telegram" | "review">}
 */
export const WIZARD_STEPS = Object.freeze([
  "pain",
  "context",
  "rules",
  "knowledge",
  "sandbox",
  "telegram",
  "review",
]);

/**
 * @typedef {typeof WIZARD_STEPS[number]} WizardStepId
 */

/**
 * Fixture-сценарии шага «Боль» (Task A9.3, Stage A9 `.plan` — «Шаги и
 * обучающий результат», строка 1): 3–5 подготовленных вариантов, каждый со
 * стабильным `id` (используется как `fields.scenarioId` и переживает
 * back/forward — Task A9.1), примером клиентского вопроса и ожидаемого
 * результата, плюс всегда доступная «Другая задача» последним пунктом.
 * Ни один сценарий не обещает оформление заказа, CRM или запись — только
 * ответ на основе знаний агента (см. риск в `.plan`).
 *
 * @typedef {Object} WizardPainScenario
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string | null} sampleQuestion Пример клиентского вопроса —
 *   `null` только у «Другая задача», у которой нет фиксированного примера.
 * @property {string | null} expectedResult
 * @property {string} suggestedAgentName Предложенное (редактируемое на шаге
 *   «Контекст») имя агента для этого сценария.
 *
 * @type {ReadonlyArray<WizardPainScenario>}
 */
export const WIZARD_PAIN_SCENARIOS = Object.freeze([
  {
    id: "faq",
    title: "Повторяющиеся вопросы",
    description: "Разгрузить оператора от вопросов, которые клиенты задают снова и снова.",
    sampleQuestion: "Какой у вас график работы по выходным?",
    expectedResult: "Агент отвечает сразу по знаниям компании — оператор подключается только "
      + "к остальным обращениям.",
    suggestedAgentName: "Агент по частым вопросам",
  },
  {
    id: "product-pick",
    title: "Подбор товара или услуги",
    description: "Помочь клиенту выбрать подходящий вариант по описанию его задачи.",
    sampleQuestion: "Посоветуйте ноутбук для видеомонтажа до 150 000 ₽.",
    expectedResult: "Агент уточняет детали и предлагает подходящие варианты из загруженных знаний.",
    suggestedAgentName: "Агент-консультант по подбору",
  },
  {
    id: "pre-operator",
    title: "Уточнение запроса перед ответом оператора",
    description: "Собрать детали обращения, прежде чем его увидит оператор.",
    sampleQuestion: "У меня не работает экспорт отчёта в приложении.",
    expectedResult: "Агент уточняет детали проблемы и передаёт оператору готовый к разбору запрос.",
    suggestedAgentName: "Агент предварительного приёма",
  },
  {
    id: "general-info",
    title: "Общая информация о компании",
    description: "Рассказывать клиентам о продукте, условиях и услугах компании.",
    sampleQuestion: "Какие у вас варианты доставки?",
    expectedResult: "Агент отвечает по материалам, которые вы ему загрузите.",
    suggestedAgentName: "Информационный агент",
  },
  {
    id: "other",
    title: "Другая задача",
    description: "Опишите своими словами, с чем должен помогать агент.",
    sampleQuestion: null,
    expectedResult: null,
    suggestedAgentName: "Новый агент",
  },
]);

/**
 * @param {string | undefined | null} scenarioId
 * @returns {WizardPainScenario | undefined}
 */
export function getWizardPainScenario(scenarioId) {
  return WIZARD_PAIN_SCENARIOS.find((scenario) => scenario.id === scenarioId);
}

/**
 * Fixture-варианты стиля общения и полей «Правил ответов» (Task A9.3, `.plan`
 * строка 4). Значения — стабильные id, а не отображаемые подписи, чтобы
 * локализация (Task A9.5) могла переводить подписи, не трогая `fields`.
 *
 * @type {ReadonlyArray<{ id: string, label: string }>}
 */
export const WIZARD_RULES_STYLE_OPTIONS = Object.freeze([
  { id: "friendly", label: "Дружелюбный" },
  { id: "business", label: "Деловой" },
  { id: "concise", label: "Краткий" },
]);

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const WIZARD_RULES_NO_ANSWER_OPTIONS = Object.freeze([
  { id: "apologize_offer_operator", label: "Извиниться и предложить связаться с оператором" },
  { id: "suggest_related", label: "Предложить похожий по теме материал из знаний" },
  { id: "ask_clarify", label: "Задать уточняющий вопрос вместо ответа" },
]);

/**
 * UI languages the wizard's expert-parameters disclosure (Task A9.5) can
 * render in — scoped local dictionaries under `src/locales/wizard/**`, not a
 * kit-wide i18n library (`.plan` "Ограничения": exception is A9/A10 scoped
 * dictionaries only). Switching this never touches `fields`/`resources` —
 * see `setLocale` — and is independent from the language the operator types
 * the agent's own instructions in.
 *
 * @type {ReadonlyArray<"ru" | "en" | "es">}
 */
export const WIZARD_LOCALES = Object.freeze(["ru", "en", "es"]);

/** @type {"ru"} */
export const DEFAULT_WIZARD_LOCALE = "ru";

/**
 * @param {unknown} value
 * @returns {typeof WIZARD_LOCALES[number]}
 */
export function normalizeWizardLocale(value) {
  return WIZARD_LOCALES.includes(/** @type {any} */ (value)) ? value : DEFAULT_WIZARD_LOCALE;
}

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const WIZARD_RULES_HANDOFF_OPTIONS = Object.freeze([
  { id: "on_no_answer", label: "Когда агент не находит ответ в знаниях" },
  { id: "on_request", label: "Только если клиент сам просит оператора" },
  { id: "complex_only", label: "Для сложных или конфликтных обращений" },
]);

/**
 * Валидация шага «Боль»: сценарий обязателен, а для «Другая задача» —
 * дополнительно непустое описание (Task A9.3 acceptance: «Шаги нельзя молча
 * пропустить»).
 *
 * @param {Record<string, unknown>} fields
 * @returns {boolean}
 */
export function isPainStepComplete(fields) {
  if (!fields.scenarioId) {
    return false;
  }

  if (fields.scenarioId === "other") {
    return Boolean(String(fields.customPainDescription ?? "").trim());
  }

  return true;
}

/**
 * Валидация шага «Контекст»: краткое описание бизнеса, клиента, цели агента
 * и имя агента — все обязательны (`.plan` строка 2), без выбора пространства
 * или модели.
 *
 * @param {Record<string, unknown>} fields
 * @returns {boolean}
 */
export function isContextStepComplete(fields) {
  return Boolean(String(fields.businessDescription ?? "").trim())
    && Boolean(String(fields.customerDescription ?? "").trim())
    && Boolean(String(fields.goalDescription ?? "").trim())
    && Boolean(String(fields.agentName ?? "").trim());
}

/**
 * Валидация шага «Правила ответов»: задача, стиль, реакция на отсутствие
 * ответа и условие связи с оператором обязательны; ограничения — нет
 * (`.plan` строка 4: «краткие поля/варианты»).
 *
 * @param {Record<string, unknown>} fields
 * @returns {boolean}
 */
export function isRulesStepComplete(fields) {
  return Boolean(String(fields.task ?? "").trim())
    && Boolean(fields.style)
    && Boolean(fields.noAnswerAction)
    && Boolean(fields.operatorHandoff);
}

/**
 * Диспетчер валидации по шагу — используется shell'ом мастера (Task A9.3),
 * чтобы решить, можно ли включить «Далее». Шаги, ещё не реализованные этой
 * задачей (`knowledge`/`sandbox`/`telegram`/`review`), намеренно считаются
 * пройденными: их собственная валидация — предмет Task A9.4/A9.6–A9.8, и
 * блокировать здесь несуществующий UI значило бы запереть мастер.
 *
 * @param {WizardStepId | string | undefined} step
 * @param {Record<string, unknown>} fields
 * @returns {boolean}
 */
export function isStepComplete(step, fields) {
  switch (step) {
    case "pain":
      return isPainStepComplete(fields);
    case "context":
      return isContextStepComplete(fields);
    case "rules":
      return isRulesStepComplete(fields);
    default:
      return true;
  }
}

/**
 * Достижим ли `step` напрямую (используется только для гварда прямого URL в
 * `AgentWizard.vue#syncStepFromRoute`, post-review fix — не для внутреннего
 * `goToStep`/`goToStepDirect`, которые остаются raw-примитивом без этой
 * проверки, в том числе потому, что на нём напрямую держится test-setup
 * большинства component-тестов мастера). Завершённый draft (`status ===
 * "completed"`) достижим только на `"review"` — там нет промежуточного шага,
 * на который стоило бы «расфинишировать» уже сохранённого/запущенного
 * агента. Иначе шаг достижим тогда и только тогда, когда все предшествующие
 * ему в `WIZARD_STEPS` шаги уже пройдены (`isStepComplete`) — это ровно те
 * же pain/context/rules, что реально валидируются, поскольку остальные шаги
 * по умолчанию всегда «пройдены» для `isStepComplete`. Прямой URL вперёд по
 * ещё не заполненным обязательным шагам (например, `/agents/new/review` на
 * пустом draft) не должен молча собрать агента с пустой болью/контекстом/
 * правилами (Task A9.3 acceptance: «шаги нельзя молча пропустить»).
 *
 * @param {WizardDraft} draft
 * @param {WizardStepId} step
 * @returns {boolean}
 */
export function isStepReachable(draft, step) {
  if (draft.status === "completed") {
    return step === "review";
  }

  const targetIndex = WIZARD_STEPS.indexOf(step);

  for (let index = 0; index < targetIndex; index += 1) {
    if (!isStepComplete(WIZARD_STEPS[index], draft.fields)) {
      return false;
    }
  }

  return true;
}

/**
 * Имя личной коллекции знаний агента, пока оно не переименовано явно (Task
 * A9.4, `.plan` «Знания без внутренних структур»): совпадает с текущим
 * `fields.agentName`, а не с выбранным сценарием и не с локалью — так
 * `KnowledgeStep.vue` и `syncAutoName` (`stores/knowledge.js`) применяют одно
 * и то же правило, а тесты не дублируют его отдельной строкой.
 *
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function getWizardKnowledgeCollectionName(fields) {
  return String(fields.agentName ?? "").trim() || "Личная база знаний агента";
}

/**
 * Имя агента с тем же fallback-правилом, что `getWizardKnowledgeCollectionName`
 * (Task A9.7): по умолчанию совпадает с `fields.agentName`, а fallback нужен
 * только потому, что `AgentWizard.vue`'s `syncStepFromRoute` разрешает прямой
 * URL на любой шаг мимо «Контекста» — где `agentName` иначе гарантированно
 * непусто (`isContextStepComplete` требует его до перехода дальше).
 *
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function getWizardAgentName(fields) {
  return String(fields.agentName ?? "").trim() || "Новый агент";
}

/**
 * Fixture-классификация T2-токена бота (Task A9.7, `.plan` шаг 6): без
 * реального Bot API результат детерминируется зарезервированными
 * подстроками, тем же приёмом, что «каждый третий источник знаний» в
 * `KnowledgeStep.vue` — тесты и демонстрация надёжно воспроизводят все
 * требуемые состояния (неверный токен, конфликт подключения) без сети.
 *
 * @param {string} token
 * @returns {"empty" | "invalid" | "conflict" | "ok"}
 */
export function classifyTelegramToken(token) {
  const value = String(token ?? "").trim();

  if (!value) {
    return "empty";
  }

  const lower = value.toLocaleLowerCase();

  if (lower.includes("invalid")) {
    return "invalid";
  }

  if (lower.includes("taken") || lower.includes("conflict")) {
    return "conflict";
  }

  return "ok";
}

/**
 * Рекомендуемый по умолчанию класс модели для каждого сценария «Боли» (Task
 * A9.5, `.plan` решение 2: «по умолчанию настроен рекомендованный для
 * сценария класс модели; отдельный обязательный шаг выбора модели не
 * добавляется»). Не обязывающая гарантия качества — только предустановка,
 * которую пользователь может сменить на любой доступный по capability класс.
 *
 * @type {Record<string, import("./models.js").ModelClassId>}
 */
const SCENARIO_RECOMMENDED_MODEL_CLASS = Object.freeze({
  faq: "basic",
  "general-info": "basic",
  "product-pick": "advanced",
  "pre-operator": "advanced",
  other: "basic",
});

/**
 * @param {string | undefined | null} scenarioId
 * @returns {import("./models.js").ModelClassId}
 */
export function getRecommendedModelClassId(scenarioId) {
  return SCENARIO_RECOMMENDED_MODEL_CLASS[scenarioId ?? ""] ?? "basic";
}

/**
 * Собирает предпросмотр итоговой системной инструкции из структурированных
 * полей шага «Правила» (Task A9.5, `.plan` таблица «Шаги и обучающий
 * результат», строка 4: «показать итоговую системную инструкцию в
 * экспертной зоне»). Это шаблон, который экспертная зона показывает, пока
 * `fields.instructionMode !== "custom"` — не то, что реально сохраняется на
 * агенте (это делает `finalizeAgentFields`/`resolveWizardInstructions`,
 * Task A9.8, шаг «Проверка и запуск»).
 *
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function generateInstructionTemplate(fields) {
  const lines = [];
  const task = String(fields.task ?? "").trim();

  if (task) {
    lines.push(task);
  }

  const style = WIZARD_RULES_STYLE_OPTIONS.find((option) => option.id === fields.style);
  if (style) {
    lines.push(`Стиль общения: ${style.label.toLowerCase()}.`);
  }

  const restrictions = String(fields.restrictions ?? "").trim();
  if (restrictions) {
    lines.push(`Ограничения: ${restrictions}`);
  }

  const noAnswer = WIZARD_RULES_NO_ANSWER_OPTIONS.find((option) => option.id === fields.noAnswerAction);
  if (noAnswer) {
    lines.push(`Если ответа нет в знаниях: ${noAnswer.label.toLowerCase()}.`);
  }

  const handoff = WIZARD_RULES_HANDOFF_OPTIONS.find((option) => option.id === fields.operatorHandoff);
  if (handoff) {
    lines.push(`Предлагать связаться с оператором: ${handoff.label.toLowerCase()}.`);
  }

  return lines.join("\n");
}

/**
 * Финальный текст системной инструкции — та же ветка, что
 * `ExpertParameters.vue`'s превью (`instructionMode === "custom"` → сырой
 * `instructionOverride`, иначе собранный `generateInstructionTemplate`).
 * Вынесена сюда как отдельный export, а не продублирована в
 * `ReviewStep.vue`/`useWizardStore().finalizeAgentFields`, потому что это
 * именно то значение, которое «Проверка и запуск» (Task A9.8) показывает в
 * аудите и реально записывает на агента — в отличие от `ExpertParameters.vue`,
 * которая только рисует превью.
 *
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function resolveWizardInstructions(fields) {
  return fields.instructionMode === "custom"
    ? String(fields.instructionOverride ?? "")
    : generateInstructionTemplate(fields);
}

/**
 * Fixture-набор быстрых тестовых вопросов шага «Песочница» (Task A9.6,
 * `.plan` шаг 5 и «Система статусов» S2): пример сценария «Боли» (когда он
 * есть — «Другая задача» его не имеет), пара общих вопросов и явный «вопрос
 * без ответа», намеренно не покрытый знаниями, чтобы предсказуемо показать
 * реакцию `noAnswerAction` (Task A9.3), а не полагаться на то, знания уже
 * добавлены или нет. Ни один из них не публикуется клиентам и не отправляется
 * в `stores/agents.js`'s `sendMessage` — песочница мастера полностью
 * client-only, в отличие от `AgentPlayground.vue`'s реального агента.
 *
 * @type {ReadonlyArray<{ id: string, text: string }>}
 */
export const WIZARD_SANDBOX_GENERIC_QUESTIONS = Object.freeze([
  { id: "generic-recommend", text: "Что вы можете посоветовать в моей ситуации?" },
  { id: "generic-price", text: "Сколько это стоит и какие есть варианты?" },
]);

/** @type {{ id: string, text: string }} */
export const WIZARD_SANDBOX_NO_INFO_QUESTION = Object.freeze({
  id: "no-info",
  text: "Расскажите про то, чего точно нет в ваших материалах.",
});

/**
 * Демо-реплика для вопроса, на который у агента есть чем ответить (сценарный
 * пример, общий вопрос, свой вопрос — при наличии готовых знаний). Текст
 * прямо называет себя демонстрацией шаблона, а не результатом реального
 * обращения к модели (Task A9.6 acceptance: «не заявляет оценку реального
 * ИИ»).
 *
 * @type {string}
 */
export const WIZARD_SANDBOX_ANSWERED_REPLY = "Демо-ответ: в реальном диалоге агент "
  + "сформулирует его по своей модели, опираясь на добавленные знания и правила.";

/**
 * Демо-реплики на случай отсутствия ответа — по одной на каждый вариант
 * `WIZARD_RULES_NO_ANSWER_OPTIONS`, чтобы песочница показывала именно то
 * поведение, которое выбрано на шаге «Правила», а не общую заглушку.
 *
 * @type {Record<string, string>}
 */
export const WIZARD_SANDBOX_NO_ANSWER_REPLIES = Object.freeze({
  apologize_offer_operator: "Демо-реакция: «Извините, точного ответа на этот "
    + "вопрос у меня нет. Хотите, я передам обращение оператору?»",
  suggest_related: "Демо-реакция: «Точного ответа нет, но вот похожий "
    + "материал из ваших знаний, который может подойти.»",
  ask_clarify: "Демо-реакция: «Уточните, пожалуйста, что именно вас "
    + "интересует — так я смогу подсказать точнее.»",
});

/**
 * @param {string | undefined | null} noAnswerAction
 * @returns {string}
 */
export function getSandboxNoAnswerReply(noAnswerAction) {
  return WIZARD_SANDBOX_NO_ANSWER_REPLIES[noAnswerAction]
    ?? WIZARD_SANDBOX_NO_ANSWER_REPLIES.apologize_offer_operator;
}

/**
 * Стабильная подпись всего, от чего зависит проверка в песочнице: задача,
 * стиль, ограничения, реакция на отсутствие ответа, условие связи с
 * оператором, класс модели и набор ключей добавленных источников знаний.
 * Сравнение двух подписей (а не факта «песочницу открывали») — то, как шаг
 * «Песочница» узнаёт, что уже пройденная проверка устарела (Task A9.6,
 * `.plan`: «после изменения уже проверенных правил/знаний/класса модели
 * показать «Изменения не проверены»»).
 *
 * @param {WizardDraft} draft
 * @returns {string}
 */
export function getSandboxVerificationSignature(draft) {
  const fields = draft.fields ?? {};
  const sourceKeys = Object.keys(draft.resources?.sourceIdsByKey ?? {}).sort();

  return JSON.stringify({
    task: String(fields.task ?? "").trim(),
    style: fields.style ?? null,
    restrictions: String(fields.restrictions ?? "").trim(),
    noAnswerAction: fields.noAnswerAction ?? null,
    operatorHandoff: fields.operatorHandoff ?? null,
    modelClassId: fields.modelClassId ?? null,
    sourceKeys,
  });
}

/**
 * Проверка в песочнице устарела тогда и только тогда, когда она вообще
 * проводилась (`fields.sandboxVerifiedSignature` задана) и текущая подпись от
 * неё отличается. Ещё ни разу не проверенный draft — отдельное состояние
 * («ещё не тестировали»), не «устарело», поэтому здесь `false`.
 *
 * @param {WizardDraft} draft
 * @returns {boolean}
 */
export function isSandboxVerificationStale(draft) {
  const signature = draft.fields?.sandboxVerifiedSignature;

  return Boolean(signature) && signature !== getSandboxVerificationSignature(draft);
}

/**
 * Идентификаторы fixture-ресурсов, которые мастер создаёт по ходу draft'а —
 * агент, его личная коллекция знаний и добавленные в неё источники. Ссылки
 * хранятся отдельно от самих сущностей (те живут в `stores/agents.js` и
 * `stores/knowledge.js`), чтобы повтор шага/сабмита не заводил дубли:
 * `ensureAgent`/`ensureCollection`/`addKnowledgeSource` смотрят сюда прежде
 * чем создавать что-то новое.
 *
 * @typedef {Object} WizardDraftResources
 * @property {number | null} agentId
 * @property {number | null} collectionId
 * @property {Record<string, number>} sourceIdsByKey Ключ — стабильный
 *   идентификатор источника со стороны вызывающего UI (например, id формы
 *   добавления файла/ссылки/текста), значение — id уже созданного
 *   knowledge-объекта. Повтор `addKnowledgeSource` с тем же ключом (retry
 *   после ошибки сети-заглушки, двойной клик) возвращает существующий
 *   объект вместо создания второго.
 * @property {string | null} channelId Id fixture-канала Telegram, заведённого
 *   шагом «Telegram» (Task A9.7, `ensureTelegramChannel`) — как и
 *   `agentId`/`collectionId`, ссылка идемпотентна: повтор попытки
 *   подключения не заводит второй канал.
 * @property {number} nextSourceSequence Счётчик для `nextWizardSourceKey` —
 *   живёт в draft'е, а не в UI-компоненте: если бы `KnowledgeStep.vue` считал
 *   его сам (локальный `ref`), уход с шага «Знания» и возврат пересоздавал бы
 *   компонент и обнулял счётчик, из-за чего первый источник после возврата
 *   получал бы уже использованный ключ — `addKnowledgeSource` трактовала бы
 *   его как retry и молча возвращала старый объект вместо создания нового
 *   (Task A9.4 post-review fix).
 */

/**
 * @typedef {Object} WizardDraft
 * @property {string} id
 * @property {string} workspaceId Draft принадлежит ровно одному workspace —
 *   стор не даёт ни прочитать, ни продолжить его из другого пространства.
 * @property {WizardStepId} step
 * @property {"in_progress" | "completed"} status Отмена не переводит draft в
 *   отдельный статус — `cancelDraft` удаляет всю запись целиком
 *   (`draftsByWorkspace`), поэтому третьего значения ("cancelled") нет: его
 *   никто не устанавливает и не читает (post-review fix — тип раньше
 *   обещал больше, чем код делает).
 * @property {typeof WIZARD_LOCALES[number]} locale UI-язык экспертной зоны
 *   (Task A9.5) — не язык инструкции агента, см. `setLocale`.
 * @property {Record<string, unknown>} fields Общий bag для полей текущего и
 *   пройденных шагов — сохраняется при back/forward, чтобы вернуться на шаг
 *   назад не значило потерять введённое (Task A9.3 требование).
 * @property {WizardDraftResources} resources
 * @property {boolean} isFirstAgent Зафиксировано один раз в момент
 *   `createDraft` — не пересчитывается на каждый mount/смену пространства
 *   (`AgentWizard.vue`'s подсказки развёрнуты по умолчанию только для первого
 *   агента пространства). Пересчёт на лету ломался бы собственным ещё не
 *   завершённым агентом черновика: `ensureAgent`/`ensureTelegramChannel`
 *   заводят реальную запись в `useAgentsStore()` до завершения мастера, и
 *   «Сохранить черновик» с шага Telegram → повторный вход в тот же draft
 *   заставил бы пересчёт увидеть уже не ноль агентов и молча схлопнуть
 *   подсказки, хотя онбординг ещё не завершён (Task A9.3 post-review fix).
 */

/**
 * @typedef {Object} WizardActionResult
 * @property {boolean} ok
 * @property {string} [reason] Причина явного отказа — `"no_draft"`,
 *   `"invalid_step"`, `"at_first_step"`, `"at_last_step"`, `"no_collection"`.
 *   Каждое действие мастера (продолжение, новый draft, отмена, back/forward,
 *   невалидный шаг) возвращает такой явный результат, а не `undefined`/throw.
 */

let nextDraftSequence = 1;

/**
 * @param {string} workspaceId
 * @returns {WizardDraft}
 */
function createDraft(workspaceId) {
  return {
    id: `wizard-${workspaceId}-${nextDraftSequence++}`,
    workspaceId,
    step: WIZARD_STEPS[0],
    status: "in_progress",
    // Экспертная UI-локаль мастера (Task A9.5) — отдельно от `fields`, чтобы
    // ни один сброс/патч полей её не задевал; переключение locale, в свою
    // очередь, не трогает `fields` (см. `setLocale`).
    locale: DEFAULT_WIZARD_LOCALE,
    fields: {},
    resources: {
      agentId: null,
      collectionId: null,
      sourceIdsByKey: {},
      channelId: null,
      nextSourceSequence: 1,
    },
    // Снимок на момент создания, а не производное значение — см. typedef
    // `WizardDraft.isFirstAgent` выше.
    isFirstAgent: useAgentsStore().listByWorkspace(workspaceId).length === 0,
  };
}

/**
 * Изолированный in-memory store жизненного цикла мастера агента (Task
 * A9.1). Нет бэкенда, нет `localStorage` — состояние живёт только пока жив
 * Pinia-инстанс вкладки, поэтому reload естественным образом начинает с
 * чистых fixtures (ничего специально восстанавливать не нужно и не
 * планируется — см. риск «Прерывание мастера создаёт дубли и чужие связи» в
 * `.plan`).
 *
 * Один workspace — один активный draft: `draftsByWorkspace` не допускает
 * держать одновременно два незавершённых мастера в одном пространстве и не
 * путает draft/ресурсы разных пространств между собой.
 */
export const useWizardStore = defineStore("wizard", () => {
  /** @type {import("vue").Ref<Record<string, WizardDraft | undefined>>} */
  const draftsByWorkspace = ref({});

  /**
   * @param {string} workspaceId
   * @returns {WizardDraft | undefined}
   */
  function getDraft(workspaceId) {
    return draftsByWorkspace.value[workspaceId];
  }

  /**
   * Заводит новый draft для пространства, замещая прежний (если он был) —
   * явное действие «новый draft», отдельное от «продолжить». Ресурсы,
   * которые прежний draft уже успел создать (агент/коллекция/источники),
   * не удаляются: это состоявшиеся fixture-сущности, а не часть draft'а.
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { draft: WizardDraft }}
   */
  function startDraft(workspaceId) {
    const draft = createDraft(workspaceId);
    draftsByWorkspace.value[workspaceId] = draft;

    return { ok: true, draft };
  }

  /**
   * Продолжение существующего незавершённого draft'а. Явно отличает «есть
   * что продолжить» от «нечего продолжать» вместо того, чтобы полагаться на
   * `undefined` — вызывающий UI (Task A9.2) должен уметь отличить эти два
   * случая без собственной проверки на `status`.
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function continueDraft(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft || draft.status !== "in_progress") {
      return { ok: false, reason: "no_draft" };
    }

    return { ok: true, draft };
  }

  /**
   * Продолжает существующий draft (в любом статусе, включая уже
   * `completed`) или заводит новый, только если для пространства вообще нет
   * записи — используется точками входа (Task A9.2: «каждый вход открывает
   * тот же draft/шаг, а не отдельную форму») и route-watcher'ом
   * `AgentWizard.vue`. Раньше опиралась на `continueDraft` (только
   * `in_progress`) и тем самым тихо подменяла уже завершённый draft новым
   * при любом обращении после завершения — например, при обычном browser
   * back/forward с только что показанного review-экрана, а не только через
   * явное «Создать следующего агента» (`startNextAgent` в `ReviewStep.vue`,
   * единственное место, которое обязано завести новый draft поверх
   * завершённого, и делает это напрямую через `startDraft`, а не через эту
   * функцию). Post-review fix: без этого гвард «завершённый draft достижим
   * только на review» (`isStepReachable`) был бы бессмысленным — `ensureDraft`
   * успевал бы подменить завершённый draft свежим `in_progress` ещё до того,
   * как гвард вообще срабатывал.
   *
   * @param {string} workspaceId
   * @returns {WizardDraft}
   */
  function ensureDraft(workspaceId) {
    const existing = getDraft(workspaceId);

    return existing ?? startDraft(workspaceId).draft;
  }

  /**
   * Отмена draft'а. Идемпотентна и безопасна: не трогает уже созданные
   * агента/коллекцию/источники (это общие данные, не часть draft'а) и не
   * трогает завершённый (`completed`) draft — у него уже нет активного
   * состояния для отмены.
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult}
   */
  function cancelDraft(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft || draft.status !== "in_progress") {
      return { ok: false, reason: "no_draft" };
    }

    delete draftsByWorkspace.value[workspaceId];

    return { ok: true };
  }

  /**
   * Сливает поля текущего шага (и любых предыдущих) в общий bag draft'а —
   * back/forward не теряют введённое, потому что ничего не вычищают из
   * `fields` при смене `step`.
   *
   * @param {string} workspaceId
   * @param {Record<string, unknown>} patch
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function updateFields(workspaceId, patch) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    Object.assign(draft.fields, patch);

    return { ok: true, draft };
  }

  /**
   * Переключает UI-язык экспертной зоны мастера (Task A9.5). Невалидное
   * значение нормализуется к `DEFAULT_WIZARD_LOCALE`, а не отклоняется —
   * переключатель locale это `b-select` с фиксированным списком опций, так
   * что невалидное значение сюда может прийти только программной ошибкой, а
   * не действием пользователя. Не трогает `fields`/`resources` — требование
   * `.plan` «переключение ... locale не теряет draft».
   *
   * @param {string} workspaceId
   * @param {string} locale
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function setLocale(workspaceId, locale) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    draft.locale = normalizeWizardLocale(locale);

    return { ok: true, draft };
  }

  /**
   * Проставляет рекомендованный по сценарию класс модели (Task A9.5), если
   * пользователь ещё не выбрал класс сам — `fields.modelClassId` уже
   * заданное значение (в том числе рекомендованное на предыдущем вызове)
   * никогда не перезаписывается автоматически. Ограничивает рекомендацию
   * доступными по capability текущего workspace классами (`.plan` decision
   * 3: «единственный доступный класс» не должен получить рекомендацию,
   * которую нельзя выбрать).
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function ensureDefaultModelClass(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    if (draft.fields.modelClassId) {
      return { ok: true, draft };
    }

    const modelsStore = useModelsStore();
    const { allowedClassIds } = modelsStore.getCapabilityProfile(workspaceId);
    const recommended = getRecommendedModelClassId(draft.fields.scenarioId);

    draft.fields.modelClassId = allowedClassIds.includes(recommended)
      ? recommended
      : allowedClassIds[0];

    return { ok: true, draft };
  }

  /**
   * Переход на произвольный шаг по имени. Невалидное имя — явный отказ,
   * `step` draft'а не меняется (в отличие от молчаливого игнорирования).
   *
   * @param {string} workspaceId
   * @param {string} step
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function goToStep(workspaceId, step) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    if (!WIZARD_STEPS.includes(step)) {
      return { ok: false, reason: "invalid_step" };
    }

    draft.step = step;

    return { ok: true, draft };
  }

  /**
   * @param {string} workspaceId
   * @param {number} offset
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function stepByOffset(workspaceId, offset) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    const nextIndex = WIZARD_STEPS.indexOf(draft.step) + offset;

    if (nextIndex < 0) {
      return { ok: false, reason: "at_first_step" };
    }
    if (nextIndex >= WIZARD_STEPS.length) {
      return { ok: false, reason: "at_last_step" };
    }

    draft.step = WIZARD_STEPS[nextIndex];

    return { ok: true, draft };
  }

  /**
   * @param {string} workspaceId
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function goToNextStep(workspaceId) {
    return stepByOffset(workspaceId, 1);
  }

  /**
   * @param {string} workspaceId
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function goToPreviousStep(workspaceId) {
    return stepByOffset(workspaceId, -1);
  }

  /**
   * Идемпотентно создаёт агента для текущего draft'а: повторный вызов
   * (повтор шага, двойной submit) находит уже созданного агента по
   * запомненному `resources.agentId` вместо того, чтобы завести второго.
   * Если запомненный id больше не резолвится (fixture была стёрта извне),
   * ведёт себя как первый вызов — создаёт заново и перезаписывает ссылку.
   *
   * @param {string} workspaceId
   * @param {string} name
   * @returns {WizardActionResult & { agent?: import("./agents.js").Agent, created?: boolean }}
   */
  function ensureAgent(workspaceId, name) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    const agentsStore = useAgentsStore();

    if (draft.resources.agentId != null) {
      const existing = agentsStore.getAgent(workspaceId, draft.resources.agentId);

      if (existing) {
        return { ok: true, agent: existing, created: false };
      }
    }

    const agent = agentsStore.createAgent(workspaceId, name);
    draft.resources.agentId = agent.id;

    return { ok: true, agent, created: true };
  }

  /**
   * Идемпотентно создаёт личную коллекцию знаний агента — та же схема, что
   * `ensureAgent`. Мастер не даёт выбрать существующую коллекцию (Task
   * A9.4): у draft'а есть максимум одна собственная, связанная по ID.
   *
   * @param {string} workspaceId
   * @param {string} name
   * @returns {WizardActionResult & { collection?: import("./knowledge.js").KnowledgeCollection, created?: boolean }}
   */
  function ensureCollection(workspaceId, name) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    const knowledgeStore = useKnowledgeStore();

    if (draft.resources.collectionId != null) {
      const existing = knowledgeStore.getCollection(workspaceId, draft.resources.collectionId);

      if (existing) {
        return { ok: true, collection: existing, created: false };
      }
    }

    const collection = knowledgeStore.createCollection(workspaceId, {
      name,
      type: "mixed",
      autoNamed: true,
    });
    draft.resources.collectionId = collection.id;

    return { ok: true, collection, created: true };
  }

  /**
   * Идемпотентно создаёт агента (если он ещё не создан — прямой переход на
   * "telegram" мимо «Контекста» не должен падать на отсутствующем `agentId`,
   * см. `getWizardAgentName`) и fixture-канал Telegram для него (Task A9.7).
   * Та же схема повторного использования по запомненному id, что
   * `ensureAgent`/`ensureCollection`: повторный вызов (переоткрытие формы,
   * повтор попытки после ошибки) находит уже созданный канал вместо второго.
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { channel?: import("./channels.js").Channel, agent?: import("./agents.js").Agent }}
   */
  function ensureTelegramChannel(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    const agentResult = ensureAgent(workspaceId, getWizardAgentName(draft.fields));

    if (!agentResult.ok || !agentResult.agent) {
      return agentResult;
    }

    const channelsStore = useChannelsStore();

    if (draft.resources.channelId != null) {
      const existing = channelsStore
        .listByAgent(workspaceId, agentResult.agent.id)
        .find((item) => item.id === draft.resources.channelId);

      if (existing) {
        return { ok: true, channel: existing, agent: agentResult.agent };
      }
    }

    const channel = channelsStore.createChannel(workspaceId, agentResult.agent.id, {
      name: `Telegram — ${agentResult.agent.name}`,
    });
    draft.resources.channelId = channel.id;

    return { ok: true, channel, agent: agentResult.agent };
  }

  /**
   * Выдаёт новый уникальный на весь draft `sourceKey` для `addKnowledgeSource`.
   * Счётчик хранится в `draft.resources.nextSourceSequence`, а не в
   * UI-компоненте: `KnowledgeStep.vue` монтируется/размонтируется при каждом
   * переходе на соседний шаг мастера и обратно, и локальный счётчик обнулялся
   * бы при каждом таком возврате — тогда ключ первого источника после
   * возврата совпадал бы с уже использованным, и `addKnowledgeSource`
   * трактовала бы новый источник как повторный сабмит старого (Task A9.4
   * post-review fix).
   *
   * @param {string} workspaceId
   * @returns {string | null} `null`, если draft'а нет.
   */
  function nextWizardSourceKey(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return null;
    }

    const sequence = draft.resources.nextSourceSequence++;

    return `wizard-source-${draft.id}-${sequence}`;
  }

  /**
   * Идемпотентно добавляет источник в коллекцию draft'а по стабильному
   * `sourceKey` со стороны вызывающего UI (не по содержимому — два разных
   * источника могут называться одинаково). Требует уже созданной коллекции
   * (`ensureCollection`) — источники без коллекции создать некуда.
   *
   * @param {string} workspaceId
   * @param {string} sourceKey
   * @param {{ name: string, kind: import("./knowledge.js").KnowledgeObjectKind, size?: number, sourceLabel?: string }} input
   * @returns {WizardActionResult & { object?: import("./knowledge.js").KnowledgeObject, created?: boolean }}
   */
  function addKnowledgeSource(workspaceId, sourceKey, input) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    if (draft.resources.collectionId == null) {
      return { ok: false, reason: "no_collection" };
    }

    const knowledgeStore = useKnowledgeStore();
    const existingId = draft.resources.sourceIdsByKey[sourceKey];

    if (existingId != null) {
      const existing = knowledgeStore
        .getCollection(workspaceId, draft.resources.collectionId)
        ?.objects.find((object) => object.id === existingId);

      if (existing) {
        return { ok: true, object: existing, created: false };
      }
    }

    const object = knowledgeStore.addObject(workspaceId, draft.resources.collectionId, input);

    if (!object) {
      return { ok: false, reason: "no_collection" };
    }

    draft.resources.sourceIdsByKey[sourceKey] = object.id;

    return { ok: true, object, created: true };
  }

  /**
   * @param {string} workspaceId
   * @param {string} sourceKey
   */
  function removeKnowledgeSource(workspaceId, sourceKey) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    if (draft.resources.collectionId == null) {
      return { ok: false, reason: "no_collection" };
    }

    const objectId = draft.resources.sourceIdsByKey[sourceKey];

    if (objectId == null) {
      return { ok: false, reason: "no_source" };
    }

    const knowledgeStore = useKnowledgeStore();
    knowledgeStore.removeObject(workspaceId, draft.resources.collectionId, objectId);
    delete draft.resources.sourceIdsByKey[sourceKey];

    return { ok: true };
  }

  /**
   * Отмечает текущее состояние правил/знаний/класса модели как проверенное в
   * песочнице (Task A9.6) — сохраняет их подпись на момент проверки, а не
   * просто факт/время. Идемпотентна: повторный вызов с той же подписью ничего
   * не меняет по смыслу, повторный вызов после правки полей обновляет подпись
   * на актуальную (пользователь только что снова проверил именно её).
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function markSandboxVerified(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    draft.fields.sandboxVerifiedSignature = getSandboxVerificationSignature(draft);

    return { ok: true, draft };
  }

  /**
   * Помечает draft завершённым — созданные ресурсы остаются, но сам draft
   * больше не «продолжаемый» (`continueDraft`/`cancelDraft` на нём дальше
   * вернут явный `no_draft`).
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { draft?: WizardDraft }}
   */
  function completeDraft(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft || draft.status !== "in_progress") {
      return { ok: false, reason: "no_draft" };
    }

    draft.status = "completed";

    return { ok: true, draft };
  }

  /**
   * Применяет поля draft'а к его агенту (Task A9.8, шаг «Проверка и запуск»):
   * не-BYOK модель (точный выбор каталога из экспертной зоны —
   * `fields.modelId` — либо рекомендованная модель выбранного класса),
   * температура, финальная инструкция и BYOK-состояние. Идемпотентна как по
   * агенту (`ensureAgent`), так и по многократному вызову — повторная запись
   * тех же значений ничего не ломает. Не активирует ни один канал и не
   * трогает `agent.status` — это то, что различает «Сохранить без запуска» и
   * «Включить ответы в Telegram» (см. `saveDraftWithoutLaunch`/`launchAgent`
   * ниже).
   *
   * Если `fields.useOwnApiKey` включён, но ключ/модель ещё не выбраны,
   * `agentsStore.updateAgentSettings`'s собственный `isByokSaveValid` рубеж
   * отклонит именно BYOK-часть патча (агент вернётся без изменений) — тот же
   * защитный контракт, что `AgentSettings.vue` полагается для обычного
   * сохранения; вести отдельную copy этой проверки здесь незачем.
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { agent?: import("./agents.js").Agent }}
   */
  function finalizeAgentFields(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    const agentResult = ensureAgent(workspaceId, getWizardAgentName(draft.fields));

    if (!agentResult.ok || !agentResult.agent) {
      return agentResult;
    }

    const { fields } = draft;
    const modelsStore = useModelsStore();
    const recommendedModel = modelsStore.getRecommendedModelForClass(fields.modelClassId ?? "basic");

    const patch = {
      model: fields.modelId ?? recommendedModel?.id ?? agentResult.agent.model,
      temperature: fields.temperature ?? agentResult.agent.temperature,
      instructions: resolveWizardInstructions(fields),
      use_own_api_key: Boolean(fields.useOwnApiKey),
    };

    if (fields.useOwnApiKey) {
      patch.api_key_id = fields.apiKeyId ?? null;
      patch.byok_model = fields.byokModel ?? null;
      patch.provider_model_id = fields.providerModelId ?? null;
    }

    const agentsStore = useAgentsStore();
    const agent = agentsStore.updateAgentSettings(workspaceId, agentResult.agent.id, patch);

    return { ok: true, agent };
  }

  /**
   * «Сохранить без запуска» (Task A9.8, `.plan` шаг 7): применяет
   * сконфигурированные поля к агенту и завершает draft, но ни разу не трогает
   * канал — агент остаётся ровно в том lifecycle, в котором был (`draft`/
   * `ready`, см. `getAgentLifecycle` в `stores/agents.js`), а не «активен»
   * (acceptance S2: «Сохранение draft не включает ответы»).
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & { agent?: import("./agents.js").Agent }}
   */
  function saveDraftWithoutLaunch(workspaceId) {
    const result = finalizeAgentFields(workspaceId);

    if (!result.ok) {
      return result;
    }

    completeDraft(workspaceId);

    return result;
  }

  /**
   * «Включить ответы в Telegram» (Task A9.8, `.plan` шаг 7 и «Система
   * статусов» S2: «Активация: review → подтверждённый успех → активное
   * состояние»). Требует уже подтверждённый Telegram-канал (`providerIdentity`
   * заполнен шагом «Telegram», Task A9.7) — без него запуск явно отказывает
   * `"no_channel"` вместо того, чтобы создавать канал по догадке или включать
   * несуществующее подключение. Идемпотентна и retry-safe: `finalizeAgentFields`
   * и `channelsStore.activateChannel` сами не создают вторых сущностей, так что
   * повторный вызов после сетевой заглушки/повторного клика не дублирует канал
   * (acceptance: «retry не дублирует channel»). Возвращаемый `conflict`
   * (см. `channelsStore.activateChannel`) — тот же takeover-случай, что и
   * обычная активация канала вне мастера; сам мастер не создаёт `"displaced"`
   * каналов, но не скрывает эту ветку на случай, если внешнее состояние успело
   * измениться.
   *
   * @param {string} workspaceId
   * @returns {WizardActionResult & {
   *   agent?: import("./agents.js").Agent,
   *   channel?: import("./channels.js").Channel,
   *   conflict?: import("./channels.js").ActivationConflict,
   * }}
   */
  function launchAgent(workspaceId) {
    const draft = getDraft(workspaceId);

    if (!draft) {
      return { ok: false, reason: "no_draft" };
    }

    const { agentId, channelId } = draft.resources;
    const channelsStore = useChannelsStore();
    const channel = agentId != null && channelId != null
      ? channelsStore.listByAgent(workspaceId, agentId).find((item) => item.id === channelId)
      : undefined;

    if (!channel || !channel.providerIdentity) {
      return { ok: false, reason: "no_channel" };
    }

    const finalizeResult = finalizeAgentFields(workspaceId);

    if (!finalizeResult.ok || !finalizeResult.agent) {
      return finalizeResult;
    }

    const conflict = channelsStore.activateChannel(workspaceId, agentId, channelId);

    if (conflict) {
      return { ok: false, reason: "channel_conflict", conflict };
    }

    // Единственное место, где мастер включает ответы (acceptance: «ни одно
    // промежуточное действие не включает ответы») — тот же прямой
    // `agent.status =`, которым `AgentSettings.vue` уже управляет этим полем
    // (`<b-select v-model="agent.status">`), а не отдельный, задублированный
    // сеттер в `stores/agents.js`.
    finalizeResult.agent.status = "Активен";
    finalizeResult.agent.updated = "Сейчас";

    completeDraft(workspaceId);

    return { ok: true, agent: finalizeResult.agent, channel };
  }

  return {
    draftsByWorkspace,
    getDraft,
    startDraft,
    continueDraft,
    ensureDraft,
    cancelDraft,
    updateFields,
    setLocale,
    ensureDefaultModelClass,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    ensureAgent,
    ensureCollection,
    ensureTelegramChannel,
    nextWizardSourceKey,
    addKnowledgeSource,
    removeKnowledgeSource,
    markSandboxVerified,
    completeDraft,
    finalizeAgentFields,
    saveDraftWithoutLaunch,
    launchAgent,
  };
});
