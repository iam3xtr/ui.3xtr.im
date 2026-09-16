<template>
  <section class="tr-workbench-page tr-agent-knowledge">
    <Loader v-if="loading" size="section" />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <template v-else>
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показаны не все материалы коллекции: часть списка недоступна из-за
        временной ошибки. Остальные материалы ниже — актуальны.
      </b-message>

      <div class="tr-row tr-row--between tr-agent-knowledge__header mb-4">
        <div>
          <h2 class="tr-card__title mb-1">Знания агента</h2>
          <p v-if="collection" class="tr-muted">{{ summaryLabel }}</p>
          <p v-else class="tr-muted">
            Личная коллекция знаний появится, как только вы добавите первый материал.
          </p>
        </div>

        <div v-if="collection" class="tr-row tr-agent-knowledge__collection-actions">
          <b-button size="is-small" @click="confirmUnlink">
            Убрать из знаний агента
          </b-button>
          <b-button size="is-small" type="is-danger" @click="confirmDeleteCollection">
            Удалить коллекцию
          </b-button>
        </div>
      </div>

      <div class="tr-wizard-source-add">
        <b-upload
          v-model="pickedFiles"
          drag-drop
          multiple
          expanded
          class="tr-wizard-source-add__upload"
        >
          <div class="has-text-centered tr-upload-dropzone__hint">
            <p><b-icon icon="upload" size="is-medium" /></p>
            <p>Перетащите файлы сюда или нажмите для выбора</p>
            <p class="tr-muted">Поддерживаются документы, таблицы и презентации — до 20 МБ каждый.</p>
          </div>
        </b-upload>

        <div class="tr-row tr-wizard-source-add__actions">
          <b-button icon-left="text-box-plus-outline" @click="openForm('text')">
            Добавить текст
          </b-button>
          <b-button icon-left="link-plus" @click="openForm('url')">
            Добавить ссылку
          </b-button>
        </div>
      </div>

      <div v-if="activeForm" class="tr-form tr-wizard-source-form">
        <b-field label="Название">
          <b-input
            v-model="formName"
            :placeholder="activeForm === 'text' ? 'Например, Аргументы для переговоров' : 'Например, Актуальные тарифы'"
          />
        </b-field>

        <b-field v-if="activeForm === 'text'" label="Содержимое">
          <b-input v-model="formContent" type="textarea" rows="6" placeholder="Вставьте или напишите текст" />
        </b-field>

        <b-field v-else label="URL">
          <b-input v-model="formUrl" type="url" placeholder="https://example.com" />
        </b-field>

        <div class="tr-row">
          <b-button type="is-primary" :disabled="!canSubmitForm" @click="submitForm">
            Добавить
          </b-button>
          <b-button @click="closeForm">Отмена</b-button>
        </div>
      </div>

      <ListAsyncState
        :empty="displayItems.length === 0"
        empty-icon="folder-search-outline"
        empty-title="Знаний пока нет"
        empty-message="Добавьте файл, ссылку или текст — агент начнёт использовать их в ответах."
      >
        <ul class="tr-wizard-source-list">
          <li
            v-for="item in displayItems"
            :key="item.sourceKey"
            class="tr-wizard-source"
            :class="`tr-wizard-source--${item.phase}`"
          >
            <b-icon :icon="kindIcon(item.kind)" />

            <div class="tr-wizard-source__body">
              <strong>{{ item.name }}</strong>
              <br v-if="item.sourceLabel" />
              <small v-if="item.sourceLabel" class="tr-muted">{{ item.sourceLabel }}</small>
              <br v-if="item.updatedLabel" />
              <small v-if="item.updatedLabel" class="tr-muted">Обновлено: {{ item.updatedLabel }}</small>
            </div>

            <b-tag size="is-small" :type="phaseTag(item.phase).type">
              {{ phaseTag(item.phase).label }}
            </b-tag>

            <div class="tr-wizard-source__actions">
              <b-button
                v-if="item.phase === 'error'"
                size="is-small"
                icon-left="reload"
                @click="retry(item.sourceKey)"
              >
                Повторить
              </b-button>
              <b-button
                v-if="item.phase !== 'upload'"
                size="is-small"
                icon-left="swap-horizontal"
                @click="replaceSource(item.sourceKey)"
              >
                Заменить
              </b-button>
              <b-button
                v-if="item.phase !== 'upload'"
                size="is-small"
                type="is-text"
                icon-left="trash-can-outline"
                :aria-label="`Удалить материал «${item.name}»`"
                @click="removeSource(item.sourceKey)"
              />
            </div>
          </li>
        </ul>
      </ListAsyncState>

      <p v-if="collection && collection.objects.length > 0" class="tr-muted mt-4">
        Знания изменились —
        <router-link :to="{ name: 'agent', params: { id: agentId } }">
          задайте вопрос в песочнице
        </router-link>, чтобы проверить ответ.
      </p>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import {
  computed, reactive, ref, watch,
} from "vue";
import { useRoute } from "vue-router";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useAgentsStore } from "../../stores/agents";
import { useDemoStore } from "../../stores/demo";
import { useKnowledgeStore } from "../../stores/knowledge";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";
import { AsyncState, ListAsyncState, Loader } from "@iam3xtr/vue";

