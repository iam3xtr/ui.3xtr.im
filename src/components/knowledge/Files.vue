<template>
  <section class="tr-knowledge-files">
    <Toolbar v-model:search="query" search-placeholder="Поиск файлов">
      <template #actions>
        <b-upload v-model="pickedFiles" multiple>
          <a class="button is-small">
            <b-icon icon="upload" size="is-small" />
            <span>Загрузить файлы</span>
          </a>
        </b-upload>

        <b-dropdown position="is-bottom-left" aria-role="list">
          <template #trigger>
            <b-button icon-left="plus" size="is-small" type="is-primary">
              Добавить
            </b-button>
          </template>
          <b-dropdown-item aria-role="listitem" @click="openObjectForm('text')">
            Добавить текст
          </b-dropdown-item>
          <b-dropdown-item aria-role="listitem" @click="openObjectForm('url')">
            Добавить ссылку
          </b-dropdown-item>
        </b-dropdown>
      </template>
    </Toolbar>

    <Loader v-if="isLoading" size="section" />

    <template v-else>
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показаны не все файлы коллекции: часть списка недоступна из-за
        временной ошибки. Остальные файлы ниже — актуальны.
      </b-message>

      <FileDropTarget @files="enqueueFiles">
        <ListAsyncState
          :empty="objects.length === 0 || demoStore.isEmpty"
          empty-icon="file-plus-outline"
          empty-title="В коллекции пока нет файлов"
          empty-message="Добавьте файл, ссылку или текстовый документ."
        >
          <div class="tr-knowledge__items-header">
            <span>{{ objects.length }} {{ objectsLabel }}</span>
            <span class="tr-muted">{{ formatBytes(totalSize) }}</span>
          </div>

          <div class="tr-card">
            <b-table :data="displayObjects" :row-key="(row) => row._demoKey ?? row.id" hoverable mobile-cards>
              <b-table-column field="name" label="Название" v-slot="{ row }">
                <span class="tr-row">
                  <b-icon :icon="getObjectKind(row.kind).icon" size="is-small" />
                  <span>
                    <strong>{{ row.name }}</strong>
                    <br v-if="row.sourceLabel" />
                    <small v-if="row.sourceLabel" class="tr-muted">{{ row.sourceLabel }}</small>
                  </span>
                </span>
              </b-table-column>

              <b-table-column field="status" label="Статус" v-slot="{ row }">
                <b-tag size="is-small" :type="getObjectStatus(row.status).tagType">
                  {{ getObjectStatus(row.status).label }}
                </b-tag>
              </b-table-column>

              <b-table-column field="size" label="Размер" v-slot="{ row }">
                {{ formatBytes(row.size) }}
              </b-table-column>

              <b-table-column field="updatedLabel" label="Обновлено" v-slot="{ row }">
                {{ row.updatedLabel }}
              </b-table-column>

              <b-table-column v-slot="{ row }" width="56">
                <b-dropdown position="is-bottom-left" aria-role="list" append-to-body>
                  <template #trigger>
                    <b-button
                      type="is-text"
                      icon-left="dots-horizontal"
                      size="is-small"
                      :aria-label="`Действия с файлом «${row.name}»`"
                    />
                  </template>
                  <b-dropdown-item aria-role="listitem" @click="removeObject(row)">
                    Удалить
                  </b-dropdown-item>
                </b-dropdown>
              </b-table-column>
            </b-table>
          </div>

          <p v-if="filteredObjects.length === 0 && objects.length > 0" class="tr-catalog-empty">
            По вашему запросу файлы не найдены.
          </p>
        </ListAsyncState>
      </FileDropTarget>
    </template>

    <KnowledgeFileFormModal :collection-id="route.params.id" :initial-tab="objectFormTab" />
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import {
  computed, ref, watch,
} from "vue";
import { useRoute } from "vue-router";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useDemoStore } from "../../stores/demo";
import { useKnowledgeStore } from "../../stores/knowledge";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";
import { Loader, ListAsyncState, Toolbar, FileDropTarget } from "@iam3xtr/vue";
import KnowledgeFileFormModal from "./KnowledgeFileFormModal.vue";

