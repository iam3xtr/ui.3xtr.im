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
        <b-field label="Идентификатор">
          <b-input :model-value="workspace.id" disabled />
        </b-field>

        <b-field label="Название">
          <b-input v-model="form.name" />
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
import { computed, ref, watch } from "vue";

import { useModalStore } from "../stores/modal";
import { useToasterStore } from "../stores/toaster";
import { useWorkspaceStore } from "../stores/workspace";

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
const workspaceStore = useWorkspaceStore();
const modalStore = useModalStore();
const toaster = useToasterStore();
const { workspaces, activeWorkspaceId } = storeToRefs(workspaceStore);

const workspace = computed(
  () => workspaces.value.find((item) => item.id === activeWorkspaceId.value) ?? null,
);
const isLastWorkspace = computed(() => workspaces.value.length <= 1);

const form = ref({ name: "" });

function syncForm() {
  form.value = { name: workspace.value?.name ?? "" };
}

watch(workspace, syncForm, { immediate: true });

const hasChanges = computed(() => Boolean(
  workspace.value
    && form.value.name.trim()
    && form.value.name !== workspace.value.name,
));

function save() {
  if (!workspace.value || !hasChanges.value) {
    return;
  }

  workspaceStore.updateWorkspace(workspace.value.id, { name: form.value.name.trim() });
  toaster.success("Изменения сохранены");
}

function reset() {
  syncForm();
}

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
