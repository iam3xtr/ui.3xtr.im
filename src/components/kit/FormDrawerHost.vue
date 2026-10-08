<template>
  <!--
    Рабочий host FormDrawer (Issue #17): динамический demo-сценарий поверх
    публичного API `@iam3xtr/vue` — native и shell режимы, ширина по умолчанию
    и `42rem`, локализованное имя кнопки закрытия, busy/disabled, async
    `beforeClose` с подтверждением dirty draft и запретом закрытия во время
    «загрузки». Presentation-only: сохранение — fixture state, не API.
  -->
  <section class="tr-card mb-5" data-testid="form-drawer-host">
    <h2 class="tr-card__title">Host FormDrawer</h2>
    <p class="tr-muted mb-4">
      Единый путь закрытия: Escape, клик по фону, кнопка в шапке и «Отмена»
      проходят через <code>beforeClose(reason)</code>. Отказ или незавершённый
      guard оставляют панель и draft на месте; фокус возвращается только после
      разрешённого закрытия.
    </p>

    <div class="tr-stack mb-4">
      <b-field label="Режим формы">
        <b-radio-button v-model="mode" native-value="native" size="is-small">
          native
        </b-radio-button>
        <b-radio-button v-model="mode" native-value="shell" size="is-small">
          shell + vee-validate
        </b-radio-button>
      </b-field>
      <b-field label="Ширина">
        <b-radio-button v-model="widthMode" native-value="default" size="is-small">
          по умолчанию (420px)
        </b-radio-button>
        <b-radio-button v-model="widthMode" native-value="wide" size="is-small">
          42rem
        </b-radio-button>
      </b-field>
      <b-field label="Язык подписей">
        <b-radio-button v-model="lang" native-value="ru" size="is-small">ru</b-radio-button>
        <b-radio-button v-model="lang" native-value="en" size="is-small">en</b-radio-button>
        <b-radio-button v-model="lang" native-value="es" size="is-small">es</b-radio-button>
      </b-field>
      <div class="tr-row">
        <b-switch v-model="isLongLabels">Длинные подписи</b-switch>
        <b-switch v-model="isBusy">busy</b-switch>
        <b-switch v-model="isDisabled">disabled</b-switch>
        <b-switch v-model="isUploading">Идёт загрузка (закрытие запрещено)</b-switch>
      </div>
    </div>

    <b-button type="is-primary" @click="openHost">Открыть host-форму</b-button>
    <p class="tr-muted mt-2" data-testid="host-status">
      Отправок: {{ submitCount }} · последняя причина закрытия:
      {{ lastCloseReason ?? "—" }}
    </p>

    <div class="mt-5" data-testid="host-style-primitives">
      <h3 class="tr-card__subtitle">Совместимость стилей host-форм</h3>
      <p class="tr-muted mb-3">
        Для форм со своей разметкой подписи и ошибки (например,
        <code>ErrorMessage</code> из vee-validate) и для сводных таблиц внутри
        панели: <code>tr-field__required</code>, <code>tr-field__error</code>,
        <code>table is-borderless</code>.
      </p>
      <div class="tr-stack mb-3">
        <label class="label" for="host-style-name">
          {{ copy.name }} <span class="tr-field__required" aria-hidden="true">*</span>
        </label>
        <input id="host-style-name" class="input" type="text" value="" />
        <p class="tr-field__error" role="alert">{{ copy.required }}</p>
      </div>
      <table class="table is-fullwidth is-borderless" data-testid="host-style-table">
        <tbody>
          <tr>
            <th scope="row">{{ copy.name }}</th>
            <td>{{ initialValues.name }}</td>
          </tr>
          <tr>
            <th scope="row">{{ copy.note }}</th>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormDrawer
      ref="drawerRef"
      v-model="isOpen"
      :shell="mode === 'shell'"
      :title="copy.title"
      :close-aria-label="copy.close"
      :width="widthMode === 'wide' ? '42rem' : undefined"
      :busy="isBusy"
      :disabled="isDisabled"
      :before-close="beforeClose"
      @submit="handleNativeSubmit"
    >
      <template v-if="mode === 'shell'" #shell="{ content: DrawerContent }">
        <Form
          ref="formRef"
          :key="formKey"
          :initial-values="initialValues"
          @submit="handleShellSubmit"
        >
          <component :is="DrawerContent" />
        </Form>
      </template>

      <div class="tr-stack">
        <template v-if="mode === 'shell'">
          <Field v-slot="{ componentField, errorMessage }" name="name" :rules="validateName">
            <b-field
              :label="copy.name"
              :type="errorMessage ? 'is-danger' : undefined"
              :message="errorMessage"
            >
              <b-input v-bind="componentField" />
            </b-field>
          </Field>
          <Field v-slot="{ componentField }" name="note">
            <b-field :label="copy.note">
              <b-input v-bind="componentField" type="textarea" rows="8" />
            </b-field>
          </Field>
        </template>
        <template v-else>
          <b-field
            :label="copy.name"
            :type="nativeError ? 'is-danger' : undefined"
            :message="nativeError"
          >
            <b-input v-model="nativeFields.name" />
          </b-field>
          <b-field :label="copy.note">
            <b-input v-model="nativeFields.note" type="textarea" rows="8" />
          </b-field>
        </template>
      </div>

      <template #footer="{ busy, disabled, requestClose }">
        <b-button class="mr-2" @click="requestClose('programmatic')">
          {{ copy.cancel }}
        </b-button>
        <b-button
          type="is-primary"
          native-type="submit"
          :loading="busy"
          :disabled="busy || disabled"
        >
          {{ copy.save }}
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
import { computed, onUnmounted, reactive, ref } from "vue";
import { Field, Form } from "vee-validate";

import { FormDrawer } from "@iam3xtr/vue";
import DirtyExitModal from "../common/DirtyExitModal.vue";
import { useToasterStore } from "../../stores/toaster";

const toaster = useToasterStore();

const COPY = {
  ru: {
    title: "Участник рабочего пространства",
    close: "Закрыть панель",
    name: "Имя участника",
    note: "Заметка",
    cancel: "Отмена",
    save: "Сохранить",
    required: "Укажите имя",
    saved: "Участник сохранён",
  },
  en: {
    title: "Workspace member",
    close: "Close panel",
    name: "Member name",
    note: "Note",
    cancel: "Cancel",
    save: "Save",
    required: "Enter a name",
    saved: "Member saved",
  },
  es: {
    title: "Miembro del espacio de trabajo",
    close: "Cerrar panel",
    name: "Nombre del miembro",
    note: "Nota",
    cancel: "Cancelar",
    save: "Guardar",
    required: "Introduce un nombre",
    saved: "Miembro guardado",
  },
};
const LONG_SUFFIX = {
  ru: " с очень длинной подписью, которая должна переноситься, а не обрезаться",
  en: " with a very long label that must wrap instead of being clipped",
  es: " con una etiqueta muy larga que debe ajustarse en lugar de cortarse",
};

const mode = ref("native");
const widthMode = ref("default");
const lang = ref("ru");
const isLongLabels = ref(false);
const isBusy = ref(false);
const isDisabled = ref(false);
const isUploading = ref(false);

const isOpen = ref(false);
const drawerRef = ref(null);
const formRef = ref(null);
const formKey = ref(0);
const submitCount = ref(0);
const lastCloseReason = ref(null);

const copy = computed(() => {
  const base = COPY[lang.value];
  if (!isLongLabels.value) return base;
  return {
    ...base,
    title: base.title + LONG_SUFFIX[lang.value],
    name: base.name + LONG_SUFFIX[lang.value],
    note: base.note + LONG_SUFFIX[lang.value],
  };
});

const initialValues = { name: "Анна Смирнова", note: "" };
const nativeFields = reactive({ ...initialValues });
let nativeSnapshot = JSON.stringify(nativeFields);

const nativeError = ref(null);
const validateName = (value) =>
  value && String(value).trim() ? true : COPY[lang.value].required;

function isDirty() {
  if (mode.value === "shell") return !!formRef.value?.meta?.dirty;
  return JSON.stringify(nativeFields) !== nativeSnapshot;
}

function openHost() {
  Object.assign(nativeFields, initialValues);
  nativeSnapshot = JSON.stringify(nativeFields);
  nativeError.value = null;
  formKey.value += 1;
  isOpen.value = true;
}

// Async close guard shared by every user-initiated close path. `false`
// keeps the drawer open and the draft intact; a pending confirmation makes
// further close requests join it (FormDrawer deduplicates them).
let resolveConfirm = null;
const isConfirmActive = ref(false);

function beforeClose(reason) {
  lastCloseReason.value = reason;
  if (isUploading.value) return false;
  if (!isDirty()) return true;
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

function confirmStay() {
  settleConfirm(false);
}

function confirmDiscard() {
  settleConfirm(true);
}

async function confirmSave() {
  settleConfirm(false);
  if (mode.value === "shell") {
    const { valid } = (await formRef.value?.validate()) ?? { valid: false };
    if (valid) save();
  } else {
    handleNativeSubmit();
  }
}

let saveTimerId = null;

function save() {
  if (saveTimerId) return;
  isBusy.value = true;
  saveTimerId = setTimeout(() => {
    saveTimerId = null;
    isBusy.value = false;
    submitCount.value += 1;
    isOpen.value = false;
    toaster.success(COPY[lang.value].saved);
  }, 600);
}

function handleNativeSubmit() {
  if (!nativeFields.name.trim()) {
    nativeError.value = COPY[lang.value].required;
    return;
  }
  nativeError.value = null;
  save();
}

// vee-validate calls this only for a valid form, so validation is not
// duplicated here.
function handleShellSubmit() {
  save();
}

onUnmounted(() => {
  if (saveTimerId) clearTimeout(saveTimerId);
  resolveConfirm?.(false);
});

defineExpose({ drawerRef });
</script>
