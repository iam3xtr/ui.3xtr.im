<template>
  <section
    class="tr-conversations"
    :class="`is-${viewMode}-view`"
  >
    <aside class="tr-conversations__panel tr-conversations__list">
      <header class="tr-conversations__header">
        <h1 class="tr-conversations__title">Диалоги</h1>
      </header>

      <div class="tr-conversations__search">
        <b-input
          v-model="query"
          icon="magnify"
          placeholder="Поиск по диалогам"
        />
      </div>

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
      v-if="selectedConversation"
      class="tr-conversations__panel tr-conversations__chat"
    >
      <header class="tr-conversations__header">
        <b-button
          class="tr-conversations__list-action"
          icon-left="arrow-left"
          size="is-small"
          @click="viewMode = 'list'"
        >
          К списку
        </b-button>

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
          v-if="viewMode !== 'properties'"
          class="tr-conversations__settings-action"
          icon-left="cog-outline"
          size="is-small"
          @click="viewMode = 'properties'"
        >
          Настройки
        </b-button>
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
          class="tr-conversations__properties-action"
          icon-left="arrow-left"
          size="is-small"
          @click="viewMode = 'chat'"
        >
          К диалогу
        </b-button>
        <h2 class="tr-conversations__title">Свойства</h2>
      </header>

      <div class="tr-conversations__properties-body">
        <div class="tr-conversations__profile">
          <span class="tr-conversation-avatar is-large">
            {{ selectedConversation.initials }}
          </span>
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
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

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
const selectedId = ref(1);
const viewMode = ref<ViewMode>("list");

const conversations = ref<Conversation[]>([
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
]);

const selectedConversation = computed(
  () => conversations.value.find((item) => item.id === selectedId.value),
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
</script>
