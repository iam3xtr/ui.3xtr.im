<template>
  <section class="tr-settings">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Настройки пространства</h1>
        <p class="tr-page-subtitle">Общие параметры и удаление рабочего пространства.</p>
      </div>
    </div>

    <div class="tr-settings__panel">
      <div v-if="workspace" class="tr-form">
        <FormErrorSummary :errors="fieldErrors" />

        <b-message v-if="isConflict" type="is-warning" :closable="false">
          Название изменил кто-то другой, пока форма была открыта: сейчас в
          пространстве «{{ conflictRemote?.name }}». Можно перечитать
          актуальное значение или сохранить свой вариант поверх.
          <div class="tr-form__footer mt-2">
            <b-button size="is-small" @click="reloadRemote">Перечитать</b-button>
            <b-button size="is-small" type="is-primary" @click="keepLocal">
              Оставить мой вариант
            </b-button>
          </div>
        </b-message>

        <b-field label="Идентификатор">
          <b-input :model-value="workspace.id" disabled />
        </b-field>

        <b-field
          label="Название"
          :type="fieldErrors.name ? 'is-danger' : undefined"
          :message="fieldErrors.name || undefined"
        >
          <b-input id="workspace-name" v-model="draft.name" />
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

    <div v-if="workspace" class="tr-destructive-zone mt-5">
      <h2 class="tr-destructive-zone__title">Удаление пространства</h2>
      <p class="tr-muted">
        Удаление необратимо: агенты, диалоги, коллекции знаний и участники
        этого пространства будут потеряны.
      </p>
      <p v-if="isLastWorkspace" class="tr-muted">
        Нельзя удалить последнее рабочее пространство.
      </p>
      <b-button
        type="is-danger"
        outlined
        :disabled="isLastWorkspace"
        @click="confirmDelete"
      >
        Удалить пространство
      </b-button>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useDirtyExitGuard } from "../composables/useDirtyExitGuard";
import { useSavableForm } from "../composables/useSavableForm";
import { useModalStore } from "../stores/modal";
import { useToasterStore } from "../stores/toaster";
import { useWorkspaceStore } from "../stores/workspace";
import DirtyExitModal from "./common/DirtyExitModal.vue";
import FormErrorSummary from "./common/FormErrorSummary.vue";

// Domain settings tab (Task A5.8), routed at `/workspace/settings` —
// replaces the former demo screen that edited `siteSettings` (navbar
// display toggles: search/resource-menu/notifications visibility). The
// `.todo` note on Task A5.2 explicitly deferred that store's removal to
// "Task A5.4 and later"; `stores/siteSettings.js` and its last consumer
// (the toggle gates in `Navbar.vue`) were removed by Task A5.11, which
// closes Stage A5 — the navbar's search field, resource links and
// notifications dropdown now render unconditionally, same as the cabinet.
// Mirrors get.3xtr.im's `workspace/components/WorkspaceSettings.vue`: a
// rename form plus a destructive zone — first real consumer of
// `.tr-destructive-zone*` (see docs/design-system.md, «Допустимые
// исключения из «нет tr-* без потребителя»»). The cabinet's `id`-rename
// permission gate (`canUpdateWorkspaceId`) is out of scope — the kit has no
// auth/roles store to check against, so `id` stays read-only here.
//
// Task A10.1: the local draft/hasChanges/save/reset quartet this screen
// used to hand-roll is now the shared `useSavableForm` fixture-adapter —
// same contract as `profile/Settings.vue`, `knowledge/Settings.vue` and
// `agents/AgentSettings.vue`'s model/BYOK section, so a rename is an
// independent transaction from any of those, per `.todo`'s "Независимые
// операции пароля, ключа, профиля и конфигурации не становятся одной
// транзакцией". Conflict is modelled honestly rather than randomly: it
// fires when `workspace` (the canonical fixture record) drifts out from
// under an open draft — e.g. another workspace switch/session mutated the
// same record — never on a plain save.
const workspaceStore = useWorkspaceStore();
const modalStore = useModalStore();
const toaster = useToasterStore();
const { workspaces, activeWorkspaceId } = storeToRefs(workspaceStore);

const workspace = computed(
  () => workspaces.value.find((item) => item.id === activeWorkspaceId.value) ?? null,
);
const isLastWorkspace = computed(() => workspaces.value.length <= 1);

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
  source: () => workspace.value,
  toDraft: (value) => ({ name: value?.name ?? "" }),
  validate: (value) => (value.name.trim() ? {} : { name: "Введите название пространства." }),
  submit: (value) => {
    workspaceStore.updateWorkspace(workspace.value.id, { name: value.name.trim() });
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

function confirmDelete() {
  if (!workspace.value || isLastWorkspace.value) {
    return;
  }

  const { id, name } = workspace.value;

  modalStore.confirm({
    title: "Удалить пространство",
    message: `Пространство «${name}» и все его данные будут удалены без возможности восстановления.`,
    confirmText: "Удалить",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      workspaceStore.removeWorkspace(id);
      toaster.error(`Пространство «${name}» удалено`);
    },
  });
}
</script>
