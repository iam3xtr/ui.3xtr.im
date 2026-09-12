<template>
  <div class="tr-wizard-step">
    <h2 class="tr-card__title">Подключите Telegram</h2>

    <WizardHint :expanded="hintsExpanded">
      <template #compact>
        Подключение бота — отдельный шаг от включения ответов клиентам.
      </template>
      Найдите бота или создайте нового — это только связывает Telegram-бота с
      агентом. Ответы клиентам включаются отдельным явным действием на
      следующем шаге, так что пока вы разбираетесь с ботом, никто уже не
      получает сообщений. Этот шаг можно отложить: агент останется в
      черновике, а вернуться к подключению можно в любой момент.
    </WizardHint>

    <div class="tr-wizard-scenario-grid tr-wizard-telegram-methods">
      <section class="tr-card tr-wizard-telegram-method">
        <header class="tr-row tr-row--between">
          <strong>Способ 1 · Быстрое подключение</strong>
          <b-tag type="is-warning is-light">Демо-макет</b-tag>
        </header>
        <p class="tr-muted">
          В реальной интеграции QR на компьютере и кнопка «Открыть Telegram»
          на телефоне ведут к созданию managed-бота через Telegram: бот
          принадлежит рабочему пространству, а привязка результата к этому
          черновику подтверждается в Telegram, а не сканированием само по
          себе. Пока протокол этой привязки не согласован (см.
          <code>docs/design-system.md</code>), способ показан только как
          макет — не выполняет создание бота и не может завершиться успехом.
        </p>

        <div class="tr-wizard-telegram-qr" aria-hidden="true">
          <b-icon icon="qrcode" size="is-large" />
        </div>
        <p class="tr-muted tr-wizard-telegram-qr__caption">
          Макет для проверки геометрии — не рабочий код создания бота, не
          содержит секретов и не означает подключение.
        </p>

        <b-button class="tr-wizard-telegram-open-mobile" expanded disabled>
          Открыть Telegram
        </b-button>

        <ul class="tr-wizard-telegram-states">
          <li>Ожидание действия в Telegram — до подтверждения ничего не подключено.</li>
          <li>Отмена или возврат без результата — черновик не меняется.</li>
          <li>Истёкшая сессия привязки — свойство сессии сервиса, не самой ссылки.</li>
        </ul>

        <p class="tr-wizard-telegram-fallback">
          <b-icon icon="arrow-down" size="is-small" />
          Способ недоступен — используйте вариант ниже.
        </p>
      </section>

      <section class="tr-card tr-wizard-telegram-method">
        <header class="tr-row tr-row--between">
          <strong>Способ 2 · Через BotFather</strong>
          <b-tag type="is-success is-light">Официальный fallback</b-tag>
        </header>

        <template v-if="stage === 'choose'">
          <p class="tr-muted">
            Создайте нового бота через официального <strong>@BotFather</strong>
            или подключите уже существующего — токен нужен в обоих случаях,
            владельцу существующего бота заново создавать его не нужно.
          </p>
          <div class="tr-row tr-wizard-source-add__actions">
            <b-button icon-left="robot-outline" @click="openForm('create')">
              Создать нового бота
            </b-button>
            <b-button icon-left="swap-horizontal" @click="openForm('existing')">
              Подключить существующего бота
            </b-button>
          </div>
        </template>

        <template v-else-if="stage === 'form'">
          <ol class="tr-wizard-telegram-steps">
            <li>Откройте <strong>@BotFather</strong> в Telegram.</li>
            <li v-if="mode === 'create'">Отправьте <code>/newbot</code> и следуйте шагам — в конце придёт токен.</li>
            <li v-else>Откройте своего бота в <code>/mybots</code> → API Token — скопируйте его.</li>
            <li>Вставьте токен ниже, чтобы связать бота с этим агентом.</li>
          </ol>

          <b-field
            label="Токен бота"
            :message="tokenFieldMessage"
          >
            <b-input
              v-model="tokenInput"
              type="password"
              password-reveal
              placeholder="123456:AAExampleTelegramBotToken"
            />
          </b-field>

          <div class="tr-row">
            <b-button
              type="is-primary"
              :disabled="!tokenInput.trim()"
              :loading="stage === 'form' && checking"
              @click="submitToken"
            >
              Проверить токен
            </b-button>
            <b-button @click="backToChoose">Назад</b-button>
          </div>
        </template>

        <template v-else-if="stage === 'checking'">
          <p class="tr-row">
            <Loader size="inline" />
            Проверяем токен…
          </p>
        </template>

        <template v-else-if="stage === 'error'">
          <b-message type="is-danger" :closable="false">
            {{ errorMessage }}
          </b-message>
          <div class="tr-row">
            <b-button icon-left="reload" @click="stage = 'form'">Попробовать снова</b-button>
            <b-button @click="backToChoose">Назад</b-button>
          </div>
        </template>

        <template v-else-if="stage === 'confirm'">
          <b-notification type="is-info is-light" :closable="false">
            <p>Бот найден: <strong>{{ pendingIdentity?.username }}</strong></p>
            <p class="tr-muted">
              Подтвердите, что это тот бот, который должен отвечать за этого
              агента. Ответы клиентам пока не включены — это отдельный шаг.
            </p>
          </b-notification>
          <div class="tr-row">
            <b-button type="is-primary" icon-left="check" @click="confirmConnection">
              Подтвердить подключение
            </b-button>
            <b-button @click="backToChoose">Ввести другой токен</b-button>
          </div>
        </template>

        <template v-else-if="stage === 'connected'">
          <b-notification type="is-success is-light" :closable="false">
            <p>
              <b-icon icon="check-circle-outline" size="is-small" />
              Бот <strong>{{ channel?.providerIdentity }}</strong> подключён.
            </p>
            <p class="tr-muted">
              Ответы клиентам ещё не включены — включите их на шаге «Проверка и запуск».
            </p>
          </b-notification>
          <b-button @click="reconnect">Подключить другой аккаунт</b-button>
        </template>
      </section>
    </div>

    <div class="tr-row mt-4">
      <b-button icon-left="clock-outline" @click="connectLater">
        Подключить позже
      </b-button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { classifyTelegramToken, useWizardStore } from "../../../../stores/wizard";
