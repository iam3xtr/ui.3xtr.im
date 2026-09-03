<template>
  <section class="tr-workbench-page tr-knowledge">
    <header
      v-if="!selectedCollection"
      class="tr-workbench-page__header tr-page-toolbar"
    >
      <SearchField
        v-model="query"
        class="tr-page-toolbar__search"
        placeholder="Поиск коллекций"
      />

      <b-select
        v-model="typeFilter"
        class="tr-page-toolbar__filter"
        aria-label="Фильтр коллекций по типу"
        expanded
      >
        <option value="">Все типы</option>
        <option
          v-for="type in collectionTypes"
          :key="type.value"
          :value="type.value"
        >
          {{ type.label }}
        </option>
      </b-select>

      <MobileFilters :active="Boolean(typeFilter)">
        <b-field label="Тип коллекции">
          <b-select v-model="typeFilter" expanded>
            <option value="">Все типы</option>
            <option
              v-for="type in collectionTypes"
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </option>
          </b-select>
        </b-field>
      </MobileFilters>
    </header>

    <section
      v-if="!selectedCollection"
      class="tr-catalog"
      aria-label="Коллекции знаний"
    >
      <div class="tr-catalog__grid">
        <button
          v-for="collection in filteredCollections"
          :key="collection.id"
          class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive"
          type="button"
          @click="selectedId = collection.id"
        >
          <span class="tr-entity-card__header">
            <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__icon">
              <b-icon
                :icon="getCollectionType(collection.type).icon"
                size="is-medium"
              />
            </span>
            <b-tag size="is-small">
              {{ getCollectionType(collection.type).label }}
            </b-tag>
          </span>

          <strong class="tr-entity-card__title">
            {{ collection.name }}
          </strong>
          <span class="tr-entity-card__description">
            {{ collection.description }}
          </span>

          <span class="tr-entity-card__footer">
            <span>{{ collection.items.length }} элементов</span>
            <b-icon icon="arrow-right" size="is-small" />
          </span>
        </button>

        <p
          v-if="filteredCollections.length === 0 && hasActiveFilters"
          class="tr-catalog__empty"
        >
          По вашему запросу коллекции не найдены.
        </p>

        <button
          class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive tr-entity-card--create"
          type="button"
          @click="openCreateModal"
        >
          <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__create-icon">
            <b-icon icon="plus" size="is-medium" />
          </span>
          <strong>Создать новую коллекцию</strong>
          <span>Добавьте файлы, ссылки или Markdown-документы.</span>
        </button>
      </div>
    </section>

    <article v-if="selectedCollection" class="tr-knowledge__details">
      <header class="tr-knowledge__details-header">
        <b-button
          icon-left="arrow-left"
          aria-label="К коллекциям"
          title="К коллекциям"
          @click="showCollectionCatalog"
        />
        <span class="tr-icon-tile">
          <b-icon
            :icon="getCollectionType(selectedCollection.type).icon"
            size="is-small"
          />
        </span>
        <div>
          <h2>{{ selectedCollection.name }}</h2>
          <p>{{ selectedCollection.description }}</p>
        </div>
        <b-tag>{{ getCollectionType(selectedCollection.type).label }}</b-tag>
      </header>

      <div class="tr-knowledge__toolbar">
        <span>
          {{ selectedCollection.items.length }} элементов
        </span>
        <b-button icon-left="plus" size="is-small">
          Добавить элемент
        </b-button>
      </div>

      <div
        v-if="selectedCollection.items.length"
        class="tr-knowledge__items"
      >
        <div
          v-for="item in selectedCollection.items"
          :key="item.id"
          class="tr-knowledge__item"
        >
          <span class="tr-knowledge__item-icon">
            <b-icon :icon="getItemType(item.type).icon" />
          </span>
          <span class="tr-knowledge__item-copy">
            <strong>{{ item.name }}</strong>
            <small>{{ item.source }}</small>
          </span>
          <b-tag size="is-small">{{ getItemType(item.type).label }}</b-tag>
          <time>{{ item.updated }}</time>
          <b-button
            type="is-text"
            icon-left="dots-horizontal"
            aria-label="Действия с элементом"
          />
        </div>
      </div>

      <div v-else class="tr-knowledge__items-empty">
        <b-icon icon="file-plus-outline" size="is-large" />
        <strong>В коллекции пока нет элементов</strong>
        <span>Добавьте файл, ссылку или Markdown-документ.</span>
      </div>
    </article>
  </section>

  <b-modal v-model="isCreateOpen" has-modal-card>
    <form class="modal-card" @submit.prevent="createCollection">
      <header class="modal-card-head">
        <p class="modal-card-title">Новая коллекция</p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="isCreateOpen = false"
        />
      </header>

      <section class="modal-card-body">
        <b-field label="Название">
          <b-input
            v-model="newCollectionName"
            placeholder="Например, Документация продукта"
            required
          />
        </b-field>

        <b-field label="Тип коллекции">
          <b-select v-model="newCollectionType" expanded>
            <option
              v-for="type in collectionTypes"
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </option>
          </b-select>
        </b-field>

        <div class="tr-knowledge__type-hint">
          <b-icon :icon="selectedTypeInfo.icon" />
          <span>
            <strong>{{ selectedTypeInfo.label }}</strong>
            <small>{{ selectedTypeInfo.description }}</small>
          </span>
        </div>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="isCreateOpen = false">Отмена</b-button>
        <b-button native-type="submit" type="is-primary">
          Создать
        </b-button>
      </footer>
    </form>
  </b-modal>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import { useWorkspaceStore } from "../stores/workspace";
