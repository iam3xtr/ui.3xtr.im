<template>
  <div class="tr-wizard-step">
    <h2 class="tr-card__title">Добавьте знания агента</h2>

    <WizardHint :expanded="hintsExpanded">
      <template #compact>
        Файлы, ссылки или текст — необязательно, коллекцию заводить не нужно.
      </template>
      Добавьте то, чем агент должен пользоваться при ответе: файлы, ссылки на
      страницы или текст, который можно вставить прямо здесь. Отдельную
      коллекцию выбирать не нужно — мастер сам заведёт для агента одну личную
      коллекцию знаний, как только появится первый источник. Продолжить можно
      и совсем без источника — знания можно добавить позже.
    </WizardHint>

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

    <ul v-if="displayItems.length" class="tr-wizard-source-list">
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
            v-if="item.phase !== 'loading'"
            size="is-small"
            icon-left="swap-horizontal"
            @click="replaceSource(item.sourceKey)"
          >
            Заменить
          </b-button>
          <b-button
            v-if="item.phase !== 'loading'"
            size="is-small"
            type="is-text"
            icon-left="trash-can-outline"
            :aria-label="`Удалить источник «${item.name}»`"
            @click="removeSource(item.sourceKey)"
          />
        </div>
      </li>
    </ul>

    <p v-else class="tr-muted mt-4">
      Знания не обязательны для продолжения — можно добавить их сейчас или позже.
    </p>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { getWizardKnowledgeCollectionName, useWizardStore } from "../../../../stores/wizard";
import { useKnowledgeStore } from "../../../../stores/knowledge";
import WizardHint from "../WizardHint.vue";

// Шаг «Знания» (Task A9.4, `.plan` «Знания без внутренних структур на
// основном пути»). В отличие от Pain/Context/Rules этот шаг не только
// патчит `draft.fields` через `update`, а сам создаёт fixture-ресурсы —
// личную коллекцию и источники — поэтому получает не только `fields`, а весь
// `draft` (нужен `workspaceId` и `resources` для идемпотентных вызовов
// `useWizardStore()`). Название/тип коллекции и явная привязка намеренно не
// показаны — коллекция существует только как контейнер для перечисленных
// здесь источников (`.plan`: «скрыв название/тип контейнера и ручную
// привязку»).
const props = defineProps({
  draft: {
    type: Object,
    required: true,
  },
  hintsExpanded: {
    type: Boolean,
    default: true,
  },
});

const wizardStore = useWizardStore();
const knowledgeStore = useKnowledgeStore();

const workspaceId = computed(() => props.draft.workspaceId);
const fields = computed(() => props.draft.fields);
const resources = computed(() => props.draft.resources);

const collection = computed(() => {
  const { collectionId } = resources.value;

  return collectionId == null
    ? undefined
    : knowledgeStore.getCollection(workspaceId.value, collectionId);
});

/**
 * Личная коллекция появляется лениво: только когда пользователь добавляет
 * первый источник, а не при входе на шаг (`.plan`: «появляется лениво при
 * первом добавлении знаний»). `ensureCollection` сам идемпотентен — повторный
 * вызов на втором/третьем источнике находит уже созданную коллекцию вместо
 * второй.
 */
function ensureCollectionForSource() {
  const result = wizardStore.ensureCollection(
    workspaceId.value,
    getWizardKnowledgeCollectionName(fields.value),
  );

  return result.ok ? result.collection : undefined;
}

// Пока коллекция не переименована явно (это делает обычный экран настроек
// коллекции, не этот шаг — `knowledgeStore.updateCollection` сбрасывает
// `autoNamed`), смена имени агента на шаге «Контекст» синхронизирует имя
// коллекции. Смена locale имя не трогает — этот watcher реагирует только на
// `fields.agentName`, никакой locale-производной строки здесь нет.
watch(
  () => fields.value.agentName,
  () => {
    const { collectionId } = resources.value;

    if (collectionId == null) {
      return;
    }

    knowledgeStore.syncAutoName(
      workspaceId.value,
      collectionId,
      getWizardKnowledgeCollectionName(fields.value),
    );
  },
);

const KIND_ICONS = {
  file: "file-outline",
  text: "language-markdown-outline",
  url: "link-variant",
};

function kindIcon(kind) {
  return KIND_ICONS[kind] ?? KIND_ICONS.file;
}

const PHASE_TAGS = {
  loading: { label: "Загрузка" },
  processing: { label: "Обработка" },
  ready: { label: "Готово", type: "is-success" },
  error: { label: "Ошибка", type: "is-danger" },
};

function phaseTag(phase) {
  return PHASE_TAGS[phase] ?? PHASE_TAGS.processing;
}