// Files tab (Task A5.6), routed at `/knowledge/:id`. Adding a file has two
// equal entry points (Task 3.2): the explicit `b-upload` control in the
// toolbar (a plain button, not its own drag-drop dropzone) and `FileDropTarget`
// (`@iam3xtr/vue`) wrapping the table's ready-state surface (`ListAsyncState`)
// so a file can be dropped anywhere over the table, including its empty/
// partial states, without turning any row/cell into a `<label>` or blocking
// row actions, search or mobile cards — `FileDropTarget` is a semantically
// neutral overlay, see its own doc comment. Both channels call the same
// `enqueueFiles` helper below, so the fixture object lifecycle (indexing →
// settle) never forks between picker and drop. This still matches
// get.3xtr.im's `Files.vue` + `KnowledgeFileForm.vue` split for pasted
// text/links via `KnowledgeFileFormModal.vue`. A freshly added object starts
// in `indexing` and settles to `indexed`/`error` on a fire-and-forget timer —
// the same convention as `KnowledgeFileFormModal.vue`'s `addObject` — so
// switching tabs before it fires can't leave the object stuck in `indexing`
// forever.
//
// Demo-режим (Stage A7, Task A7.4): the parent shell
// (`knowledge/CollectionDetail.vue`) already gates loading/error/
// permission-denied for the whole tab set, so this tab only adds what's
// local to it — an `empty` override and the `partial` banner (this task's
// "PartialDataBanner" contract, i.e. the same `b-message` pattern as
// `Agents.vue`/`ChannelsView.vue`, Task A7.3) over the file table, plus
// presentation-only "много данных"/"длинные подписи" in `displayObjects`
// that never touch `useKnowledgeStore()`.
const route = useRoute();
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const knowledgeStore = useKnowledgeStore();
const modalStore = useModalStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const query = ref("");
const pickedFiles = ref([]);
const objectFormTab = ref("text");

const collection = computed(
  () => knowledgeStore.getCollection(activeWorkspaceId.value, route.params.id),
);
const objects = computed(() => collection.value?.objects ?? []);
const objectsLabel = computed(() => pluralizeObjects(objects.value.length));
const totalSize = computed(
  () => objects.value.reduce((sum, object) => sum + object.size, 0),
);
const filteredObjects = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  if (!search) {
    return objects.value;
  }

  return objects.value.filter((object) => object.name.toLocaleLowerCase().includes(search));
});

const DENSE_TARGET_COUNT = 24;
const LONG_LABEL_SUFFIX = " — демонстрационное длинное название для проверки переноса строк в таблице файлов";

const displayObjects = computed(() => {
  let list = filteredObjects.value;

  if (demoStore.denseData && list.length > 0 && list.length < DENSE_TARGET_COUNT) {
    const dense = [...list];
    let i = 0;
    while (dense.length < DENSE_TARGET_COUNT) {
      const source = list[i % list.length];
      const copyIndex = Math.floor(dense.length / list.length) + 1;
      dense.push({
        ...source,
        name: `${source.name} (${copyIndex})`,
        _demoKey: `${source.id}-dense-${dense.length}`,
      });
      i += 1;
    }
    list = dense;
  }

  if (demoStore.longLabels) {
    list = list.map((object) => ({
      ...object,
      name: `${object.name}${LONG_LABEL_SUFFIX}`,
    }));
  }

  return list;
});

function getObjectKind(kind) {
  return knowledgeStore.getObjectKind(kind);
}

function getObjectStatus(status) {
  return knowledgeStore.getObjectStatus(status);
}

function pluralizeObjects(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "объект";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "объекта";
  return "объектов";
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex > 0 && value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function scheduleSettle(objectId, outcome) {
  setTimeout(() => {
    knowledgeStore.setObjectStatus(activeWorkspaceId.value, route.params.id, objectId, outcome);
  }, 1500);
}

// Shared enqueue helper (Task 3.2): both the `b-upload` picker (via the
// `pickedFiles` watcher below) and `FileDropTarget`'s `files` event call this
// with the same `File[]` shape, so the demo indexing/settle behavior is
// defined exactly once regardless of which channel added the file.
function enqueueFiles(files) {
  if (!files.length) {
    return;
  }

  files.forEach((file, index) => {
    const object = knowledgeStore.addObject(activeWorkspaceId.value, route.params.id, {
      name: file.name,
      kind: "file",
      size: file.size,
      sourceLabel: (file.name.split(".").pop() || "").toUpperCase(),
    });

    if (object) {
      // Every third upload lands on `error` — just enough to keep the status
      // badge and its variants visible without a real failure to trigger it.
      scheduleSettle(object.id, (objects.value.length + index) % 3 === 2 ? "error" : "indexed");
    }
  });
}

watch(pickedFiles, (files) => {
  if (!files.length) {
    return;
  }

  enqueueFiles(files);
  pickedFiles.value = [];
});

function openObjectForm(tab) {
  objectFormTab.value = tab;
  modalStore.open("knowledge-object-form");
}

function removeObject(object) {
  knowledgeStore.removeObject(activeWorkspaceId.value, route.params.id, object.id);
}
</script>