// «Знания» agent-detail tab (Task A10.3, `.plan` Stage A10 «Знания после
// завершения мастера»), routed at `/agents/:id/knowledge` — nested under
// `AgentDetail.vue` alongside `agent`/`agent-settings`/`agent-channels`
// (same convention as `channels/ChannelsView.vue`, Task A5.5/A7.3). Reuses
// the wizard's own `KnowledgeStep.vue` add/list surface and CSS
// (`.tr-wizard-source*`, section "15. Wizard" in `trickster-buefy.scss`) —
// the same simple-mode contract (no collection/embedding-profile/chunk
// picker), just anchored to `agent.knowledgeCollectionId` (durable link,
// `stores/agents.js`) instead of a wizard draft's `resources`.
//
// Durable link, not a wizard draft: `stores/wizard.js` keeps at most one
// draft per workspace, so a second agent's wizard run would silently
// discard the first agent's `resources.collectionId` reference — this tab
// reads/writes `agent.knowledgeCollectionId` directly, which
// `finalizeAgentFields` already populates for a wizard-created agent (Task
// A10.3 fix), and which this tab populates itself on the lazy first material
// for any agent that reaches this screen without ever running the wizard's
// "Знания" step (a fixture agent, or one whose wizard draft never added a
// source). Revisiting always resolves the same collection by this id
// instead of creating a second one.
const route = useRoute();
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const agentsStore = useAgentsStore();
const knowledgeStore = useKnowledgeStore();
const modalStore = useModalStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const agentId = computed(() => route.params.id);
const loading = computed(() => isLoading.value || demoStore.isLoading);

const agent = computed(() => agentsStore.getAgent(activeWorkspaceId.value, agentId.value));
const collection = computed(() => {
  const collectionId = agent.value?.knowledgeCollectionId;

  return collectionId == null
    ? undefined
    : knowledgeStore.getCollection(activeWorkspaceId.value, collectionId);
});

function pluralizeMaterials(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "материал";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "материала";
  return "материалов";
}

/**
 * Общая сводка по коллекции (`.plan`: «различать … partial»): `ready` только
 * когда все материалы проиндексированы, `partial`, когда есть и готовые, и
 * ещё не готовые/ошибочные — так пользователь не принимает частично
 * обработанную коллекцию за полностью готовую к ответам.
 */
const summaryLabel = computed(() => {
  if (!collection.value) {
    return "";
  }

  const objects = collection.value.objects;
  const count = objects.length;
  const countLabel = `${count} ${pluralizeMaterials(count)}`;

  if (count === 0) {
    return `${countLabel} — коллекция пока пуста.`;
  }

  const readyCount = objects.filter((object) => object.status === "indexed").length;

  if (readyCount === count) {
    return `${countLabel} — все готовы для ответов.`;
  }
  if (readyCount === 0) {
    return `${countLabel} — ещё не готовы для ответов.`;
  }

  return `${countLabel} — готово частично: ${readyCount} из ${count}.`;
});

const KIND_ICONS = {
  file: "file-outline",
  text: "language-markdown-outline",
  url: "link-variant",
};

function kindIcon(kind) {
  return KIND_ICONS[kind] ?? KIND_ICONS.file;
}

/**
 * Презентационные фазы материала (`.plan`: «различать upload, processing,
 * ready, partial, error, limit и unknown»). `upload` — источник ещё не стал
 * fixture-объектом (клиентское состояние без стабильного id, как в
 * `KnowledgeStep.vue`); `processing`/`ready`/`error` — прямая проекция
 * реального `KnowledgeObjectStatus` (`indexing`/`indexed`/`error`); `unknown`
 * — защитный fallback для статуса вне этого набора, который никогда не
 * рисуется как «готово». `partial` — не фаза материала, а сводка всей
 * коллекции (см. `summaryLabel` выше). `limit` (материал не обработан из-за
 * тарифного лимита количества/размера) — отдельное измерение тарифа, для
 * которого в ките пока нет ни одного стора (`src/stores/workspace.js` знает
 * только про кредиты/диалоги) — реализовать его здесь означало бы придумать
 * непродуктовую цифру лимита; вместо этого он зафиксирован как явно не
 * реализованное измерение (см. API-матрицу Stage A10 `.plan`), а не тихо
 * подменён любым из существующих состояний.
 */
