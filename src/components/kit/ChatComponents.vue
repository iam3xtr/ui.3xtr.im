<template>
  <!--
    Stage 3 chat components (.plan этап 3 «Публичные история чата и
    composer»), дополненные на этапе 5 оставшимися публичными exports
    (`KitModelSelect`, `KitNavbarTabs`, `KitDropdownOverlay` ниже):
    публичные ChatHistory и MessageComposer из @iam3xtr/vue
    с consumer-owned slot-ами, controlled draft и auto-grow геометрией.
    Каждое состояние (обычная переписка, outgoing message, custom body,
    status slot, multiline draft, busy, disabled, empty state) выведено
    через один работающий пример — без отдельных showcase-блоков, как
    и остальные страницы `/kit`.

    Все видимые строки и slot-ы приходят из kit-consumer-а (этот
    компонент); package не вставляет собственных user-facing строк и
    не знает ни одной fixture. Это и есть доказанный i18n-neutral
    contract из ui.3xtr.im#15.
  -->
  <PageHeader
    title="Vue-компоненты"
    subtitle="Публичные ChatHistory, MessageComposer, ModelSelect, NavbarTabs и overlay composable из @iam3xtr/vue: рабочие варианты, API и места применения."
  />

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">ChatHistory + MessageComposer</h2>
    <p class="tr-muted mb-4">
      Один работающий диалог из двух public-компонентов. Текст,
      метаданные, иконка отправки и пустое состояние — slot-ы,
      заполняемые потребителем. Нажмите Enter или кнопку «отправить»
      — оба пути эмитят один и тот же <code>submit</code> с trimmed
      draft, после чего consumer сам сбрасывает v-model.
    </p>

    <div class="tr-chat-kit">
      <ChatHistory
        :messages="messages"
        aria-label="Демо диалог"
      >
        <template #metadata="{ message }">
          <span class="tr-chat-kit__meta">@{{ message.author }}</span>
        </template>
        <template #status="{ message }">
          <span
            v-if="message.status === 'sent'"
            class="tr-chat-kit__status tr-chat-kit__status--sent"
          >
            доставлено
          </span>
          <span
            v-else-if="message.status === 'pending'"
            class="tr-chat-kit__status tr-chat-kit__status--pending"
          >
            отправляется…
          </span>
        </template>
      </ChatHistory>

      <MessageComposer
        v-model="draft"
        class="tr-chat-kit__composer"
        :busy="busy"
        :disabled="disabled"
        placeholder="Напишите сообщение…"
        textarea-aria-label="Сообщение"
        submit-aria-label="Отправить сообщение"
        aria-label="Поле ввода сообщения"
        @submit="onSend"
      >
        <template #submit-icon>
          <span class="tr-chat-kit__send-icon" aria-hidden="true">➤</span>
        </template>
      </MessageComposer>

      <div class="tr-chat-kit__toolbar">
        <b-checkbox v-model="busy">
          busy
        </b-checkbox>
        <b-checkbox v-model="disabled">
          disabled
        </b-checkbox>
        <b-button size="is-small" @click="reset">
          Очистить
        </b-button>
      </div>
    </div>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">ChatHistory: empty state</h2>
    <p class="tr-muted mb-4">
      Без встроенного user-facing copy. Этот вариант передаёт
      <code>#empty</code> slot; вариант выше просто не показывает
      список, потому что <code>messages</code> пуст.
    </p>

    <ChatHistory
      :messages="emptyMessages"
      class="tr-chat-kit__empty"
      aria-label="Пустой диалог"
    >
      <template #empty>
        <p class="tr-chat-kit__empty-text">
          Сообщений ещё нет — начните диалог выше.
        </p>
      </template>
    </ChatHistory>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">MessageComposer: multiline draft</h2>
    <p class="tr-muted mb-4">
      Тот же компонент с предзаполненным multi-line v-model — auto-grow
      поднимает textarea до package-уровневого <code>max-height: 100px</code>,
      после чего composer сам прокручивается внутри (см. CSS rule
      <code>.tr-message-composer__textarea</code> в <code>@iam3xtr/ui</code>).
      Итоговую геометрию проверяет реальный браузер; v-model проходит
      сквозь textarea дословно.
    </p>

    <MessageComposer
      v-model="multilineDraft"
      class="tr-chat-kit__composer-multiline"
      placeholder="Длинный текст…"
      textarea-aria-label="Длинное сообщение"
      submit-aria-label="Отправить"
      aria-label="Поле длинного сообщения"
    />
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Публичный API</h2>
    <p class="tr-muted mb-4">
      Оба компонента импортируются из <code>@iam3xtr/vue</code>. Краткая
      сводка props/events/slots для этого каталога:
    </p>

    <h3 class="tr-card__subtitle">ChatHistory</h3>
    <ul class="tr-muted">
      <li>
        Импорт: <code>import { ChatHistory } from "@iam3xtr/vue";</code>
      </li>
      <li>
        Props: <code>messages</code> (обязателен, <code>{id, text, outgoing}</code>),
        <code>ariaLabel</code> (опционально), <code>ariaLive</code>
        (по умолчанию <code>"polite"</code>).
      </li>
      <li>
        Slots: <code>#body</code> (scoped <code>{ message }</code>),
        <code>#metadata</code> (scoped <code>{ message }</code>),
        <code>#status</code> (scoped <code>{ message }</code>),
        <code>#empty</code> (no scope).
      </li>
      <li>
        Событий и v-model нет — компонент pure-render, не трогает
        messages, не знает store и не знает retry/handoff.
      </li>
      <li>
        Консьюмерские места применения в этом демо:
        <RouterLink :to="{ name: 'conversation', params: { agentId: 1, conversationId: 1 } }">
          история диалога
        </RouterLink>,
        <RouterLink :to="{ name: 'agent', params: { id: 1 } }">
          песочница агента
        </RouterLink>,
        <RouterLink :to="{ name: 'agent-wizard', params: { step: 'sandbox' } }">
          шаг «Песочница» мастера создания агента
        </RouterLink>
        (если шаг ещё недостижим для текущего черновика, мастер откроет
        его актуальный шаг).
      </li>
    </ul>

    <h3 class="tr-card__subtitle mt-4">MessageComposer</h3>
    <ul class="tr-muted">
      <li>
        Импорт: <code>import { MessageComposer } from "@iam3xtr/vue";</code>
      </li>
      <li>
        Props: <code>v-model</code> (controlled draft, обязателен),
        <code>disabled</code>, <code>busy</code>,
        <code>placeholder</code>, <code>ariaLabel</code>,
        <code>textareaAriaLabel</code>, <code>submitAriaLabel</code>.
      </li>
      <li>
        Events: <code>update:modelValue</code>,
        <code>submit</code> (payload — trimmed непустой draft; не
        очищается пакетом — потребитель сам сбрасывает v-model).
      </li>
      <li>
        Slots: <code>#submit-icon</code> (no scope).
      </li>
      <li>
        Keyboard/IME: Enter без Shift → submit; Shift+Enter →
        newline; IME composition игнорируется во время набора.
        Mobile send button использует ту же <code>submit</code> логику.
      </li>
      <li>
        Геометрия: <code>.tr-message-composer__textarea</code> имеет
        <code>min-height</code> (один ряд), <code>max-height: 100px</code>
        и <code>overflow-y: auto</code>; auto-grow через
        <code>requestAnimationFrame</code> на каждом input и внешнем
        изменении <code>modelValue</code>.
      </li>
      <li>
        Консьюмерские места применения: те же три демо-экрана, что и
        ChatHistory.
      </li>
    </ul>
  </section>

  <KitModelSelect />
  <KitNavbarTabs />
  <KitDropdownOverlay />