import MobileFilters from "./MobileFilters.vue";
import SearchField from "./SearchField.vue";

type CollectionType =
  | "mixed"
  | "website"
  | "files"
  | "links"
  | "markdown"
  | "faq";
type KnowledgeItemType = "file" | "link" | "markdown";

interface KnowledgeItem {
  id: number;
  name: string;
  type: KnowledgeItemType;
  source: string;
  updated: string;
}

interface KnowledgeCollection {
  id: number;
  name: string;
  description: string;
  type: CollectionType;
  items: KnowledgeItem[];
}

const collectionTypes = [
  {
    value: "mixed",
    label: "Универсальная",
    icon: "folder-multiple-outline",
    description: "Файлы, ссылки и Markdown-документы в одной коллекции.",
  },
  {
    value: "website",
    label: "Сайт",
    icon: "web",
    description: "Страницы сайта, автоматически полученные при обходе.",
  },
  {
    value: "files",
    label: "Файлы",
    icon: "file-multiple-outline",
    description: "PDF, DOCX, таблицы, презентации и другие документы.",
  },
  {
    value: "links",
    label: "Ссылки",
    icon: "link-variant",
    description: "Отдельные веб-страницы и внешние материалы.",
  },
  {
    value: "markdown",
    label: "Markdown",
    icon: "language-markdown-outline",
    description: "Текстовые документы, которые редактируются прямо в системе.",
  },
  {
    value: "faq",
    label: "FAQ",
    icon: "frequently-asked-questions",
    description: "Структурированные пары вопросов и ответов.",
  },
] as const;

const itemTypes = {
  file: { label: "Файл", icon: "file-outline" },
  link: { label: "Ссылка", icon: "link-variant" },
  markdown: { label: "Markdown", icon: "language-markdown-outline" },
} satisfies Record<KnowledgeItemType, { label: string; icon: string }>;

