<template>
  <!--
    Референс высокой формы Telegram-канала в существующем FormDrawer (Task
    S2-08, Issue #17): одна логическая форма в native и shell (vee-validate)
    режимах. Механика drawer (beforeClose, фокус, scroll lock, ширина) —
    публичный API `@iam3xtr/vue`, здесь не переопределяется. Вложенные секции
    без своего Save; отдельная операция показана явно независимой. Токен
    write-only: значение не отображается и не логируется. Сохранение — fixture
    state, не API и не атомарный multi-PATCH; подписи принадлежат consumer'у.
  -->
  <section class="tr-card mb-5" data-testid="telegram-drawer-reference">
    <h2 class="tr-card__title">Telegram-канал: высокая форма в drawer</h2>
    <p class="tr-muted mb-4">
      Одна форма с одним submit: в view она только для чтения, в edit один draft
      с Save и Cancel, в create одно действие Create. Прокручивается только тело
      панели, шапка и футер остаются в экране.
    </p>

    <div class="tr-stack mb-4">
      <b-field label="Сценарий">
        <b-radio-button
          v-for="item in KINDS"
          :key="item"
          v-model="kind"
          :native-value="item"
          size="is-small"
        >
          {{ item }}
        </b-radio-button>
      </b-field>
      <b-field label="Состояние">
        <b-radio-button
          v-for="item in VARIANTS"
          :key="item"
          v-model="variant"
          :native-value="item"
          size="is-small"
        >
          {{ item }}
        </b-radio-button>
      </b-field>
      <b-field label="Режим формы">
        <b-radio-button v-model="mode" native-value="native" size="is-small">
          native
        </b-radio-button>
        <b-radio-button v-model="mode" native-value="shell" size="is-small">
          shell + vee-validate
        </b-radio-button>
      </b-field>
      <b-field label="Язык подписей">
        <b-radio-button
          v-for="code in LANGS"
          :key="code"
          v-model="lang"
          :native-value="code"
          size="is-small"
        >
          {{ code }}
        </b-radio-button>
      </b-field>
    </div>

    <b-button type="is-primary" data-testid="telegram-open" @click="openDrawer">
      Открыть форму канала
    </b-button>
    <p class="tr-muted mt-2" data-testid="telegram-status">
      Сохранений: {{ submitCount }} · отдельных операций: {{ independentCount }} ·
      причина закрытия: {{ lastCloseReason ?? "—" }}
    </p>

    <FormDrawer
      v-model="isOpen"
      :shell="mode === 'shell'"
      :title="current === 'create' ? copy.titleCreate : copy.title"
      :close-aria-label="copy.close"
      width="36rem"
      :busy="isBusy"
      :before-close="beforeClose"
      @submit="handleNativeSubmit"
    >
      <template v-if="mode === 'shell'" #shell="{ content: DrawerContent }">
        <Form
          ref="formRef"
          :key="formKey"
          :initial-values="{ name: draft.name, token: '' }"
          @submit="handleShellSubmit"
        >
          <component :is="DrawerContent" />
        </Form>
      </template>

      <div class="tr-stack" data-testid="telegram-body">
        <b-message v-if="errorText" type="is-danger" :closable="false" role="alert">
          {{ errorText }}
        </b-message>
        <b-message v-if="notice" :type="notice.type" :closable="false">
          {{ notice.text }}
        </b-message>

        <section class="tr-settings__section">
          <header class="tr-settings__section-header">
            <div>
              <h3 class="tr-settings__section-title">{{ copy.sectionBasic }}</h3>
              <p class="tr-settings__section-subtitle">{{ copy.sectionBasicHint }}</p>
            </div>
          </header>

          <dl v-if="!editable" class="tr-property-list">
            <div class="tr-property tr-property--readonly">
              <dt class="tr-property__label">{{ copy.provider }}</dt>
              <dd class="tr-property__value">Telegram</dd>
            </div>
            <div class="tr-property tr-property--readonly">
              <dt class="tr-property__label">{{ copy.name }}</dt>
              <dd class="tr-property__value">{{ draft.name }}</dd>
            </div>
            <div class="tr-property tr-property--readonly">
              <dt class="tr-property__label">{{ copy.token }}</dt>
              <dd class="tr-property__value" data-testid="telegram-token-state">
                {{ copy.tokenStored }}
              </dd>
            </div>
          </dl>

          <div v-else class="tr-stack">
            <b-field :label="copy.provider">
              <b-select disabled expanded>
                <option>Telegram</option>
              </b-select>
            </b-field>

            <Field
              v-if="mode === 'shell'"
              v-slot="{ field, errorMessage }"
              name="name"
              :rules="validateName"
            >
              <b-field
                :label="copy.name"
                :type="errorMessage ? 'is-danger' : undefined"
                :message="errorMessage"
              >
                <input
                  v-bind="field"
                  class="input"
                  type="text"
                  autocomplete="off"
                  @input="draft.name = $event.target.value"
                />
              </b-field>
            </Field>
            <b-field
              v-else
              :label="copy.name"
              :type="errors.name ? 'is-danger' : undefined"
              :message="errors.name"
            >
              <b-input v-model="draft.name" autocomplete="off" />
            </b-field>

            <Field
              v-if="mode === 'shell'"
              v-slot="{ field, errorMessage }"
              name="token"
              :rules="validateToken"
            >
              <b-field
                :label="tokenLabel"
                :type="errorMessage ? 'is-danger' : undefined"
                :message="errorMessage || tokenHint"
              >
                <input
                  v-bind="field"
                  class="input"
                  type="password"
                  autocomplete="new-password"
                  @input="draft.token = $event.target.value"
                />
              </b-field>
            </Field>
            <b-field
              v-else
              :label="tokenLabel"
              :type="errors.token ? 'is-danger' : undefined"
              :message="errors.token || tokenHint"
            >
              <b-input v-model="draft.token" type="password" autocomplete="new-password" />
            </b-field>
          </div>
        </section>

        <section class="tr-settings__section">
          <header class="tr-settings__section-header">
            <div>
              <h3 class="tr-settings__section-title">{{ copy.sectionChats }}</h3>
              <p class="tr-settings__section-subtitle">{{ copy.sectionChatsHint }}</p>
            </div>
          </header>

          <dl v-if="!editable" class="tr-property-list">
            <div class="tr-property tr-property--readonly">
              <dt class="tr-property__label">{{ copy.chatKind }}</dt>
              <dd class="tr-property__value">{{ copy.kinds[draft.chatKind] }}</dd>
            </div>
            <div class="tr-property tr-property--readonly">
              <dt class="tr-property__label">{{ copy.mentionOnly }}</dt>
              <dd class="tr-property__value">{{ draft.mentionOnly ? copy.yes : copy.no }}</dd>
            </div>
          </dl>
          <div v-else class="tr-stack">
            <b-field :label="copy.chatKind">
              <b-select v-model="draft.chatKind" expanded>
                <option value="private">{{ copy.kinds.private }}</option>
                <option value="group">{{ copy.kinds.group }}</option>
              </b-select>
            </b-field>
            <b-switch v-model="draft.mentionOnly" :disabled="draft.chatKind !== 'group'">
              {{ copy.mentionOnly }}
            </b-switch>
            <b-message type="is-warning" :closable="false">{{ copy.groupWarning }}</b-message>
          </div>
        </section>

        <section class="tr-settings__section">
          <header class="tr-settings__section-header">
            <div>
              <h3 class="tr-settings__section-title">{{ copy.sectionMessages }}</h3>
              <p class="tr-settings__section-subtitle">{{ copy.sectionMessagesHint }}</p>
            </div>
          </header>

          <dl v-if="!editable" class="tr-property-list">
            <div class="tr-property tr-property--readonly">
              <dt class="tr-property__label">{{ copy.welcome }}</dt>
              <dd class="tr-property__value">{{ welcomePreview }}</dd>
            </div>
            <div class="tr-property tr-property--readonly">
              <dt class="tr-property__label">{{ copy.fallback }}</dt>
              <dd class="tr-property__value">{{ draft.fallback || "—" }}</dd>
            </div>
          </dl>
          <div v-else class="tr-stack">
            <b-checkbox v-model="draft.useDefaultWelcome">{{ copy.useDefault }}</b-checkbox>
            <b-field :label="copy.welcome">
              <b-input
                v-model="draft.welcome"
                type="textarea"
                rows="6"
                :disabled="draft.useDefaultWelcome"
                :placeholder="copy.inheritedWelcome"
              />
            </b-field>
            <p class="tr-muted" data-testid="telegram-inherited">
              {{ copy.inheritedLabel }}: {{ copy.inheritedWelcome }}
            </p>
            <div class="tr-row">
              <b-button
                size="is-small"
                native-type="button"
                data-testid="telegram-reset-welcome"
                @click="resetWelcome"
              >
                {{ copy.resetWelcome }}
              </b-button>
            </div>
            <b-field :label="copy.fallback">
              <b-input v-model="draft.fallback" type="textarea" rows="6" />
            </b-field>
          </div>
        </section>

        <section class="tr-settings__section" data-testid="telegram-independent">
          <header class="tr-settings__section-header">
            <div>
              <h3 class="tr-settings__section-title">{{ copy.sectionWebhook }}</h3>
              <p class="tr-settings__section-subtitle">{{ copy.sectionWebhookHint }}</p>
            </div>
            <div class="tr-settings__section-actions">
              <b-button
                size="is-small"
                native-type="button"
                :disabled="isBusy || current === 'create'"
                data-testid="telegram-webhook"
                @click="runIndependent"
              >
                {{ copy.webhook }}
              </b-button>
            </div>
          </header>
        </section>
      </div>

      <template #footer="{ busy, requestClose }">
        <b-button class="mr-2" native-type="button" @click="requestClose('programmatic')">
          {{ editable ? copy.cancel : copy.closeAction }}
        </b-button>
        <b-button
          v-if="current === 'view' && canEdit"
          type="is-primary"
          native-type="button"
          data-testid="telegram-edit"
          @click="startEdit"
        >
          {{ copy.edit }}
        </b-button>
        <b-button
          v-if="editable"
          type="is-primary"
          native-type="submit"
          :loading="busy"
          :disabled="busy"
          data-testid="telegram-submit"
        >
          {{ current === "create" ? copy.create : copy.save }}
        </b-button>
      </template>
    </FormDrawer>

    <DirtyExitModal
      :active="isConfirmActive"
      @save="confirmSave"
      @discard="confirmDiscard"
      @stay="confirmStay"
    />
  </section>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import { Field, Form } from "vee-validate";

import { FormDrawer } from "@iam3xtr/vue";
import DirtyExitModal from "../common/DirtyExitModal.vue";

const KINDS = ["view", "edit", "create"];
const VARIANTS = ["normal", "readonly", "busy", "error"];
const LANGS = ["ru", "en", "es"];

const COPY = {
  ru: {
    title: "Канал Telegram",
    titleCreate: "Новый канал Telegram",
    close: "Закрыть панель",
    provider: "Провайдер",
    name: "Название",
    token: "Токен бота",
    tokenReplace: "Заменить токен бота",
    tokenStored: "Сохранён, значение не отображается",
    tokenHintEdit: "Оставьте пустым, чтобы не менять текущий токен.",
    tokenHintCreate: "Токен нельзя будет просмотреть после сохранения.",
    tokenRequired: "Укажите токен",
    required: "Укажите название",
    sectionBasic: "Основное",
    sectionBasicHint: "Название и доступ бота.",
    sectionChats: "Чаты",
    sectionChatsHint: "Где бот отвечает.",
    sectionMessages: "Сообщения",
    sectionMessagesHint: "Приветствие и ответ по умолчанию.",
    sectionWebhook: "Webhook",
    sectionWebhookHint: "Отдельная операция: не входит в сохранение формы.",
    webhook: "Перерегистрировать webhook",
    chatKind: "Тип чатов",
    kinds: { private: "Личные чаты", group: "Группы" },
    mentionOnly: "Отвечать только на упоминание",
    yes: "Да",
    no: "Нет",
    groupWarning: "В группах бот видит сообщения только если разрешено в настройках Telegram.",
    welcome: "Приветствие",
    useDefault: "Использовать значение по умолчанию",
    inheritedLabel: "Унаследовано",
    inheritedWelcome: "Здравствуйте! Чем можем помочь?",
    resetWelcome: "Сбросить к значению по умолчанию",
    fallback: "Ответ вне рабочего времени",
    cancel: "Отмена",
    closeAction: "Закрыть",
    edit: "Изменить",
    save: "Сохранить",
    create: "Создать",
    readonly: "Только чтение: изменять канал нельзя.",
    activeWarning: "Канал активен. Замена токена не отключит его автоматически.",
    saveError:
      "Не удалось сохранить канал. Telegram не принял запрос, поэтому данные не изменены; повторите отправку позже или проверьте токен, права бота и доступность webhook-адреса.",
    initial: {
      name: "Основной бот поддержки",
      welcome: "Добро пожаловать в поддержку.",
      fallback: "Мы ответим в рабочее время.",
    },
  },
  en: {
    title: "Telegram channel",
    titleCreate: "New Telegram channel",
    close: "Close panel",
    provider: "Provider",
    name: "Name",
    token: "Bot token",
    tokenReplace: "Replace bot token",
    tokenStored: "Stored, the value is not shown",
    tokenHintEdit: "Leave empty to keep the current token.",
    tokenHintCreate: "The token cannot be viewed after saving.",
    tokenRequired: "Enter a token",
    required: "Enter a name",
    sectionBasic: "General",
    sectionBasicHint: "Bot name and access.",
    sectionChats: "Chats",
    sectionChatsHint: "Where the bot replies.",
    sectionMessages: "Messages",
    sectionMessagesHint: "Welcome and default replies.",
    sectionWebhook: "Webhook",
    sectionWebhookHint: "A separate operation: it is not part of saving the form.",
    webhook: "Re-register webhook",
    chatKind: "Chat type",
    kinds: { private: "Private chats", group: "Groups" },
    mentionOnly: "Reply only when mentioned",
    yes: "Yes",
    no: "No",
    groupWarning: "In groups the bot sees messages only if Telegram settings allow it.",
    welcome: "Welcome message",
    useDefault: "Use the default value",
    inheritedLabel: "Inherited",
    inheritedWelcome: "Hello! How can we help?",
    resetWelcome: "Reset to default",
    fallback: "Out-of-hours reply",
    cancel: "Cancel",
    closeAction: "Close",
    edit: "Edit",
    save: "Save",
    create: "Create",
    readonly: "Read only: this channel cannot be changed.",
    activeWarning: "The channel is active. Replacing the token will not disable it.",
    saveError:
      "Could not save the channel. Telegram rejected the request, so nothing was changed; try again later or check the token, bot permissions and webhook address availability.",
    initial: {
      name: "Main support bot",
      welcome: "Welcome to support.",
      fallback: "We will reply during working hours.",
    },
  },
  es: {
    title: "Canal de Telegram",
    titleCreate: "Nuevo canal de Telegram",
    close: "Cerrar panel",
    provider: "Proveedor",
    name: "Nombre",
    token: "Token del bot",
    tokenReplace: "Sustituir el token del bot",
    tokenStored: "Guardado, el valor no se muestra",
    tokenHintEdit: "Déjalo vacío para conservar el token actual.",
    tokenHintCreate: "El token no se podrá ver después de guardar.",
    tokenRequired: "Introduce un token",
    required: "Introduce un nombre",
    sectionBasic: "General",
    sectionBasicHint: "Nombre y acceso del bot.",
    sectionChats: "Chats",
    sectionChatsHint: "Dónde responde el bot.",
    sectionMessages: "Mensajes",
    sectionMessagesHint: "Bienvenida y respuestas por defecto.",
    sectionWebhook: "Webhook",
    sectionWebhookHint: "Una operación aparte: no forma parte de guardar el formulario.",
    webhook: "Registrar de nuevo el webhook",
    chatKind: "Tipo de chat",
    kinds: { private: "Chats privados", group: "Grupos" },
    mentionOnly: "Responder solo si lo mencionan",
    yes: "Sí",
    no: "No",
    groupWarning: "En grupos el bot solo ve mensajes si la configuración de Telegram lo permite.",
    welcome: "Mensaje de bienvenida",
    useDefault: "Usar el valor por defecto",
    inheritedLabel: "Heredado",
    inheritedWelcome: "¡Hola! ¿En qué podemos ayudarte?",
    resetWelcome: "Restablecer al valor por defecto",
    fallback: "Respuesta fuera de horario",
    cancel: "Cancelar",
    closeAction: "Cerrar",
    edit: "Editar",
    save: "Guardar",
    create: "Crear",
    readonly: "Solo lectura: este canal no se puede cambiar.",
    activeWarning: "El canal está activo. Sustituir el token no lo desactivará.",
    saveError:
      "No se pudo guardar el canal. Telegram rechazó la solicitud, por lo que no se cambió nada; inténtalo más tarde o revisa el token, los permisos del bot y la disponibilidad de la dirección del webhook.",
    initial: {
      name: "Bot de soporte principal",
      welcome: "Bienvenido al soporte.",
      fallback: "Responderemos en horario laboral.",
    },
  },
};

const kind = ref("view");
const variant = ref("normal");
const mode = ref("native");
const lang = ref("ru");
const copy = computed(() => COPY[lang.value]);

const isOpen = ref(false);
// Live scenario of the open drawer: View can switch to Edit in place.
const current = ref("view");
const formRef = ref(null);
const formKey = ref(0);
const submitCount = ref(0);
const independentCount = ref(0);
const lastCloseReason = ref(null);

const blankDraft = () => ({
  name: "",
  token: "",
  chatKind: "private",
  mentionOnly: false,
  useDefaultWelcome: true,
  welcome: "",
  fallback: "",
});

const savedFor = (code) => ({
  name: COPY[code].initial.name,
  token: "",
  chatKind: "group",
  mentionOnly: true,
  useDefaultWelcome: false,
  welcome: COPY[code].initial.welcome,
  fallback: COPY[code].initial.fallback,
});

const saved = reactive(savedFor("ru"));
const draft = reactive(blankDraft());
const errors = reactive({ name: "", token: "" });
const errorText = ref("");
const saving = ref(false);
let snapshot = JSON.stringify(draft);
let attempts = 0;

const canEdit = computed(() => variant.value !== "readonly");
const editable = computed(() => canEdit.value && current.value !== "view");
const isBusy = computed(() => variant.value === "busy" || saving.value);
const notice = computed(() => {
  if (!canEdit.value) return { type: "is-info", text: copy.value.readonly };
  if (current.value === "edit") return { type: "is-warning", text: copy.value.activeWarning };
  return null;
});
const tokenLabel = computed(() => (current.value === "create" ? copy.value.token : copy.value.tokenReplace));
const tokenHint = computed(() =>
  current.value === "create" ? copy.value.tokenHintCreate : copy.value.tokenHintEdit,
);
const welcomePreview = computed(() =>
  draft.useDefaultWelcome ? `${copy.value.inheritedWelcome} (${copy.value.inheritedLabel})` : draft.welcome || "—",
);

const validateName = (value) => (value && String(value).trim() ? true : copy.value.required);
const validateToken = (value) =>
  current.value !== "create" || (value && String(value).trim()) ? true : copy.value.tokenRequired;

function isDirty() {
  return JSON.stringify(draft) !== snapshot;
}

function loadDraft(source) {
  Object.assign(draft, source);
  snapshot = JSON.stringify(draft);
  errors.name = "";
  errors.token = "";
  errorText.value = "";
  attempts = 0;
  formKey.value += 1;
}

function openDrawer() {
  current.value = kind.value;
  loadDraft(kind.value === "create" ? blankDraft() : { ...saved });
  isOpen.value = true;
}

function startEdit() {
  current.value = "edit";
  loadDraft({ ...saved });
}

function resetWelcome() {
  draft.useDefaultWelcome = true;
  draft.welcome = "";
}

// Independent operation: its own transaction, never part of Save.
function runIndependent() {
  if (isBusy.value || current.value === "create") return;
  independentCount.value += 1;
}

let resolveConfirm = null;
const isConfirmActive = ref(false);

// Denied while a save is in flight; a dirty draft needs an explicit decision.
function beforeClose(reason) {
  lastCloseReason.value = reason;
  if (saving.value) return false;
  if (!editable.value || !isDirty()) return true;
  return new Promise((resolve) => {
    resolveConfirm = resolve;
    isConfirmActive.value = true;
  });
}

function settleConfirm(allowed) {
  isConfirmActive.value = false;
  const resolve = resolveConfirm;
  resolveConfirm = null;
  resolve?.(allowed);
}

// Buefy Modal drops `html.is-clipped` on close although the drawer still
// holds the page scroll lock; restore it while the drawer stays open.
watch(
  [isConfirmActive, isOpen],
  ([confirming, open]) => {
    if (open && !confirming) document.documentElement.classList.add("is-clipped");
  },
  { flush: "post" },
);

const confirmStay = () => settleConfirm(false);
const confirmDiscard = () => settleConfirm(true);

async function confirmSave() {
  if (isBusy.value) return;
  settleConfirm(false);
  if (mode.value === "shell") {
    const { valid } = (await formRef.value?.validate()) ?? { valid: false };
    if (valid) save();
  } else {
    handleNativeSubmit();
  }
}

let timerId = null;

// The single submit gate for both modes: busy, read-only and a pending
// save drop a duplicate submit. The first attempt of the `error` scenario
// fails deterministically; the retry succeeds and keeps the draft meanwhile.
function save() {
  if (isBusy.value || !editable.value || timerId) return;
  saving.value = true;
  errorText.value = "";
  timerId = setTimeout(() => {
    timerId = null;
    saving.value = false;
    if (variant.value === "error" && attempts === 0) {
      attempts += 1;
      errorText.value = copy.value.saveError;
      return;
    }
    Object.assign(saved, draft, { token: "" });
    draft.token = "";
    submitCount.value += 1;
    isOpen.value = false;
  }, 600);
}

function handleNativeSubmit() {
  errors.name = draft.name.trim() ? "" : copy.value.required;
  errors.token = current.value === "create" && !draft.token.trim() ? copy.value.tokenRequired : "";
  if (errors.name || errors.token) return;
  save();
}

// vee-validate calls this only for a valid form.
function handleShellSubmit() {
  save();
}

// A scenario, state or language change drops any pending outcome so it
// never leaks between scenarios.
watch(
  [kind, variant, lang, mode],
  ([, , nextLang], [, , prevLang]) => {
    clearTimeout(timerId);
    timerId = null;
    saving.value = false;
    attempts = 0;
    errorText.value = "";
    if (nextLang !== prevLang) Object.assign(saved, savedFor(nextLang));
  },
  { flush: "sync" },
);

onUnmounted(() => {
  clearTimeout(timerId);
  resolveConfirm?.(false);
});
</script>
