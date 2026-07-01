<template>
  <section
    class="tr-conversations tr-agents"
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
            placeholder="Поиск по агентам"
          />
        </div>
      </header>

      <nav class="tr-conversations__items" aria-label="Список агентов">
        <button
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="tr-conversation-item"
          :class="{ 'is-active': agent.id === selectedId }"
          type="button"
          :aria-pressed="agent.id === selectedId"
          @click="selectAgent(agent.id)"
        >
          <span class="tr-conversation-avatar">
            <b-icon icon="robot-outline" size="is-small" />
          </span>
          <span class="tr-conversation-item__content">
            <span class="tr-conversation-item__heading">
              <strong>{{ agent.name }}</strong>
              <small>{{ agent.updated }}</small>
            </span>
            <span class="tr-conversation-item__preview">
              {{ agent.description }}
            </span>
            <span class="tr-conversation-item__channel">
              {{ agent.model }} · {{ agent.status }}
            </span>
          </span>
        </button>

        <p
          v-if="filteredAgents.length === 0"
          class="tr-conversations__empty"
        >
          Агенты не найдены.
        </p>
      </nav>
    </aside>

    <article
      v-if="!selectedAgent"
      class="tr-conversations__panel tr-conversations__placeholder"
    >
      <b-icon icon="robot-outline" size="is-large" />
      <strong>Выберите агента</strong>
      <span>Песочница и настройки агента появятся здесь.</span>
    </article>

    <article
      v-if="selectedAgent"
      class="tr-conversations__panel tr-conversations__chat"
    >
      <header class="tr-conversations__header">
        <b-button
          class="tr-conversations__list-action tr-conversations__icon-action"
          icon-left="arrow-left"
          aria-label="К агентам"
          title="К агентам"
          @click="viewMode = 'list'"
        />

        <div class="tr-conversations__identity">
          <span class="tr-conversation-avatar">
            <b-icon icon="robot-outline" size="is-small" />
          </span>
          <span>
            <strong>{{ selectedAgent.name }}</strong>
            <small>{{ selectedAgent.status }}</small>
          </span>
        </div>

        <b-button
          v-if="!isPropertiesVisible"
          class="tr-conversations__settings-action tr-conversations__icon-action"
          icon-left="cog-outline"
          aria-label="Открыть настройки агента"
          title="Открыть настройки агента"
          @click="openProperties"
        />
      </header>

      <div class="tr-conversations__messages" aria-live="polite">
        <div class="tr-agents__sandbox-note">
          <b-icon icon="flask-outline" size="is-small" />
          Сообщения здесь не попадут в реальные диалоги.
        </div>

        <div
          v-for="message in selectedAgent.messages"
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
          placeholder="Сообщение для агента"
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
      v-if="selectedAgent"
      class="tr-conversations__panel tr-conversations__properties"
    >
      <header class="tr-conversations__header">
        <b-button
          class="tr-conversations__properties-action tr-conversations__icon-action"
          icon-left="arrow-left"
          aria-label="К песочнице"
          title="К песочнице"
          @click="viewMode = 'chat'"
        />
        <h2 class="tr-conversations__title">Настройки</h2>
        <b-button
          class="tr-conversations__properties-close tr-conversations__icon-action"
          icon-left="close"
          aria-label="Закрыть настройки агента"
          title="Закрыть настройки агента"
          @click="closeProperties"
        />
      </header>

      <div class="tr-conversations__properties-body">
        <b-field label="Название">
          <b-input v-model="selectedAgent.name" />
        </b-field>

        <b-field label="Статус">
          <b-select v-model="selectedAgent.status" expanded>
            <option>Активен</option>
            <option>Черновик</option>
            <option>Приостановлен</option>
          </b-select>
        </b-field>

        <b-field label="Модель">
          <b-select v-model="selectedAgent.model" expanded>
            <option>GPT-4.1 mini</option>
            <option>GPT-4.1</option>
            <option>GPT-4o mini</option>
          </b-select>
        </b-field>

        <b-field label="Температура">
          <b-slider
            v-model="selectedAgent.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            :tooltip="true"
          />
        </b-field>

        <b-field label="Системная инструкция">
          <b-input
            v-model="selectedAgent.instructions"
            type="textarea"
            rows="7"
          />
        </b-field>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

type ViewMode = "list" | "chat" | "properties";

interface SandboxMessage {
  id: number;
  text: string;
  time: string;
  outgoing: boolean;
}

interface Agent {
  id: number;
  name: string;
  description: string;
  model: string;
  status: string;
  updated: string;
  temperature: number;
  instructions: string;
  messages: SandboxMessage[];
}

const query = ref("");
const draft = ref("");
const selectedId = ref<number | null>(null);
const viewMode = ref<ViewMode>("list");
const propertiesOpen = ref(true);
const isWideLayout = ref(false);
let wideLayoutQuery: MediaQueryList | null = null;

const agents = ref<Agent[]>([
  {
    id: 1,
    name: "Консультант",
    description: "Отвечает на вопросы клиентов о продуктах и доставке.",
    model: "GPT-4.1 mini",
    status: "Активен",
    updated: "2 ч",
    temperature: 0.4,
    instructions: "Помогай клиентам выбрать продукт. Отвечай кратко и по делу.",
    messages: [
      {
        id: 1,
        text: "Здравствуйте! Чем я могу помочь?",
        time: "10:24",
        outgoing: false,
      },
    ],
  },
  {
    id: 2,
    name: "Sales Assistant",
    description: "Квалифицирует лиды и готовит персональные предложения.",
    model: "GPT-4.1",
    status: "Черновик",
    updated: "Вчера",
    temperature: 0.6,
    instructions: "Уточняй задачу клиента и предлагай подходящий тариф.",
    messages: [],
  },
  {
    id: 3,
    name: "Support Bot",
    description: "Помогает решать типовые технические вопросы.",
    model: "GPT-4o mini",
    status: "Приостановлен",
    updated: "3 д",
    temperature: 0.2,
    instructions: "Используй базу знаний и запрашивай детали ошибки.",
    messages: [],
  },
]);

const selectedAgent = computed(
  () => agents.value.find((agent) => agent.id === selectedId.value),
);

const isPropertiesVisible = computed(
  () => Boolean(selectedAgent.value)
    && (
      isWideLayout.value
        ? propertiesOpen.value
        : viewMode.value === "properties"
    ),
);

const filteredAgents = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();

  if (!search) {
    return agents.value;
  }

  return agents.value.filter((agent) =>
    [
      agent.name,
      agent.description,
      agent.model,
      agent.status,
    ].some((value) => value.toLocaleLowerCase().includes(search)),
  );
});

function selectAgent(id: number): void {
  selectedId.value = id;
  viewMode.value = "chat";
}

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

function sendMessage(): void {
  const text = draft.value.trim();
  const agent = selectedAgent.value;

  if (!text || !agent) {
    return;
  }

  const now = new Intl.DateTimeFormat("ru", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const messageId = Date.now();

  agent.messages.push({
    id: messageId,
    text,
    time: now,
    outgoing: true,
  });
  agent.messages.push({
    id: messageId + 1,
    text: "Тестовый ответ агента на сообщение оператора.",
    time: now,
    outgoing: false,
  });
  agent.updated = "Сейчас";
  draft.value = "";
}

function syncWideLayout(event: MediaQueryListEvent | MediaQueryList): void {
  isWideLayout.value = event.matches;
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