const collectionsByWorkspace = ref<Record<string, KnowledgeCollection[]>>({
  demo: [
    {
      id: 1,
      name: "Документация продукта",
      description: "Публичная документация и инструкции для пользователей.",
      type: "website",
      items: [
        {
          id: 1,
          name: "Начало работы",
          type: "link",
          source: "docs.example.com/getting-started",
          updated: "10 мин",
        },
        {
          id: 2,
          name: "Настройка интеграций",
          type: "link",
          source: "docs.example.com/integrations",
          updated: "10 мин",
        },
      ],
    },
    {
      id: 2,
      name: "Материалы отдела продаж",
      description: "Презентации, тарифы и заметки для Sales Assistant.",
      type: "mixed",
      items: [
        {
          id: 3,
          name: "Презентация продукта.pdf",
          type: "file",
          source: "PDF · 4,8 MB",
          updated: "Вчера",
        },
        {
          id: 4,
          name: "Актуальные тарифы",
          type: "link",
          source: "example.com/pricing",
          updated: "Вчера",
        },
        {
          id: 5,
          name: "Аргументы для переговоров",
          type: "markdown",
          source: "Внутренний документ",
          updated: "3 дня",
        },
      ],
    },
    {
      id: 3,
      name: "Регламенты поддержки",
      description: "Внутренние инструкции службы поддержки.",
      type: "files",
      items: [
        {
          id: 6,
          name: "Регламент первой линии.docx",
          type: "file",
          source: "DOCX · 820 KB",
          updated: "5 дней",
        },
      ],
    },
    {
      id: 4,
      name: "Частые вопросы",
      description: "Проверенные ответы на типовые вопросы клиентов.",
      type: "faq",
      items: [],
    },
  ],
  trickster: [
    {
      id: 1,
      name: "Trickster Docs",
      description: "Документация команды Trickster.",
      type: "website",
      items: [
        {
          id: 1,
          name: "Рабочие пространства",
          type: "link",
          source: "docs.3xtr.im/workspaces",
          updated: "Сегодня",
        },
      ],
    },
  ],
  empty: [],
});

const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const query = ref("");
const typeFilter = ref<CollectionType | "">("");
const selectedId = ref<number | null>(null);
const isCreateOpen = ref(false);
const newCollectionName = ref("");
const newCollectionType = ref<CollectionType>("mixed");

const collections = computed(
  () => collectionsByWorkspace.value[activeWorkspaceId.value] ?? [],
);
const selectedCollection = computed(
  () => collections.value.find((collection) => collection.id === selectedId.value),
);
const selectedTypeInfo = computed(
  () => getCollectionType(newCollectionType.value),
);
const hasActiveFilters = computed(
  () => Boolean(query.value.trim() || typeFilter.value),
);
const filteredCollections = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  return collections.value.filter((collection) => {
    const matchesSearch = !search
      || [collection.name, collection.description]
        .some((value) => value.toLocaleLowerCase().includes(search));
    const matchesType = !typeFilter.value
      || collection.type === typeFilter.value;

    return matchesSearch && matchesType;
  });
});

function getCollectionType(type: CollectionType) {
  return collectionTypes.find((item) => item.value === type)
    ?? collectionTypes[0];
}

function getItemType(type: KnowledgeItemType) {
  return itemTypes[type];
}

function showCollectionCatalog(): void {
  selectedId.value = null;
}

function openCreateModal(): void {
  newCollectionName.value = "";
  newCollectionType.value = "mixed";
  isCreateOpen.value = true;
}

function createCollection(): void {
  const name = newCollectionName.value.trim();

  if (!name) {
    return;
  }

  const workspaceId = activeWorkspaceId.value;
  const workspaceCollections = collectionsByWorkspace.value[workspaceId]
    ?? (collectionsByWorkspace.value[workspaceId] = []);
  const id = Date.now();

  workspaceCollections.push({
    id,
    name,
    type: newCollectionType.value,
    description: getCollectionType(newCollectionType.value).description,
    items: [],
  });
  selectedId.value = id;
  isCreateOpen.value = false;
}

watch(
  activeWorkspaceId,
  () => {
    query.value = "";
    typeFilter.value = "";
    selectedId.value = null;
  },
  { flush: "sync" },
);
</script>

<style scoped lang="scss">
.tr-knowledge > .tr-knowledge__details {
  flex: 1;
}

@media (max-width: 768px) {
  .tr-knowledge > .tr-knowledge__details {
    min-height: 560px;
  }
}
</style>
