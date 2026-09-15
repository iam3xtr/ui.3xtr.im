<template>
  <section class="tr-settings">
    <div class="tr-settings__panel">
      <div v-if="collection" class="tr-form">
        <FormErrorSummary :errors="fieldErrors" />

        <b-message v-if="isConflict" type="is-warning" :closable="false">
          Коллекцию изменили в другом окне, пока форма была открыта: сейчас
          сохранено название «{{ conflictRemote?.name }}». Можно перечитать
          актуальное значение или сохранить свой вариант поверх.
          <div class="tr-form__footer mt-2">
            <b-button size="is-small" @click="reloadRemote">Перечитать</b-button>
            <b-button size="is-small" type="is-primary" @click="keepLocal">
              Оставить мой вариант
            </b-button>
          </div>
        </b-message>

        <b-field label="ID">
          <b-input :model-value="collection.id" disabled />
        </b-field>

        <b-field
          label="Название"
          :type="fieldErrors.name ? 'is-danger' : undefined"
          :message="fieldErrors.name || undefined"
        >
          <b-input id="knowledge-settings-name" v-model="draft.name" />
        </b-field>

        <b-field label="Описание">
          <b-input v-model="draft.description" type="textarea" rows="3" />
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

    <div v-if="collection" class="tr-card mt-5">
      <div class="tr-row tr-row--between mb-4">
        <h2 class="tr-card__title mb-0">Переиндексация</h2>
        <b-button size="is-small" :disabled="isReindexing" @click="startReindex">
          <span v-if="isReindexing">Идёт переиндексация…</span>
          <span v-else>Запустить переиндексацию</span>
        </b-button>
      </div>

      <b-progress
        v-if="activeRun"
        class="mb-4"
        :value="reindexProgress"
        type="is-primary"
        size="is-small"
        show-value
      />

      <b-table :data="collection.reindexRuns" hoverable mobile-cards>
        <b-table-column field="startedLabel" label="Запуск" v-slot="{ row }">
          {{ row.startedLabel }}
        </b-table-column>
        <b-table-column field="status" label="Статус" v-slot="{ row }">
          <b-tag size="is-small" :type="getReindexRunStatus(row.status).tagType">
            {{ getReindexRunStatus(row.status).label }}
          </b-tag>
        </b-table-column>
        <b-table-column field="indexedObjects" label="Обработано" v-slot="{ row }">
          {{ row.indexedObjects }} / {{ row.totalObjects }}
        </b-table-column>

        <template #empty>
          <p class="tr-catalog-empty">Переиндексация ещё не запускалась.</p>
        </template>
      </b-table>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useDirtyExitGuard } from "../../composables/useDirtyExitGuard";
import { useSavableForm } from "../../composables/useSavableForm";
import { useKnowledgeStore } from "../../stores/knowledge";
import { useWorkspaceStore } from "../../stores/workspace";
import DirtyExitModal from "../common/DirtyExitModal.vue";
import FormErrorSummary from "../common/FormErrorSummary.vue";

// Settings tab (Task A5.6), routed at `/knowledge/:id/settings` — equivalent
// of get.3xtr.im's `knowledge/components/Settings.vue` scoped to the fields
// the kit has fixtures for: rename/describe the collection and a reindex
// run history (`b-table`) with a simulated progress bar (`b-progress`). The
// cabinet's collection-id rename and embedding-provider API-key section
// depend on permission gates and server round-trips the kit has no model for
// (no auth/roles store, no embedding-provider concept) — out of scope for
// this task, left for a coordinated follow-up if the design review calls
// for them.
//
// Task A10.1: rename/describe now goes through the shared `useSavableForm`
// fixture-adapter (same contract as `WorkspaceSettings.vue`,
// `profile/Settings.vue` and `agents/AgentSettings.vue`'s model/BYOK
// section) instead of the bespoke `form`/`hasChanges`/`save`/`reset` this
// screen used to hand-roll — this rename is its own transaction, independent
// of the reindex run below and of any other form on the page.
const route = useRoute();
const knowledgeStore = useKnowledgeStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const collection = computed(
  () => knowledgeStore.getCollection(activeWorkspaceId.value, route.params.id),
);

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
  save,
  retry,
  verify,
  reset,
  keepLocal,
  reloadRemote,
} = useSavableForm({
  source: () => collection.value,
  toDraft: (value) => ({
    name: value?.name ?? "",
    description: value?.description ?? "",
  }),
  validate: (value) => (value.name.trim() ? {} : { name: "Введите название коллекции." }),
  submit: (value) => {
    knowledgeStore.updateCollection(activeWorkspaceId.value, route.params.id, {
      name: value.name,
      description: value.description,
    });
    return { ok: true };
  },
});

const dirtyGuard = useDirtyExitGuard({
  isDirty: () => hasChanges.value,
  onSave: save,
  onDiscard: reset,
});

function getReindexRunStatus(status) {
  return knowledgeStore.getReindexRunStatus(status);
}

const activeRun = computed(
  () => collection.value?.reindexRuns.find((run) => run.status === "running") ?? null,
);
const isReindexing = computed(() => Boolean(activeRun.value));
const reindexProgress = computed(() => {
  if (!activeRun.value || activeRun.value.totalObjects === 0) return 0;
  return Math.round((activeRun.value.indexedObjects / activeRun.value.totalObjects) * 100);
});

function startReindex() {
  if (isReindexing.value || !collection.value) {
    return;
  }

  const run = knowledgeStore.startReindexRun(activeWorkspaceId.value, route.params.id);

  if (!run) {
    return;
  }

  const outcome = collection.value.objects.some((object) => object.status === "error")
    ? "error"
    : "done";

  // Fire-and-forget, like `KnowledgeFileFormModal.vue`'s `addObject` settle
  // timer — not tied to this component's lifecycle, so leaving the Settings
  // tab before it fires can't leave the run stuck in `running` forever.
  setTimeout(() => {
    knowledgeStore.settleReindexRun(activeWorkspaceId.value, route.params.id, run.id, outcome);
  }, 2000);
}
</script>