const PHASE_TAGS = {
  upload: { label: "Загрузка" },
  processing: { label: "Обработка" },
  ready: { label: "Готово", type: "is-success" },
  error: { label: "Ошибка", type: "is-danger" },
  unknown: { label: "Неизвестно", type: "is-warning" },
};

function phaseTag(phase) {
  return PHASE_TAGS[phase] ?? PHASE_TAGS.unknown;
}

function objectPhase(status) {
  if (status === "indexed") return "ready";
  if (status === "indexing") return "processing";
  if (status === "error") return "error";

  return "unknown";
}

const committedItems = computed(() => {
  if (!collection.value) {
    return [];
  }

  return collection.value.objects.map((object) => ({
    sourceKey: `object-${object.id}`,
    objectId: object.id,
    phase: objectPhase(object.status),
    kind: object.kind,
    name: object.name,
    sourceLabel: object.sourceLabel,
    updatedLabel: object.updatedLabel,
  }));
});

// Между «пользователь нажал добавить» и «материал стал реальным
// fixture-объектом» — чисто клиентское состояние без стабильного id, как в
// `KnowledgeStep.vue`: ничего не создаётся, если уйти со страницы раньше.
const pendingItems = reactive([]);

const displayItems = computed(() => [...pendingItems, ...committedItems.value]);

/**
 * Лениво заводит личную коллекцию агента при первом материале
 * (`.plan`: «новый визит не создаёт коллекцию») — идемпотентна через
 * `agentsStore.linkKnowledgeCollection`: уже связанный агент просто отдаёт
 * существующую коллекцию.
 */
function ensureCollectionForSource() {
  if (!agent.value) {
    return undefined;
  }

  if (collection.value) {
    return collection.value;
  }

  const created = knowledgeStore.createCollection(activeWorkspaceId.value, {
    name: agent.value.name,
    type: "mixed",
    autoNamed: true,
  });

  agentsStore.linkKnowledgeCollection(activeWorkspaceId.value, agent.value.id, created.id);

  return created;
}

function scheduleSettle(objectId, collectionId, index) {
  setTimeout(() => {
    knowledgeStore.setObjectStatus(
      activeWorkspaceId.value,
      collectionId,
      objectId,
      // Каждый третий материал демонстративно уходит в ошибку — та же
      // конвенция, что `Files.vue`/`KnowledgeStep.vue`.
      index % 3 === 2 ? "error" : "indexed",
    );
  }, 1200);
}

function commitPending(pending) {
  const index = pendingItems.indexOf(pending);

  if (index !== -1) {
    pendingItems.splice(index, 1);
  }

  const targetCollection = ensureCollectionForSource();

  if (!targetCollection) {
    return;
  }

  const object = knowledgeStore.addObject(activeWorkspaceId.value, targetCollection.id, {
    name: pending.name,
    kind: pending.kind,
    size: pending.size,
    sourceLabel: pending.sourceLabel,
  });

  if (object) {
    scheduleSettle(object.id, targetCollection.id, targetCollection.objects.length - 1);
  }
}

let nextPendingSequence = 1;

function queueSource(entry) {
  const pending = reactive({
    sourceKey: `pending-${nextPendingSequence++}`,
    phase: "upload",
    ...entry,
  });

  pendingItems.push(pending);
  setTimeout(() => commitPending(pending), 400);
}

const pickedFiles = ref([]);

watch(pickedFiles, (files) => {
  if (!files.length) {
    return;
  }

  files.forEach((file) => {
    queueSource({
      name: file.name,
      kind: "file",
      size: file.size,
      sourceLabel: (file.name.split(".").pop() || "").toUpperCase(),
    });
  });

  pickedFiles.value = [];
});

const activeForm = ref(null);
const formName = ref("");
const formContent = ref("");
const formUrl = ref("");

function openForm(kind, prefill = {}) {
  activeForm.value = kind;
  formName.value = prefill.name ?? "";
  formContent.value = "";
  formUrl.value = "";
}

function closeForm() {
  activeForm.value = null;
}

const canSubmitForm = computed(() => {
  if (activeForm.value === "text") {
    return Boolean(formName.value.trim() && formContent.value.trim());
  }
  if (activeForm.value === "url") {
    return Boolean(formName.value.trim() && formUrl.value.trim());
  }

  return false;
});

