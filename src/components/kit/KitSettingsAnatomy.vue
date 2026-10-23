<template>
  <!--
    Канонический референс Settings/property anatomy (Task S2-05, Issue #22):
    одно и то же редактирование имени и описания в трёх host'ах — inline
    `.tr-settings__panel`, короткая Buefy-модалка и существующий `FormDrawer`.
    Общий слой — `tr-settings__section*` и `tr-property*`; рамки, геометрия и
    жизненный цикл остаются у host'а. Сохранение — fixture state, без autosave,
    без валидации/CAS/RBAC пакета; подписи принадлежат consumer'у (B1).
  -->
  <section class="tr-card mb-5" data-testid="settings-anatomy">
    <h2 class="tr-card__title">Settings / property anatomy</h2>
    <p class="tr-muted mb-4">
      Три host'а с общим ритмом строк свойств. Состояния переключаются здесь;
      сохранение не происходит автоматически и повторная отправка во время
      busy блокируется.
    </p>

    <div class="tr-stack mb-4">
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

    <p class="tr-muted mb-3" data-testid="anatomy-status">
      Сохранений: {{ saveCount }} · значение: «{{ saved.name }}»
    </p>

    <!-- Host 1: inline Settings -->
    <div class="tr-settings__panel mb-5" data-testid="host-inline">
      <div class="tr-form">
        <section class="tr-settings__section">
          <header class="tr-settings__section-header">
            <div>
              <h3 class="tr-settings__section-title">{{ copy.title }}</h3>
              <p class="tr-settings__section-subtitle">{{ copy.subtitle }}</p>
            </div>
            <div class="tr-settings__section-actions">
              <b-button
                v-if="canEdit && !inlineEditing"
                size="is-small"
                data-testid="inline-edit"
                @click="startInline"
              >
                {{ copy.edit }}
              </b-button>
            </div>
          </header>

          <b-message v-if="notice" :type="notice.type" :closable="false" data-testid="inline-notice">
            {{ notice.text }}
          </b-message>

          <SettingsRows
            :copy="copy"
            :draft="inlineDraft"
            id-prefix="anatomy-inline"
            :id-value="ID_VALUE"
            :editable="inlineEditing && canEdit"
            :busy="isBusy"
            :name-error="inlineNameError"
            :extra-rows="extraRows"
          />

          <footer v-if="inlineEditing && canEdit" class="tr-form__footer">
            <b-button
              type="is-primary"
              :loading="isBusy"
              :disabled="isBusy || conflictOpen"
              data-testid="inline-save"
              @click="save('inline')"
            >
              {{ copy.save }}
            </b-button>
            <b-button :disabled="isBusy" @click="cancelInline">{{ copy.cancel }}</b-button>
          </footer>
        </section>
      </div>
    </div>

    <div class="tr-row mb-2">
      <b-button data-testid="open-modal" @click="openModal">{{ copy.openModal }}</b-button>
      <b-button data-testid="open-drawer" @click="openDrawer">{{ copy.openDrawer }}</b-button>
    </div>

    <!-- Host 2: short Buefy modal -->
    <b-modal v-model="isModalOpen" has-modal-card :can-cancel="!isBusy">
      <form class="modal-card" novalidate data-testid="host-modal" @submit.prevent="save('modal')">
        <header class="modal-card-head">
          <p class="modal-card-title">{{ copy.title }}</p>
          <button
            class="delete"
            type="button"
            :aria-label="copy.close"
            :disabled="isBusy"
            @click="isModalOpen = false"
          />
        </header>
        <section class="modal-card-body">
          <section class="tr-settings__section">
            <header class="tr-settings__section-header">
              <p class="tr-settings__section-subtitle">{{ copy.subtitle }}</p>
            </header>
            <b-message v-if="notice" :type="notice.type" :closable="false">{{ notice.text }}</b-message>
            <SettingsRows
              :copy="copy"
              :draft="modalDraft"
              id-prefix="anatomy-modal"
              :id-value="ID_VALUE"
              :editable="canEdit"
              :busy="isBusy"
              :name-error="modalNameError"
              :extra-rows="extraRows"
            />
          </section>
        </section>
        <footer class="modal-card-foot">
          <b-button :disabled="isBusy" @click="isModalOpen = false">{{ copy.cancel }}</b-button>
          <b-button
            v-if="canEdit"
            type="is-primary"
            native-type="submit"
            :loading="isBusy"
            :disabled="isBusy || conflictOpen"
          >
            {{ copy.save }}
          </b-button>
        </footer>
      </form>
    </b-modal>

    <!-- Host 3: existing FormDrawer (native mode) -->
    <FormDrawer
      v-model="isDrawerOpen"
      :title="copy.title"
      :close-aria-label="copy.close"
      :busy="isBusy"
      @submit="save('drawer')"
    >
      <section class="tr-settings__section" data-testid="host-drawer">
        <header class="tr-settings__section-header">
          <p class="tr-settings__section-subtitle">{{ copy.subtitle }}</p>
        </header>
        <b-message v-if="notice" :type="notice.type" :closable="false">{{ notice.text }}</b-message>
        <SettingsRows
          :copy="copy"
          :draft="drawerDraft"
          id-prefix="anatomy-drawer"
          :id-value="ID_VALUE"
          :editable="canEdit"
          :busy="isBusy"
          :name-error="drawerNameError"
          :extra-rows="extraRows"
        />
      </section>
      <template #footer="{ busy, requestClose }">
        <b-button class="mr-2" :disabled="busy" @click="requestClose('programmatic')">
          {{ copy.cancel }}
        </b-button>
        <b-button
          v-if="canEdit"
          type="is-primary"
          native-type="submit"
          :loading="busy"
          :disabled="busy || conflictOpen"
        >
          {{ copy.save }}
        </b-button>
      </template>
    </FormDrawer>

    <div v-if="conflictOpen" class="tr-row mt-3" data-testid="conflict-actions">
      <b-button size="is-small" data-testid="conflict-reload" @click="resolveConflict('reload')">
        {{ copy.reload }}
      </b-button>
      <b-button size="is-small" type="is-primary" data-testid="conflict-keep" @click="resolveConflict('keep')">
        {{ copy.keepMine }}
      </b-button>
    </div>
  </section>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from "vue";

import { FormDrawer } from "@iam3xtr/vue";
import SettingsRows from "./KitSettingsPropertyRows.vue";

const VARIANTS = ["view", "edit", "readonly", "busy", "error", "conflict", "no-permission", "long-rows"];
const EDITING_VARIANTS = ["edit", "busy", "error", "conflict", "long-rows"];
const LANGS = ["ru", "en", "es"];
const ID_VALUE = "workspace-7f3a";

const COPY = {
  ru: {
    title: "Свойства пространства",
    subtitle: "Название и описание.",
    id: "Идентификатор",
    name: "Название",
    description: "Описание",
    edit: "Изменить",
    save: "Сохранить",
    cancel: "Отмена",
    close: "Закрыть",
    openModal: "Открыть в модалке",
    openDrawer: "Открыть в панели",
    required: "Укажите название",
    readonly: "Только чтение.",
    denied: "Нет прав на изменение.",
    saveError: "Не удалось сохранить. Данные не изменены.",
    conflict: "Значение изменено в другом месте.",
    reload: "Перечитать",
    keepMine: "Оставить мой вариант",
    extra: ["Создано", "Владелец", "Регион", "Тариф", "Лимиты", "Домен", "Интеграция", "Журнал"],
    longValue: "ОченьДлинноеЗначениеБезПробеловКоторое".repeat(4),
    initial: { name: "Основное пространство", description: "Рабочее пространство команды." },
  },
  en: {
    title: "Workspace properties",
    subtitle: "Name and description.",
    id: "Identifier",
    name: "Name",
    description: "Description",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    openModal: "Open in modal",
    openDrawer: "Open in drawer",
    required: "Enter a name",
    readonly: "Read only.",
    denied: "You cannot change this.",
    saveError: "Could not save. Nothing was changed.",
    conflict: "The value was changed elsewhere.",
    reload: "Reload",
    keepMine: "Keep my version",
    extra: ["Created", "Owner", "Region", "Plan", "Limits", "Domain", "Integration", "Audit log"],
    longValue: "AVeryLongUnbrokenValueWithoutAnySpaces".repeat(4),
    initial: { name: "Main workspace", description: "The team workspace." },
  },
  es: {
    title: "Propiedades del espacio",
    subtitle: "Nombre y descripción.",
    id: "Identificador",
    name: "Nombre",
    description: "Descripción",
    edit: "Editar",
    save: "Guardar",
    cancel: "Cancelar",
    close: "Cerrar",
    openModal: "Abrir en modal",
    openDrawer: "Abrir en panel",
    required: "Introduce un nombre",
    readonly: "Solo lectura.",
    denied: "No puedes cambiar esto.",
    saveError: "No se pudo guardar. No se cambió nada.",
    conflict: "El valor se cambió en otro lugar.",
    reload: "Recargar",
    keepMine: "Mantener mi versión",
    extra: ["Creado", "Propietario", "Región", "Plan", "Límites", "Dominio", "Integración", "Registro"],
    longValue: "UnValorMuyLargoSinEspaciosQueDebeAjustarse".repeat(4),
    initial: { name: "Espacio principal", description: "El espacio del equipo." },
  },
};

const variant = ref("view");
const lang = ref("ru");
const copy = computed(() => COPY[lang.value]);

const saved = reactive({ ...COPY.ru.initial });
const saveCount = ref(0);
const savingHost = ref(null);
const conflictResolved = ref(false);
const saveFailed = ref(false);
const inlineEditing = ref(false);
const isModalOpen = ref(false);
const isDrawerOpen = ref(false);
const submitted = reactive({ inline: false, modal: false, drawer: false });

const drafts = {
  inline: reactive({ ...saved }),
  modal: reactive({ ...saved }),
  drawer: reactive({ ...saved }),
};
const { inline: inlineDraft, modal: modalDraft, drawer: drawerDraft } = drafts;

const canEdit = computed(() => !["readonly", "no-permission"].includes(variant.value));
const isBusy = computed(() => variant.value === "busy" || savingHost.value !== null);
const conflictOpen = computed(() => variant.value === "conflict" && !conflictResolved.value);

const extraRows = computed(() => {
  if (variant.value !== "long-rows") return [];
  return copy.value.extra.map((label, index) => ({
    key: `row-${index}`,
    label,
    value: index === 0 ? copy.value.longValue : `${label} 0${index}`,
  }));
});

const notice = computed(() => {
  if (variant.value === "readonly") return { type: "is-info", text: copy.value.readonly };
  if (variant.value === "no-permission") return { type: "is-info", text: copy.value.denied };
  if (conflictOpen.value) return { type: "is-warning", text: copy.value.conflict };
  if (variant.value === "error" && saveFailed.value) {
    return { type: "is-danger", text: copy.value.saveError };
  }
  return null;
});

const nameErrorFor = (host) =>
  submitted[host] && !drafts[host].name.trim() ? copy.value.required : "";
const inlineNameError = computed(() => nameErrorFor("inline"));
const modalNameError = computed(() => nameErrorFor("modal"));
const drawerNameError = computed(() => nameErrorFor("drawer"));

function resetDraft(host) {
  Object.assign(drafts[host], saved);
  submitted[host] = false;
}

function startInline() {
  resetDraft("inline");
  inlineEditing.value = true;
}

function cancelInline() {
  if (isBusy.value) return;
  inlineEditing.value = false;
  resetDraft("inline");
}

function openModal() {
  resetDraft("modal");
  isModalOpen.value = true;
}

function openDrawer() {
  resetDraft("drawer");
  isDrawerOpen.value = true;
}

let timerId = null;

// No autosave: only an explicit submit gets here. A duplicate submit is
// dropped while a save is in flight, busy is forced, the conflict is
// unresolved or the value is read-only.
function save(host) {
  if (!canEdit.value || isBusy.value || conflictOpen.value) return;
  submitted[host] = true;
  if (!drafts[host].name.trim()) return;
  if (variant.value === "error") {
    saveFailed.value = true;
    return;
  }
  savingHost.value = host;
  timerId = setTimeout(() => {
    timerId = null;
    Object.assign(saved, drafts[host]);
    saveCount.value += 1;
    savingHost.value = null;
    if (host === "inline") inlineEditing.value = false;
    if (host === "modal") isModalOpen.value = false;
    if (host === "drawer") isDrawerOpen.value = false;
  }, 300);
}

function resolveConflict(choice) {
  if (choice === "reload") {
    saved.name = `${saved.name} *`;
    for (const host of Object.keys(drafts)) resetDraft(host);
  }
  conflictResolved.value = true;
}

// A variant or language change resets the fixture so pending state, errors
// and the conflict never leak between scenarios.
watch(
  [variant, lang],
  ([nextVariant, nextLang], [prevVariant, prevLang]) => {
    clearTimeout(timerId);
    timerId = null;
    savingHost.value = null;
    conflictResolved.value = false;
    saveFailed.value = false;
    if (nextLang !== prevLang) {
      Object.assign(saved, COPY[nextLang].initial);
      saveCount.value = 0;
    }
    for (const host of Object.keys(drafts)) resetDraft(host);
    inlineEditing.value = nextVariant !== prevVariant && EDITING_VARIANTS.includes(nextVariant);
  },
  { flush: "sync" },
);

onUnmounted(() => clearTimeout(timerId));
</script>