</template>

<script setup>
import { ref } from "vue";

import { ChatHistory, MessageComposer } from "@iam3xtr/vue";
import { PageHeader } from "@iam3xtr/vue/navigation";

import KitDropdownOverlay from "./KitDropdownOverlay.vue";
import KitModelSelect from "./KitModelSelect.vue";
import KitNavbarTabs from "./KitNavbarTabs.vue";

// Initial demo transcript: a small inbound/outbound conversation with
// mixed statuses so the metadata/status slots have something to render.
// The component ships no built-in copy, so every visible string lives
// here, in the kit consumer.
const messages = ref([
  { id: "m1", text: "Здравствуйте, чем могу помочь?", outgoing: false, author: "agent", status: "sent" },
  { id: "m2", text: "Хочу проверить статус заказа.", outgoing: true, author: "вы", status: "sent" },
  { id: "m3", text: "Уточните, пожалуйста, номер заказа.", outgoing: false, author: "agent", status: "pending" },
  { id: "m4", text: "Многострочное\nсообщение с\nпереносами строк.", outgoing: true, author: "вы", status: "sent" },
]);

const draft = ref("");
const busy = ref(false);
const disabled = ref(false);
const multilineDraft = ref("Длинный черновик\nс тремя строками\nтекста для проверки auto-grow.");

function onSend(text) {
  if (!text) return;
  messages.value = [
    ...messages.value,
    {
      id: `u-${Date.now()}`,
      text,
      outgoing: true,
      author: "вы",
      status: "pending",
    },
  ];
  // Consumer-owned draft clearing: package never clears it itself.
  draft.value = "";
}

function reset() {
  messages.value = [];
  draft.value = "";
}

const emptyMessages = ref([]);
</script>

<!--
  kit-style-exception: эти правила — узкоспециализированные demo-хелперы
  для `/kit/chat`: расположение composer под ChatHistory, видимый
  toolbar с `busy`/`disabled` тогглами, цветной статус-чип. Сами
  публичные компоненты используют общий `.tr-chat-history*` /
  `.tr-message-composer*` namespace в `@iam3xtr/ui`; здесь только
  сборка showcase, не часть публичного contract.
-->
<style scoped>
.tr-chat-kit {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-large);
  overflow: hidden;
  background: var(--tr-surface-2);
}

.tr-chat-kit :deep(.tr-chat-history) {
  min-height: 14rem;
  max-height: 22rem;
  overflow-y: auto;
}

.tr-chat-kit__composer {
  border-top: 1px solid var(--tr-divider);
}

.tr-chat-kit__composer-multiline {
  border-top: 1px solid var(--tr-divider);
}

.tr-chat-kit__toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--tr-surface-1);
  border-top: 1px solid var(--tr-divider);
  font-size: 0.875rem;
}

.tr-chat-kit__meta {
  color: var(--tr-text-muted);
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

.tr-chat-kit__status {
  font-size: 0.75rem;
  padding: 0 0.5rem;
  border-radius: var(--tr-radius-rounded);
}

.tr-chat-kit__status--sent {
  color: var(--tr-success);
}

.tr-chat-kit__status--pending {
  color: var(--tr-warning);
}

.tr-chat-kit__send-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.tr-chat-kit__empty {
  min-height: 6rem;
}

.tr-chat-kit__empty-text {
  margin: 0;
  color: var(--tr-text-muted);
  font-size: 0.875rem;
}
</style>