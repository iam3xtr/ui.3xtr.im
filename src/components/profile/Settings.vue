<template>
  <section class="tr-settings">
    <PageHeader title="Профиль" subtitle="Личные данные и уведомления." />

    <div class="tr-settings__panel">
      <div class="tr-form">
        <b-field label="Имя">
          <b-input v-model="form.name" />
        </b-field>

        <b-field label="Email">
          <b-input :model-value="profile.email" disabled />
        </b-field>

        <b-field label="Часовой пояс">
          <b-select v-model="form.timezone" expanded>
            <option v-for="timezone in timezones" :key="timezone" :value="timezone">
              {{ timezone }}
            </option>
          </b-select>
        </b-field>

        <b-field label="Язык интерфейса">
          <b-select v-model="form.language" expanded>
            <option v-for="language in languages" :key="language" :value="language">
              {{ language }}
            </option>
          </b-select>
        </b-field>

        <footer class="tr-form__footer">
          <b-button type="is-primary" :disabled="!hasChanges" @click="save">
            Сохранить
          </b-button>
          <b-button :disabled="!hasChanges" @click="reset">
            Отменить изменения
          </b-button>
        </footer>
      </div>
    </div>

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
import { computed, ref, watch } from "vue";

import {
  PROFILE_LANGUAGES,
  PROFILE_TIMEZONES,
  useProfileStore,
} from "../../stores/profile";
import { useToasterStore } from "../../stores/toaster";
import PageHeader from "../common/PageHeader.vue";

// Profile settings tab (Task A5.9), routed at `/profile` — cabinet
// equivalent: `profile/components/Settings.vue`. The cabinet gates `id` edits
// behind `canUpdateOwnProfile`; the kit has no auth/roles store, so `email`
// simply stays read-only (same call as `WorkspaceSettings.vue`'s `id` field).
// Fields bind to a local draft with explicit save/cancel — same
// draft-then-apply pattern as `WorkspaceSettings.vue`, unlike
// `AgentSettings.vue`'s bind-straight-to-fixture. The notification-toggles
// panel below is the first real consumer of `.tr-settings__panel-header`/
// `.tr-settings__option*` (see `docs/design-system.md`, «Допустимые
// исключения из «нет tr-* без потребителя»» and `stores/profile.js`).
const profileStore = useProfileStore();
const toaster = useToasterStore();
const { profile, notificationPreferences } = storeToRefs(profileStore);

const timezones = PROFILE_TIMEZONES;
const languages = PROFILE_LANGUAGES;

const form = ref({ name: "", timezone: "", language: "" });

function syncForm() {
  form.value = {
    name: profile.value.name,
    timezone: profile.value.timezone,
    language: profile.value.language,
  };
}

watch(profile, syncForm, { immediate: true });

const hasChanges = computed(() => Boolean(
  form.value.name.trim()
    && (form.value.name !== profile.value.name
      || form.value.timezone !== profile.value.timezone
      || form.value.language !== profile.value.language),
));

function save() {
  if (!hasChanges.value) {
    return;
  }

  profileStore.updateProfile({
    name: form.value.name.trim(),
    timezone: form.value.timezone,
    language: form.value.language,
  });
  toaster.success("Изменения сохранены");
}

function reset() {
  syncForm();
}
</script>