function submitForm() {
  if (!canSubmitForm.value) {
    return;
  }

  const isText = activeForm.value === "text";

  queueSource({
    name: formName.value.trim(),
    kind: isText ? "text" : "url",
    size: isText ? formContent.value.trim().length : 0,
    sourceLabel: isText ? "Внутренний документ" : formUrl.value.trim(),
  });

  closeForm();
}

/**
 * Повтор ошибки — как в `KnowledgeStep.vue`: не создаёт нового материала, не
 * трогает остальные, детерминированно завершается успехом.
 */
function retry(sourceKey) {
  const item = committedItems.value.find((entry) => entry.sourceKey === sourceKey);

  if (!item || !collection.value) {
    return;
  }

  knowledgeStore.setObjectStatus(activeWorkspaceId.value, collection.value.id, item.objectId, "indexing");
  setTimeout(() => {
    knowledgeStore.setObjectStatus(activeWorkspaceId.value, collection.value.id, item.objectId, "indexed");
  }, 1200);
}

/**
 * «Удалить материал» — мгновенная команда (без confirm), той же конвенции,
 * что `knowledge/Files.vue`'s удаление объекта: убирает только этот
 * материал из коллекции агента, не трогая коллекцию целиком и других
 * агентов/коллекции (`.plan`: «Удаление не затрагивает чужие
 * collections/agents»).
 */
function removeSource(sourceKey) {
  const item = committedItems.value.find((entry) => entry.sourceKey === sourceKey);

  if (!item || !collection.value) {
    return;
  }

  knowledgeStore.removeObject(activeWorkspaceId.value, collection.value.id, item.objectId);
}

function replaceSource(sourceKey) {
  const item = committedItems.value.find((entry) => entry.sourceKey === sourceKey);

  removeSource(sourceKey);

  if (!item) {
    return;
  }

  if (item.kind !== "file") {
    openForm(item.kind === "text" ? "text" : "url", { name: item.name });
  }
}

/**
 * «Убрать из знаний агента» (Task A10.3): агент перестаёт использовать
 * коллекцию немедленно, коллекция и её материалы остаются в разделе
 * «Знания» — отличается от удаления коллекции ниже, которое стирает её для
 * всех. Затронут только текущий агент — confirm называет его явно, не
 * общей фразой.
 */
function confirmUnlink() {
  if (!agent.value || !collection.value) {
    return;
  }

  const collectionName = collection.value.name;
  const agentName = agent.value.name;

  modalStore.confirm({
    title: `Убрать «${collectionName}» из знаний агента?`,
    message: `Агент «${agentName}» перестанет использовать эту коллекцию в `
      + "ответах сразу после подтверждения. Сама коллекция и её материалы "
      + "останутся в разделе «Знания» — их можно будет связать с другим "
      + "агентом или открыть напрямую.",
    confirmText: "Убрать из знаний",
    cancelText: "Отмена",
    hasIcon: true,
    onConfirm: () => {
      agentsStore.unlinkKnowledgeCollection(activeWorkspaceId.value, agent.value.id);
    },
  });
}

/**
 * «Удалить коллекцию» (Task A10.3): стирает коллекцию и все её материалы
 * безвозвратно для каждого агента, который на неё ссылается — confirm
 * называет их по имени (`.plan`: «подтверждение показывает доступных
 * пользователю затронутых агентов»), а не тихо расширяет каскад.
 */
function confirmDeleteCollection() {
  if (!collection.value) {
    return;
  }

  const collectionId = collection.value.id;
  const collectionName = collection.value.name;
  const affectedAgents = agentsStore.listAgentsUsingCollection(activeWorkspaceId.value, collectionId);
  const affectedNames = affectedAgents.map((item) => item.name);

  modalStore.confirm({
    title: `Удалить коллекцию «${collectionName}»?`,
    message: affectedNames.length > 0
      ? `Коллекция и все её материалы пропадут без возможности `
        + `восстановления. Затронутые агенты вернутся к работе без знаний: `
        + `${affectedNames.join(", ")}.`
      : "Коллекция будет удалена без возможности восстановления.",
    confirmText: "Удалить коллекцию",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      for (const item of affectedAgents) {
        agentsStore.unlinkKnowledgeCollection(activeWorkspaceId.value, item.id);
      }

      knowledgeStore.deleteCollection(activeWorkspaceId.value, collectionId);
    },
  });
}

watch(agentId, () => {
  activeForm.value = null;
  pendingItems.splice(0, pendingItems.length);
});
</script>
