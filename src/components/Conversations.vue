<template>
  <section class="tr-workbench-page">
    <header
      v-if="conversations.length > 0"
      class="tr-workbench-page__header"
    >
      <h1>Диалоги</h1>
    </header>

    <section v-if="conversations.length === 0" class="tr-section-empty">
      <b-icon icon="message-outline" size="is-large" />
      <strong>Диалогов пока нет</strong>
      <span>Новые диалоги появятся после обращения пользователей.</span>
    </section>

    <section
      v-else
      class="tr-conversations"
      :class="[
        `is-${viewMode}-view`,
        { 'is-properties-open': isPropertiesVisible },
      ]"
    >
    <aside class="tr-conversations__panel tr-conversations__list">
      <header class="tr-conversations__header">
        <div class="tr-conversations__search">
          <b-input
            v-model="query"
            icon="magnify"
            placeholder="Поиск по диалогам"
          />
        </div>
      </header>

      <nav class="tr-conversations__items" aria-label="Список диалогов">
        <button
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          class="tr-conversation-item"
          :class="{ 'is-active': conversation.id === selectedId }"
          type="button"
          :aria-pressed="conversation.id === selectedId"
          @click="selectConversation(conversation.id)"
        >
          <span class="tr-conversation-avatar">
            {{ conversation.initials }}
          </span>
          <span class="tr-conversation-item__content">
            <span class="tr-conversation-item__heading">
              <strong>{{ conversation.contact }}</strong>
              <small>{{ conversation.updated }}</small>
            </span>
            <span class="tr-conversation-item__preview">
              {{ conversation.preview }}
            </span>
            <span class="tr-conversation-item__channel">
              {{ conversation.channel }} · {{ conversation.agent }}
            </span>
          </span>
        </button>

        <p
          v-if="filteredConversations.length === 0"
          class="tr-conversations__empty"
        >
          Диалоги не найдены.
        </p>
      </nav>
    </aside>

    <article
      v-if="!selectedConversation"
      class="tr-conversations__placeholder"
    >
      <b-icon icon="message-text-outline" size="is-large" />
      <strong>Выберите диалог</strong>
      <span>Сообщения и свойства диалога появятся здесь.</span>
    </article>

    <article
      v-if="selectedConversation"
      class="tr-conversations__panel tr-conversations__chat"
    >
      <header class="tr-conversations__header">
        <b-button
          class="tr-conversations__list-action tr-conversations__icon-action"
          icon-left="arrow-left"
          aria-label="К диалогам"
          title="К диалогам"
          @click="viewMode = 'list'"
        />

        <div class="tr-conversations__identity">
          <span class="tr-conversation-avatar">
            {{ selectedConversation.initials }}
          </span>
          <span>
            <strong>{{ selectedConversation.contact }}</strong>
            <small>{{ selectedConversation.status }}</small>
          </span>
        </div>

        <b-button
          v-if="!isPropertiesVisible"
          class="tr-conversations__settings-action tr-conversations__icon-action"
          icon-left="cog-outline"
          aria-label="Открыть свойства диалога"
          title="Открыть свойства диалога"
          @click="openProperties"
        />
      </header>

      <div class="tr-conversations__messages" aria-live="polite">
        <div
          v-for="message in selectedConversation.messages"
          :key="message.id"
          class="tr-chat-message"
          :class="{ 'is-outgoing': message.outgoing }"
        >
          <p>{{ message.text }}</p>
          <small>{{ message.time }}</small>
        </div>
      </div>

      <footer class="tr-conversations__composer">
        <b-input
          v-model="draft"
          class="tr-conversations__composer-input"
          placeholder="Напишите сообщение"
          @keyup.enter="sendMessage"
        />
        <b-button
          type="is-primary"
          icon-left="send"
          aria-label="Отправить"
          @click="sendMessage"
        />
      </footer>
    </article>

    <aside
      v-if="selectedConversation"
      class="tr-conversations__panel tr-conversations__properties"
    >
      <header class="tr-conversations__header">
        <b-button
          class="tr-conversations__properties-action tr-conversations__icon-action"
          icon-left="arrow-left"
          aria-label="К диалогу"
          title="К диалогу"
          @click="viewMode = 'chat'"
        />
        <h2 class="tr-conversations__title">Свойства</h2>
        <b-button
          class="tr-conversations__properties-close tr-conversations__icon-action"
          icon-left="close"
          aria-label="Закрыть свойства диалога"
          title="Закрыть свойства диалога"
          @click="closeProperties"
        />
      </header>

      <div class="tr-conversations__properties-body">
        <div class="tr-conversations__profile">
          <img
            v-if="selectedConversation.avatarUrl"
            class="tr-conversations__profile-image"
            :src="selectedConversation.avatarUrl"
            :alt="selectedConversation.contact"
          />
          <strong>{{ selectedConversation.contact }}</strong>
          <span class="tr-muted">{{ selectedConversation.email }}</span>
        </div>

        <div class="tr-divider" />

        <b-field label="Агент">
          <b-select v-model="selectedConversation.agent" expanded>
            <option>Консультант</option>
            <option>Sales Assistant</option>
            <option>Support Bot</option>
          </b-select>
        </b-field>

        <dl class="tr-conversations__details">
          <div>
            <dt>Статус</dt>
            <dd>
              <b-tag
                :type="selectedConversation.status === 'Активен'
                  ? 'is-primary'
                  : undefined"
              >
                {{ selectedConversation.status }}
              </b-tag>
            </dd>
          </div>
          <div>
            <dt>Канал</dt>
            <dd>{{ selectedConversation.channel }}</dd>
          </div>
          <div>
            <dt>Создан</dt>
            <dd>{{ selectedConversation.created }}</dd>
          </div>
        </dl>
      </div>
    </aside>
    </section>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { useWorkspaceStore } from "../stores/workspace";

