<template>
  <!--
    One Settings family on the shared anatomy (Task S2-07, Issue #22). Every
    panel owns its own `useSavableForm` transaction: Workspace, Profile,
    Agent, Channel, ... never share a draft or a Save. The same draft is
    editable inline (`.tr-settings__panel`) or in a `FormDrawer`; only one
    host edits at a time, so there is one Save per logical form and no nested
    form. Copy comes from the consumer (`copy`); the package owns rhythm only.
  -->
  <div class="tr-settings__panel" :data-testid="`family-${family.id}`">
    <div class="tr-form">
      <section class="tr-settings__section">
        <header class="tr-settings__section-header">
          <div>
            <h3 class="tr-settings__section-title">{{ copy.families[family.id] }}</h3>
            <p class="tr-settings__section-subtitle">{{ copy.disposition[family.disposition] }}</p>
          </div>
          <div class="tr-settings__section-actions">
            <b-button
              v-if="canEdit && !editing"
              size="is-small"
              data-testid="family-edit"
              @click="startEdit"
            >
              {{ copy.edit }}
            </b-button>
            <b-button
              v-if="canEdit && !editing"
              size="is-small"
              data-testid="family-open-drawer"
              @click="openDrawer"
            >
              {{ copy.openDrawer }}
            </b-button>
          </div>
        </header>

        <b-message v-if="!canEdit" type="is-info" :closable="false" data-testid="family-denied">
          {{ copy.denied }}
        </b-message>

        <template v-if="!drawerOpen">
          <FamilyStatus :copy="copy" :form="form" />
          <FamilyRows
            :copy="copy"
            :family="family"
            :draft="form.draft.value"
            :editable="editing && canEdit"
            :busy="form.isPending.value"
            :errors="form.fieldErrors.value"
            :id-prefix="`${family.id}-inline`"
          />
          <footer v-if="editing && canEdit" class="tr-form__footer">
            <b-button
              type="is-primary"
              :loading="form.isPending.value"
              :disabled="form.isPending.value || form.isConflict.value || !form.hasChanges.value"
              data-testid="family-save"
              @click="submit"
            >
              {{ copy.save }}
            </b-button>
            <b-button :disabled="form.isPending.value" data-testid="family-cancel" @click="cancel">
              {{ copy.cancel }}
            </b-button>
            <span v-if="form.hasChanges.value" class="tr-muted" data-testid="family-dirty">
              {{ copy.unsaved }}
            </span>
          </footer>
        </template>
      </section>

      <div v-if="family.danger && canEdit" class="tr-destructive-zone" data-testid="family-danger">
        <h4 class="tr-destructive-zone__title">{{ copy.dangerTitle }}</h4>
        <p class="tr-muted">{{ copy.dangerText }}</p>
        <b-button type="is-danger" outlined :disabled="form.isPending.value" @click="requestDanger">
          {{ copy.dangerAction }}
        </b-button>
        <p v-if="dangerRequested" class="tr-muted" data-testid="family-danger-confirm">
          {{ copy.dangerConfirm }}
        </p>
      </div>
    </div>

    <FormDrawer
      v-model="drawerOpen"
      :title="copy.families[family.id]"
      :close-aria-label="copy.close"
      :busy="form.isPending.value"
      @submit="submit"
    >
      <section class="tr-settings__section" :data-testid="`family-${family.id}-drawer`">
        <FamilyStatus :copy="copy" :form="form" />
        <FamilyRows
          :copy="copy"
          :family="family"
          :draft="form.draft.value"
          :editable="canEdit"
          :busy="form.isPending.value"
          :errors="form.fieldErrors.value"
          :id-prefix="`${family.id}-drawer`"
        />
      </section>
      <template #footer="{ busy, requestClose }">
        <b-button class="mr-2" :disabled="busy" @click="cancelDrawer(requestClose)">
          {{ copy.cancel }}
        </b-button>
        <b-button
          v-if="canEdit"
          type="is-primary"
          native-type="submit"
          :loading="busy"
          :disabled="busy || form.isConflict.value || !form.hasChanges.value"
        >
          {{ copy.save }}
        </b-button>
      </template>
    </FormDrawer>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

import { FormDrawer } from "@iam3xtr/vue";
import { useSavableForm } from "../../composables/useSavableForm";
import FamilyRows from "./KitSettingsFamilyRows.vue";
import FamilyStatus from "./KitSettingsFamilyStatus.vue";

const props = defineProps({
  family: { type: Object, required: true },
  copy: { type: Object, required: true },
  // Fixture records per entity key; switching the key is the entity/workspace
  // switch and must drop any open draft.
  records: { type: Object, required: true },
  entityKey: { type: String, required: true },
  scenario: { type: String, default: "ok" },
});
const emit = defineEmits(["saved"]);

const editing = ref(false);
const drawerOpen = ref(false);
const dangerRequested = ref(false);

const canEdit = computed(() => props.family.canEdit !== false);
const record = computed(() => props.records[props.entityKey]);

function validate(draft) {
  const errors = {};
  for (const field of props.family.fields) {
    if (field.required && !String(draft[field.key] ?? "").trim()) {
      errors[field.key] = props.copy.required;
    }
  }
  return errors;
}

const form = useSavableForm({
  source: () => record.value,
  toDraft: (value) => Object.fromEntries(props.family.fields.map((f) => [f.key, value?.[f.key] ?? ""])),
  validate,
  pendingTimeoutMs: 400,
  submit(draft) {
    if (props.scenario === "error") return { ok: false, message: props.copy.saveError };
    if (props.scenario === "conflict") {
      return { ok: false, conflict: true, remote: { ...draft, [props.family.fields[0].key]: `${draft[props.family.fields[0].key]} *` } };
    }
    const apply = () => {
      Object.assign(record.value, draft);
      emit("saved", props.family.id);
      return { ok: true };
    };
    if (props.scenario === "unknown") {
      return new Promise((resolve) => setTimeout(() => resolve(apply()), 1200));
    }
    return apply();
  },
});

function startEdit() {
  form.reset();
  editing.value = true;
}

function openDrawer() {
  form.reset();
  drawerOpen.value = true;
}

async function submit() {
  const result = await form.save();
  if (result?.ok) {
    editing.value = false;
    drawerOpen.value = false;
  }
}

// Cancel is an explicit discard: the draft is dropped, never silently kept.
function cancel() {
  if (form.isPending.value) return;
  form.reset();
  editing.value = false;
}

function cancelDrawer(requestClose) {
  form.reset();
  requestClose("programmatic");
}

// Escape/backdrop close keeps a dirty draft visible in the inline host rather
// than losing it.
watch(drawerOpen, (open) => {
  if (!open && form.hasChanges.value) editing.value = true;
});

function requestDanger() {
  dangerRequested.value = true;
}

// Entity/workspace switch: drop the draft, the host state and any pending
// confirmation so nothing leaks between records.
watch(
  () => props.entityKey,
  () => {
    form.reset();
    editing.value = false;
    drawerOpen.value = false;
    dangerRequested.value = false;
  },
  { flush: "sync" },
);
</script>
