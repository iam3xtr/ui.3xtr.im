<template>
  <section class="tr-settings">
    <PageHeader title="Профиль" subtitle="Личные данные и уведомления." />

    <div class="tr-settings__panel">
      <div class="tr-form">
        <FormErrorSummary :errors="fieldErrors" />

        <b-message v-if="isConflict" type="is-warning" :closable="false">
          Профиль изменили в другом окне, пока форма была открыта: сейчас
          сохранено имя «{{ conflictRemote?.name }}». Можно перечитать
          актуальное значение или сохранить свой вариант поверх.
          <div class="tr-form__footer mt-2">
            <b-button size="is-small" @click="reloadRemote">Перечитать</b-button>
            <b-button size="is-small" type="is-primary" @click="keepLocal">
              Оставить мой вариант
            </b-button>
          </div>
        </b-message>

        <b-field
          label="Имя"
          :type="fieldErrors.name ? 'is-danger' : undefined"
          :message="fieldErrors.name || undefined"
        >
          <b-input id="profile-name" v-model="draft.name" />
        </b-field>

        <b-field label="Email">
          <b-input :model-value="profile.email" disabled />
        </b-field>

        <b-field label="Часовой пояс">
          <b-select v-model="draft.timezone" expanded>
            <option v-for="timezone in timezones" :key="timezone" :value="timezone">
              {{ timezone }}
            </option>
          </b-select>
        </b-field>

        <b-field label="Язык интерфейса">
          <b-select v-model="draft.language" expanded>
            <option v-for="language in languages" :key="language" :value="language">
              {{ language }}
            </option>
          </b-select>
        </b-field>

        <footer class="tr-form__footer">
          <b-button
            type="is-primary"
            :disabled="!hasChanges || !isValid"
            :loading="isPending"
            @click="save"
          >
            Сохранить
          </b-button>
          <b-button :disabled="!hasChanges" @click="reset">
            Отменить изменения
          </b-button>
          <b-button v-if="isError" @click="retry">Повторить</b-button>
          <span v-if="isUnknown" class="tr-muted">
            Результат неизвестен — <a href="#" @click.prevent="verify">сверить состояние</a>.
          </span>
        </footer>
      </div>
    </div>

    <DirtyExitModal
      :active="dirtyGuard.active"
      @save="dirtyGuard.confirmSave"
      @discard="dirtyGuard.confirmDiscard"
      @stay="dirtyGuard.stay"
    />

    <div class="tr-settings__panel mt-5">
      <div class="tr-settings__panel-header">
        <h2>Уведомления</h2>
        <p>Что присылать на {{ profile.email }}.</p>
      </div>

      <div
        v-for="preference in notificationPreferences"
        :key="preference.id"
        class="tr-settings__option"
      >
        <div class="tr-settings__option-copy">
          <strong>{{ preference.label }}</strong>
          <small>{{ preference.description }}</small>
        </div>
        <b-switch
          :model-value="preference.enabled"
          :aria-label="preference.label"
          @update:model-value="profileStore.toggleNotificationPreference(preference.id)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";

import { useDirtyExitGuard } from "../../composables/useDirtyExitGuard";
import { useSavableForm } from "../../composables/useSavableForm";
import {
  PROFILE_LANGUAGES,
  PROFILE_TIMEZONES,
  useProfileStore,
} from "../../stores/profile";
import { useToasterStore } from "../../stores/toaster";
import DirtyExitModal from "../common/DirtyExitModal.vue";
import FormErrorSummary from "../common/FormErrorSummary.vue";
import PageHeader from "../common/PageHeader.vue";

// Profile settings tab (Task A5.9), routed at `/profile` — cabinet
// equivalent: `profile/components/Settings.vue`. The cabinet gates `id` edits
// behind `canUpdateOwnProfile`; the kit has no auth/roles store, so `email`
// simply stays read-only (same call as `WorkspaceSettings.vue`'s `id` field).
//
// Task A10.1: draft/save/reset now go through the shared `useSavableForm`
// fixture-adapter (same contract as `WorkspaceSettings.vue`,
// `knowledge/Settings.vue` and `agents/AgentSettings.vue`'s model/BYOK
// section) instead of the bespoke `form`/`hasChanges`/`save`/`reset` this
// screen used to hand-roll — profile is its own independent transaction,
// never bundled with workspace/agent/key saves. The notification-toggles
// panel below stays immediate-apply (no draft/save step) — it is a set of
// independent switches, not a form with a save boundary.
const profileStore = useProfileStore();
const toaster = useToasterStore();
const { profile, notificationPreferences } = storeToRefs(profileStore);

const timezones = PROFILE_TIMEZONES;
const languages = PROFILE_LANGUAGES;

const {
  draft,
  hasChanges,
  isValid,
  fieldErrors,
  conflictRemote,
  isPending,
  isError,
  isConflict,
  isUnknown,
  save: saveForm,
  retry,
  verify,
  reset,
  keepLocal,
  reloadRemote,
} = useSavableForm({
  source: () => profile.value,
  toDraft: (value) => ({
    name: value?.name ?? "",
    timezone: value?.timezone ?? "",
    language: value?.language ?? "",
  }),
  validate: (value) => (value.name.trim() ? {} : { name: "Введите имя." }),
  submit: (value) => {
    profileStore.updateProfile({
      name: value.name.trim(),
      timezone: value.timezone,
      language: value.language,
    });
    return { ok: true };
  },
});

async function save() {
  const result = await saveForm();
  if (result?.ok && !result.noop) {
    toaster.success("Изменения сохранены");
  }
  return result;
}

const dirtyGuard = useDirtyExitGuard({
  isDirty: () => hasChanges.value,
  onSave: save,
  onDiscard: reset,
});
</script>