type ViewMode = "list" | "chat" | "properties";

interface ChatMessage {
  id: number;
  text: string;
  time: string;
  outgoing: boolean;
}

interface Conversation {
  id: number;
  contact: string;
  initials: string;
  avatarUrl?: string;
  email: string;
  channel: string;
  agent: string;
  status: string;
  updated: string;
  created: string;
  preview: string;
  messages: ChatMessage[];
}

const query = ref("");
const draft = ref("");
const selectedId = ref<number | null>(null);
const viewMode = ref<ViewMode>("list");
const propertiesOpen = ref(true);
const isWideLayout = ref(false);
let wideLayoutQuery: MediaQueryList | null = null;
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const demoConversations: Conversation[] = [
  {
    id: 1,
    contact: "Анна Смирнова",
    initials: "АС",
    email: "anna@example.com",
    channel: "Telegram",
    agent: "Консультант",
    status: "Активен",
    updated: "5 мин",
    created: "Сегодня, 10:24",
    preview: "Спасибо! Тогда оформляем доставку.",
    messages: [
      {
        id: 1,
        text: "Здравствуйте! Подскажите, есть ли доставка по Москве?",
        time: "10:24",
        outgoing: false,
      },
      {
        id: 2,
        text: "Здравствуйте! Да, доставляем курьером в течение двух дней.",
        time: "10:25",
        outgoing: true,
      },
      {
        id: 3,
        text: "Спасибо! Тогда оформляем доставку.",
        time: "10:27",
        outgoing: false,
      },
    ],
  },
  {
    id: 2,
    contact: "Михаил Орлов",
    initials: "МО",
    email: "m.orlov@example.com",
    channel: "Виджет",
    agent: "Sales Assistant",
    status: "Завершён",
    updated: "42 мин",
    created: "Сегодня, 09:41",
    preview: "Получил презентацию, вернусь с ответом.",
    messages: [
      {
        id: 1,
        text: "Можно получить презентацию продукта?",
        time: "09:41",
        outgoing: false,
      },
      {
        id: 2,
        text: "Конечно. Отправил ссылку на указанную почту.",
        time: "09:43",
        outgoing: true,
      },
    ],
  },
  {
    id: 3,
    contact: "support@example.com",
    initials: "SE",
    email: "support@example.com",
    channel: "Email",
    agent: "Support Bot",
    status: "Завершён",
    updated: "Вчера",
    created: "Вчера, 18:12",
    preview: "Проблема решена, благодарю за помощь.",
    messages: [
      {
        id: 1,
        text: "Не получается войти в личный кабинет.",
        time: "18:12",
        outgoing: false,
      },
      {
        id: 2,
        text: "Сбросил активные сессии. Попробуйте войти ещё раз.",
        time: "18:15",
        outgoing: true,
      },
    ],
  },
];

