<template>
  <div class="tr-wizard-expert">
    <button
      type="button"
      class="tr-wizard-expert__toggle"
      :aria-expanded="expanded ? 'true' : 'false'"
      aria-controls="wizard-expert-panel"
      @click="expanded = !expanded"
    >
      {{ expanded ? t.expertToggle.hide : t.expertToggle.show }}
    </button>

    <div v-if="expanded" id="wizard-expert-panel" class="tr-wizard-expert__panel">
      <div class="tr-row tr-row--between">
        <div>
          <h3 class="tr-card__title">{{ t.expertPanel.title }}</h3>
          <p class="tr-muted">{{ t.expertPanel.subtitle }}</p>
        </div>

        <b-field :label="t.expertPanel.localeLabel" class="tr-wizard-expert__locale">
          <b-select :model-value="locale" size="is-small" @update:model-value="onLocaleChange">
            <option v-for="option in localeOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </b-select>
        </b-field>
      </div>

      <b-message v-if="capabilityConflict" type="is-warning" :closable="false">
        {{ t.capability.downgradeWarning }}
      </b-message>

      <div class="tr-form">
        <b-field :label="t.temperature.label" :message="t.temperature.help">
          <b-slider
            :model-value="fields.temperature ?? 0.4"
            :min="0"
            :max="1"
            :step="0.1"
            @update:model-value="(value) => update({ temperature: value })"
          />
        </b-field>

        <b-field
          :label="t.instruction.title"
          :message="instructionMode === 'template' ? t.instruction.templateNote : undefined"
        >
          <b-input
            :model-value="instructionText"
            type="textarea"
            rows="4"
            :readonly="instructionMode === 'template'"
            :placeholder="t.instruction.customPlaceholder"
            @update:model-value="onInstructionInput"
          />
        </b-field>

        <div class="tr-row">
          <b-button v-if="instructionMode === 'template'" size="is-small" @click="switchToCustom">
            {{ t.instruction.useCustomToggle }}
          </b-button>
          <b-button v-else size="is-small" @click="confirmRevertToTemplate">
            {{ t.instruction.useTemplateToggle }}
          </b-button>
        </div>
      </div>

      <div class="tr-form">
        <b-field v-if="capability.allowExpertCatalog" :label="t.catalog.title">
          <ModelSelect v-model="modelId" />
        </b-field>
        <p v-else class="tr-muted">{{ t.catalog.unavailable }}</p>
      </div>

      <div class="tr-form">
        <b-field v-if="capability.allowByok">
          <b-switch v-model="useOwnApiKey">
            {{ t.byok.toggleLabel }}
          </b-switch>
        </b-field>
        <p v-else class="tr-muted">{{ t.byok.unavailable }}</p>

        <template v-if="capability.allowByok && fields.useOwnApiKey">
          <b-field :label="t.byok.modelLabel">
            <ModelSelect
              v-model="byokModel"
              v-model:provider-model-id="providerModelId"
              :use-own-api-key="true"
            />
          </b-field>
          <b-field :label="t.byok.keyLabel">
            <ApiKeySelect v-model="apiKeyId" />
          </b-field>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useModalStore } from "../../../stores/modal";
import { useModelsStore } from "../../../stores/models";
import { useWizardStore, generateInstructionTemplate, WIZARD_LOCALES } from "../../../stores/wizard";
import { getWizardDictionary } from "../../../locales/wizard";
import ModelSelect from "../ModelSelect.vue";
import ApiKeySelect from "../ApiKeySelect.vue";