import { buildTelegramIdentity, useChannelsStore } from "../../../../stores/channels";
import WizardHint from "../WizardHint.vue";
import Loader from "../../../common/Loader.vue";

// Шаг «Telegram» (Task A9.7, `.plan` шаг 6 «Telegram и вариант QR»). T1
// («Способ 1») рендерится как явно обозначенный демо-макет — QR/«Открыть
// Telegram» существуют только чтобы показать геометрию и перечисленные
// `.plan`'ом состояния, но не выполняют подключение: до согласования
// протокола привязки Telegram-пользователя/результата к draft'у (внешние
// Issues #114–#118) реального managed-bot API в ките и продукте нет. T2
// («Способ 2») — единственный рабочий путь: fixture-проверка токена через
// `classifyTelegramToken` (без сети) и отдельное подтверждение личности бота
// перед тем, как канал получит `providerIdentity` — см. `.plan`: «После
// проверки показать имя/@username и отдельное подтверждение выбранного
// подключения». Ни один путь не переводит канал в `"active"` — это Task
// A9.8's явное «Включить ответы в Telegram».
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
const channelsStore = useChannelsStore();

const workspaceId = computed(() => props.draft.workspaceId);

/** @type {import("vue").Ref<"choose" | "form" | "checking" | "error" | "confirm" | "connected">} */
const stage = ref("choose");
const mode = ref("create");
const tokenInput = ref("");
const errorMessage = ref("");
const pendingIdentity = ref(null);
const checking = ref(false);
// Id таймера проверки токена (post-review fix) — не реактивный ref: только
// `onBeforeUnmount` читает/сбрасывает его, чтобы отменить отложенный
// callback при уходе со шага до истечения паузы.
let pendingCheckTimeoutId = null;

const channel = computed(() => {
  const { agentId, channelId } = props.draft.resources;

  if (agentId == null || channelId == null) {
    return undefined;
  }

  return channelsStore.listByAgent(workspaceId.value, agentId).find((item) => item.id === channelId);
});

// Уже подключённый в предыдущем визите канал (back/forward, повторный вход)
// сразу показывает итоговое состояние вместо формы выбора способа.
if (channel.value?.providerIdentity) {
  stage.value = "connected";
}

const tokenFieldMessage = computed(() =>
  mode.value === "existing"
    ? "Токен уже существующего бота — создавать нового не нужно."
    : "Токен, который прислал @BotFather после создания бота.");

function openForm(nextMode) {
  mode.value = nextMode;
  tokenInput.value = "";
  errorMessage.value = "";
  stage.value = "form";
}

function backToChoose() {
  const { agentId, channelId } = props.draft.resources;

  if (agentId != null && channelId != null) {
    channelsStore.resetChannelStatus(workspaceId.value, agentId, channelId);
  }

  tokenInput.value = "";
  errorMessage.value = "";
  pendingIdentity.value = null;
  stage.value = "choose";
}