const conversationsByWorkspace = ref<Record<string, Conversation[]>>({
  demo: demoConversations,
  trickster: [
    {
      id: 1,
      contact: "Мария Волкова",
      initials: "МВ",
      email: "maria@trickster.team",
      channel: "Виджет",
      agent: "Trickster Concierge",
      status: "Активен",
      updated: "12 мин",
      created: "Сегодня, 11:08",
      preview: "Подскажите, как подключить новый канал?",
      messages: [
        {
          id: 1,
          text: "Подскажите, как подключить новый канал?",
          time: "11:08",
          outgoing: false,
        },
        {
          id: 2,
          text: "Откройте раздел «Каналы» и выберите нужную интеграцию.",
          time: "11:09",
          outgoing: true,
        },
      ],
    },
  ],
  empty: [],
});

const conversations = computed(
  () => conversationsByWorkspace.value[activeWorkspaceId.value] ?? [],
);

const selectedConversation = computed(
  () => conversations.value.find((item) => item.id === selectedId.value),
);

const isPropertiesVisible = computed(
  () => Boolean(selectedConversation.value)
    && (
      isWideLayout.value
        ? propertiesOpen.value
        : viewMode.value === "properties"
    ),
);

const filteredConversations = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  if (!search) {
    return conversations.value;
  }

  return conversations.value.filter((conversation) =>
    [
      conversation.contact,
      conversation.channel,
      conversation.agent,
      conversation.preview,
    ].some((value) => value.toLocaleLowerCase().includes(search)),
  );
});

function selectConversation(id: number): void {
  selectedId.value = id;
  viewMode.value = "chat";
}

watch(activeWorkspaceId, () => {
  selectedId.value = null;
  query.value = "";
  draft.value = "";
  viewMode.value = "list";
  propertiesOpen.value = true;
});

function openProperties(): void {
  if (isWideLayout.value) {
    propertiesOpen.value = true;
    return;
  }

  viewMode.value = "properties";
}

function closeProperties(): void {
  if (isWideLayout.value) {
    propertiesOpen.value = false;
    return;
  }

  viewMode.value = "chat";
}

function syncWideLayout(event: MediaQueryListEvent | MediaQueryList): void {
  isWideLayout.value = event.matches;
}

function sendMessage(): void {
  const text = draft.value.trim();
  const conversation = selectedConversation.value;

  if (!text || !conversation) {
    return;
  }

  conversation.messages.push({
    id: Date.now(),
    text,
    time: new Intl.DateTimeFormat("ru", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
    outgoing: true,
  });
  conversation.preview = text;
  conversation.updated = "Сейчас";
  draft.value = "";
}

onMounted(() => {
  wideLayoutQuery = window.matchMedia("(min-width: 1280px)");
  syncWideLayout(wideLayoutQuery);
  wideLayoutQuery.addEventListener("change", syncWideLayout);
});

onBeforeUnmount(() => {
  wideLayoutQuery?.removeEventListener("change", syncWideLayout);
});
</script>