// Экспертная зона мастера (Task A9.5, `.plan` "Основной и экспертный режимы,
// модели и тарифы"): единственная вторичная ссылка «Расширенные параметры»
// раскрывает температуру, системную инструкцию, точную модель каталога и
// BYOK — не даёт новых прав относительно того, что позволяет
// `modelsStore.getCapabilityProfile(workspaceId)` для текущего workspace, и
// не требует raw model id на основном пути (тот остаётся в `RulesStep.vue`'s
// «Класс модели»). Получает весь `draft`, а не только `fields`, потому что
// ей нужны `workspaceId` (capability) и `locale` (scoped-словарь).
const props = defineProps({
  draft: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update"]);

const wizardStore = useWizardStore();
const modelsStore = useModelsStore();
const modalStore = useModalStore();

const workspaceId = computed(() => props.draft.workspaceId);
const fields = computed(() => props.draft.fields);
const locale = computed(() => props.draft.locale);
const t = computed(() => getWizardDictionary(locale.value));

const localeOptions = [
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

// Развёрнута по умолчанию свёрнута — вторичная ссылка, малозаметная
// относительно CTA шагов (`.plan` решение 1). Не часть `draft.fields`:
// свернуть/развернуть панель — чисто UI-состояние текущего визита на шаг, а
// не то, что нужно пережить back/forward (в отличие от самих значений полей
// внутри неё, которые как раз в `fields` и переживают).
const expanded = ref(false);

const capability = computed(() => modelsStore.getCapabilityProfile(workspaceId.value));

/**
 * Downgrade/capability change (`.plan` решение 4): текущий выбор мог стать
 * недоступен на тарифе workspace (класс не входит в `allowedClassIds`, BYOK
 * включён без права на него, либо выбрана точная модель без права на
 * каталог). Ничего не сбрасывается автоматически — только предупреждение;
 * выбор допустимого варианта остаётся действием пользователя.
 */
const capabilityConflict = computed(() => {
  const { allowedClassIds, allowByok, allowExpertCatalog } = capability.value;

  if (fields.value.modelClassId && !allowedClassIds.includes(fields.value.modelClassId)) {
    return true;
  }
  if (fields.value.useOwnApiKey && !allowByok) {
    return true;
  }
  if (fields.value.modelId && !allowExpertCatalog) {
    return true;
  }

  return false;
});

/**
 * Writable computeds — thin `fields.<key>` ↔ `update({ <key>: value })`
 * bridges so `ModelSelect`/`ApiKeySelect`/`b-switch` can bind via plain
 * `v-model` (same shape `ModelSelect` itself expects, see
 * `AgentSettings.vue`), while every actual write still goes through the
 * single `update()` → `emit("update")` → `wizardStore.updateFields` path.
 */
const modelId = computed({
  get: () => fields.value.modelId ?? null,
  set: (value) => update({ modelId: value }),
});
const useOwnApiKey = computed({
  get: () => Boolean(fields.value.useOwnApiKey),
  set: (value) => update({ useOwnApiKey: value }),
});
const byokModel = computed({
  get: () => fields.value.byokModel ?? null,
  set: (value) => update({ byokModel: value }),
});
const providerModelId = computed({
  get: () => fields.value.providerModelId ?? null,
  set: (value) => update({ providerModelId: value }),
});
const apiKeyId = computed({
  get: () => fields.value.apiKeyId ?? null,
  set: (value) => update({ apiKeyId: value }),
});

const instructionMode = computed(() => fields.value.instructionMode ?? "template");
const instructionTemplate = computed(() => generateInstructionTemplate(fields.value));
const instructionText = computed(
  () => (instructionMode.value === "custom" ? fields.value.instructionOverride ?? "" : instructionTemplate.value),
);

function update(patch) {
  emit("update", patch);
}

function onLocaleChange(value) {
  if (!WIZARD_LOCALES.includes(value)) {
    return;
  }
  wizardStore.setLocale(workspaceId.value, value);
}

function switchToCustom() {
  update({ instructionMode: "custom", instructionOverride: instructionTemplate.value });
}

function onInstructionInput(value) {
  update({ instructionOverride: value });
}

/**
 * Явный возврат к шаблону (`.plan` решение 4: «предложить явный возврат к
 * шаблону с предупреждением; не восстанавливать шаблон автоматически») —
 * тот же `modalStore.confirm`, что подтверждение удаления ключа в
 * `AgentSettings.vue`, а не молчаливая перезапись custom-текста.
 */
function confirmRevertToTemplate() {
  modalStore.confirm({
    title: t.value.instruction.revertTitle,
    message: t.value.instruction.revertMessage,
    confirmText: t.value.instruction.revertConfirm,
    cancelText: t.value.instruction.revertCancel,
    type: "is-warning",
    hasIcon: true,
    onConfirm: () => update({ instructionMode: "template", instructionOverride: "" }),
  });
}
</script>