function objectPhase(status) {
  if (status === "indexed") return "ready";
  if (status === "error") return "error";

  return "processing";
}

/**
 * Уже созданные источники — читаются из коллекции по запомненным в draft'е
 * ключам (Task A9.1 `resources.sourceIdsByKey`), а не из отдельного списка в
 * компоненте: статус объекта (`indexing`/`indexed`/`error`) уже живёт в
 * `useKnowledgeStore()` и меняется её же таймерами.
 */
const committedItems = computed(() => {
  if (!collection.value) {
    return [];
  }

  return Object.entries(resources.value.sourceIdsByKey)
    .map(([sourceKey, objectId]) => {
      const object = collection.value.objects.find((item) => item.id === objectId);

      return object
        ? {
          sourceKey,
          phase: objectPhase(object.status),
          kind: object.kind,
          name: object.name,
          sourceLabel: object.sourceLabel,
        }
        : null;
    })
    .filter(Boolean);
});

// Источники между «пользователь нажал добавить» и «источник стал реальным
// fixture-объектом» — по-настоящему client-only состояние без стабильного
// id, поэтому не часть draft'а: ничего не создаётся, если компонент
// размонтируется раньше, чем сработает `commitPending`.
const pendingItems = reactive([]);

const displayItems = computed(() => [...pendingItems, ...committedItems.value]);

function scheduleSettle(objectId, collectionId) {
  const isEveryThird = committedItems.value.length % 3 === 2;

  setTimeout(() => {
    knowledgeStore.setObjectStatus(
      workspaceId.value,
      collectionId,
      objectId,
      isEveryThird ? "error" : "indexed",
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

  const result = wizardStore.addKnowledgeSource(workspaceId.value, pending.sourceKey, {
    name: pending.name,
    kind: pending.kind,
    size: pending.size,
    sourceLabel: pending.sourceLabel,
  });

  if (result.ok && result.object && result.created) {
    scheduleSettle(result.object.id, targetCollection.id);
  }
}

/**
 * Ключ источника выдаётся стором (`nextWizardSourceKey`), а не локальным
 * счётчиком компонента: `KnowledgeStep.vue` пересоздаётся при каждом уходе
 * на соседний шаг мастера и возврате назад, и локальный счётчик обнулялся бы
 * при каждом таком ремаунте — тогда первый источник после возврата получал
 * бы уже использованный ключ, и `addKnowledgeSource` молча вернула бы старый
 * объект вместо создания нового (Task A9.4 post-review fix).
 *
 * @param {{ name: string, kind: import("../../../../stores/knowledge").KnowledgeObjectKind, size?: number, sourceLabel?: string }} entry
 */
function queueSource(entry) {
  const sourceKey = wizardStore.nextWizardSourceKey(workspaceId.value);

  if (sourceKey == null) {
    return;
  }

  const pending = reactive({
    sourceKey,
    phase: "loading",
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
 * Повтор ошибки: возвращает существующий объект в обработку и — в отличие от
 * первичного добавления — детерминированно завершает её успехом. Ретрай не
 * создаёт нового источника и не трогает ключ (`.plan`: «дать повтор... не
 * сбрасывая остальные»).
 */
function retry(sourceKey) {
  const objectId = resources.value.sourceIdsByKey[sourceKey];
  const { collectionId } = resources.value;

  if (objectId == null || collectionId == null) {
    return;
  }

  knowledgeStore.setObjectStatus(workspaceId.value, collectionId, objectId, "indexing");
  setTimeout(() => {
    knowledgeStore.setObjectStatus(workspaceId.value, collectionId, objectId, "indexed");
  }, 1200);
}

/**
 * Удаление источника из draft'а не затрагивает другие коллекции/агентов
 * (`.plan`) — `removeKnowledgeSource` работает только в пределах коллекции
 * текущего draft'а.
 */
function removeSource(sourceKey) {
  wizardStore.removeKnowledgeSource(workspaceId.value, sourceKey);
}

/**
 * «Заменить» удаляет прежний источник и открывает тот же способ добавления
 * заново — при этом старое название переносится в форму как отправная точка
 * для текста/ссылки, а для файла просто освобождает место для нового
 * перетаскивания в уже видимую зону загрузки выше.
 */
function replaceSource(sourceKey) {
  const objectId = resources.value.sourceIdsByKey[sourceKey];
  const object = collection.value?.objects.find((item) => item.id === objectId);

  removeSource(sourceKey);

  if (!object) {
    return;
  }

  if (object.kind !== "file") {
    openForm(object.kind === "text" ? "text" : "url", { name: object.name });
  }
}

</script>
