<template>
  <section class="tr-knowledge">
    <header
      v-if="!selectedCollection"
      class="tr-knowledge__page-header tr-page-toolbar"
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
    </header>

    <section
      v-if="!selectedCollection"
      class="tr-knowledge__catalog"
      aria-label="Коллекции знаний"
    >
      <div class="tr-knowledge__grid">
        <button
          v-for="collection in filteredCollections"
          :key="collection.id"
          class="tr-card tr-knowledge-card"
          type="button"
          @click="selectedId = collection.id"
        >
          <span class="tr-knowledge-card__header">
            <span class="tr-knowledge-card__icon">
              <b-icon
                :icon="getCollectionType(collection.type).icon"
                size="is-medium"
              />
            </span>
            <b-tag size="is-small">
              {{ getCollectionType(collection.type).label }}
            </b-tag>
          </span>

          <strong class="tr-knowledge-card__title">
            {{ collection.name }}
          </strong>
          <span class="tr-knowledge-card__description">
            {{ collection.description }}
          </span>

          <span class="tr-knowledge-card__footer">
            <span>{{ collection.items.length }} элементов</span>
            <b-icon icon="arrow-right" size="is-small" />
          </span>
        </button>

        <p
          v-if="filteredCollections.length === 0 && hasActiveFilters"
          class="tr-knowledge__not-found"
        >
          По вашему запросу коллекции не найдены.
        </p>

        <button
          class="tr-card tr-knowledge-card tr-knowledge-card--create"
          type="button"
          @click="openCreateModal"
        >
          <span class="tr-knowledge-card__create-icon">
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
.tr-knowledge__catalog {
  min-height: 0;
  overflow-y: auto;
  padding: 2px;
}

.tr-knowledge__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  padding-bottom: 1rem;
}

.tr-knowledge-card {
  min-width: 0;
  min-height: 220px;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--tr-text);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.tr-knowledge-card:hover {
  border-color: var(--tr-primary);
  transform: translateY(-2px);
}

.tr-knowledge-card:focus-visible {
  outline: 3px solid rgb(142 100 206 / 0.24);
  outline-offset: 2px;
}

.tr-knowledge-card__header,
.tr-knowledge-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tr-knowledge-card__icon,
.tr-knowledge-card__create-icon {
  display: inline-grid;
  place-items: center;
  color: var(--tr-primary);
  background: transparent;
  border: 0;
}

.tr-knowledge-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 0.75rem;
}

.tr-knowledge-card__title {
  overflow: hidden;
  color: var(--tr-text-strong);
  font-size: 1.125rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tr-knowledge-card__description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--tr-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.tr-knowledge-card__footer {
  margin-top: auto;
  padding-top: 0.75rem;
  color: var(--tr-text-muted);
  border-top: 1px solid var(--tr-divider);
  font-size: 0.75rem;
}

.tr-knowledge-card--create {
  align-items: center;
  justify-content: center;
  color: var(--tr-text-muted);
  text-align: center;
  background: transparent;
  border-style: dashed;
  box-shadow: none;
}

.tr-knowledge-card--create strong {
  color: var(--tr-text-strong);
  font-size: 1.125rem;
  font-weight: 600;
}

.tr-knowledge-card--create > span:last-child {
  max-width: 280px;
}

.tr-knowledge-card__create-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.tr-knowledge__not-found {
  min-height: 220px;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 1.25rem;
}

.tr-knowledge > .tr-knowledge__details {
  flex: 1;
}

@media (max-width: 1024px) {
  .tr-knowledge__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .tr-knowledge__grid {
    grid-template-columns: 1fr;
  }

  .tr-knowledge-card {
    min-height: 200px;
  }

  .tr-knowledge > .tr-knowledge__details {
    min-height: 560px;
  }
}
</style>