function submitToken() {
  const token = tokenInput.value.trim();

  if (!token) {
    return;
  }

  const result = wizardStore.ensureTelegramChannel(workspaceId.value);

  if (!result.ok || !result.channel) {
    return;
  }

  const { agent, channel: attemptChannel } = result;
  channelsStore.startChannelCheck(workspaceId.value, agent.id, attemptChannel.id);
  stage.value = "checking";
  checking.value = true;

  const classification = classifyTelegramToken(token);

  // Небольшая пауза отличает «отправлено» от «проверено» — тот же приём, что
  // `SandboxStep.vue`'s демо-ответ. В отличие от `KnowledgeStep.vue`'s
  // `scheduleSettle` таймер здесь сохраняется и явно отменяется в
  // `onBeforeUnmount` (post-review fix): без этого отменённая/покинутая до
  // истечения паузы попытка всё равно записывала бы invalid/conflict-токен в
  // "error" уже после того, как onBeforeUnmount аккуратно откатил канал в
  // "inactive" — отменённый выбор пользователя тихо переживал бы отмену.
  pendingCheckTimeoutId = setTimeout(() => {
    pendingCheckTimeoutId = null;
    checking.value = false;

    if (classification === "invalid") {
      channelsStore.failChannelCheck(
        workspaceId.value,
        agent.id,
        attemptChannel.id,
        "Неверный токен бота — проверьте, что скопировали его полностью из BotFather.",
      );
      errorMessage.value = "Неверный токен бота — проверьте, что скопировали его полностью из BotFather.";
      stage.value = "error";
      return;
    }

    if (classification === "conflict") {
      channelsStore.failChannelCheck(
        workspaceId.value,
        agent.id,
        attemptChannel.id,
        "Этот бот уже подключён в другом рабочем пространстве.",
      );
      errorMessage.value = "Этот бот уже подключён в другом рабочем пространстве — подключите другого бота "
        + "или обратитесь к владельцу текущего подключения.";
      stage.value = "error";
      return;
    }

    // Подтверждение личности — отдельное явное действие (`confirmConnection`),
    // канал остаётся в `"checking"` до него: успешная проверка токена сама по
    // себе не означает подключение (acceptance A9.7).
    pendingIdentity.value = buildTelegramIdentity(mode.value === "existing" ? token : agent.name);
    stage.value = "confirm";
  }, 500);
}

function confirmConnection() {
  const { agentId, channelId } = props.draft.resources;

  if (agentId == null || channelId == null || !pendingIdentity.value) {
    return;
  }

  channelsStore.confirmChannelIdentity(workspaceId.value, agentId, channelId, pendingIdentity.value);
  pendingIdentity.value = null;
  stage.value = "connected";
}

function reconnect() {
  backToChoose();
}

/**
 * «Подключить позже» (acceptance A9.7): не удаляет draft ни уже созданные
 * fixture-ресурсы — просто продолжает мастер дальше, тем же прямым переходом,
 * что `SandboxStep.vue`'s «Изменить правила»/«Изменить знания».
 */
function connectLater() {
  emit("go-to-step", "review");
}

/**
 * Незавершённая T2-проверка не должна пережить уход со шага, пока канал ещё
 * в `"checking"` — иначе он остаётся зависшим без явного подтверждения и без
 * ошибки, а обычный экран каналов не предлагает для него никакого действия.
 * "Подключить позже", «Назад»/«Отменить» из `AgentWizard.vue` и просто уход
 * на другой шаг размонтируют этот компонент, не вызывая ни
 * `confirmConnection`, ни `backToChoose` — этот хук покрывает все такие
 * выходы разом, откатывая канал туда же, куда `backToChoose` (post-review
 * fix, Task A9.7). Уже подтверждённый канал (`status` давно не `"checking"`)
 * не трогается.
 *
 * Таймер `submitToken` отменяется здесь же и первым делом (post-review
 * fix) — иначе он мог бы сработать уже после этого отката и заново
 * записать invalid/conflict-токен в `"error"` поверх только что
 * восстановленного `"inactive"`, переживая отмену/уход пользователя.
 */
onBeforeUnmount(() => {
  if (pendingCheckTimeoutId != null) {
    clearTimeout(pendingCheckTimeoutId);
    pendingCheckTimeoutId = null;
  }

  const { agentId, channelId } = props.draft.resources;

  if (agentId == null || channelId == null) {
    return;
  }

  if (channelsStore.listByAgent(workspaceId.value, agentId)
    .find((item) => item.id === channelId)?.status === "checking") {
    channelsStore.resetChannelStatus(workspaceId.value, agentId, channelId);
  }
});
</script>
