<template>
  <article
    class="tr-card tr-card--interactive tr-entity-card"
    :aria-label="`Канал ${channel.name}`"
    :data-state="channel.status"
  >
    <header class="tr-entity-card__header">
      <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__icon">
        <b-icon icon="send-outline" size="is-medium" />
      </span>
      <b-switch
        :key="`${switchId}-${lifecycle.syncKey}`"
        class="tr-entity-card__lifecycle"
        :model-value="lifecycle.checked"
        :disabled="lifecycle.disabled"
        :aria-busy="lifecycle.pending ? 'true' : undefined"
        :title="enabledLabel"
        @update:model-value="emit('toggle', channel, $event)"
      >
        <span class="is-sr-only">{{ channel.name }}: </span>{{ enabledLabel }}
      </b-switch>
    </header>

    <strong class="tr-entity-card__title">
      {{ channel.name }}
      <span v-if="channel.providerIdentity" class="tr-entity-card__identity">
        {{ channel.providerIdentity }}
      </span>
    </strong>

    <p class="tr-entity-card__description">
      Состояние подключения:
      <b-tag class="tr-status-tag" :type="statusTagType" :title="statusLabel" size="is-small">
        {{ statusLabel }}
      </b-tag>
    </p>

    <p v-if="lifecycle.reason" class="tr-entity-card__description tr-muted">
      {{ lifecycle.reason }}
    </p>
    <p v-if="lifecycle.error" class="tr-entity-card__description has-text-danger" role="alert">
      {{ lifecycle.error }}
      <b-button size="is-small" type="is-text" @click="emit('retry', channel)">
        Повторить
      </b-button>
    </p>

    <p v-if="channel.status === 'error' && channel.runtimeReason" class="tr-entity-card__description has-text-danger">
      {{ channel.runtimeReason }}
    </p>
    <p v-else-if="channel.status === 'displaced'" class="tr-entity-card__description">
      {{ channel.runtimeReason }}
    </p>
    <p v-else class="tr-entity-card__description">
      Telegram-бот, привязанный к этому агенту.
    </p>

    <footer class="tr-entity-card__footer tr-entity-card__footer--wrap">
      <a
        v-if="channel.providerPublicUrl"
        :href="channel.providerPublicUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="button is-small is-info is-light"
      >
        Открыть бота
      </a>

      <b-button
        v-if="channel.status === 'displaced'"
        size="is-small"
        type="is-warning"
        @click="emit('activate', channel)"
      >
        Перехватить бота
      </b-button>

      <b-button
        v-if="channel.status === 'error'"
        size="is-small"
        type="is-warning"
        @click="emit('edit', channel)"
      >
        Заменить токен
      </b-button>

      <b-button
        v-if="channel.status !== 'error'"
        size="is-small"
        type="is-light"
        @click="emit('edit', channel)"
      >
        Изменить
      </b-button>

      <b-button
        size="is-small"
        type="is-danger"
        outlined
        @click="emit('delete', channel)"
      >
        Удалить
      </b-button>
    </footer>

    <ChannelLimits :channel="channel" :agent-id="agentId" />
  </article>
</template>

<script setup>
import { computed } from "vue";

import ChannelLimits from "./ChannelLimits.vue";

// Карточка канала (Task A5.5), эквивалент
// `get.3xtr.im/src/modules/channels/components/ChannelCard.vue` — набор
// действий сведён к демо-эквиваленту без polling/permissions (нет бэкенда).
// Активация канала в состоянии `displaced` не выполняется здесь напрямую:
// родитель (`ChannelsView.vue`) ловит `activate` и открывает `TakeoverModal`,
// когда `channelsStore.activateChannel` вернёт конфликт.
// Task S2-16: переключатель в шапке — сохранённое намерение `isEnabled`, а не
// runtime-статус; `lifecycle` приходит от `useChannelLifecycleSwitch`.
const props = defineProps({
  channel: { type: Object, required: true },
  agentId: { type: [String, Number], required: true },
  lifecycle: {
    type: Object,
    default: () => ({
      checked: false, disabled: true, pending: false, reason: null, error: null, syncKey: 0,
    }),
  },
});

const emit = defineEmits(["activate", "edit", "delete", "toggle", "retry"]);

const STATUS_LABELS = {
  active: "Активен",
  inactive: "Не активирован",
  paused: "Приостановлен",
  error: "Ошибка",
  displaced: "Перехвачен",
  // "checking" (Task A9.7) — переходный статус мастера подключения Telegram
  // между отправкой токена и явным подтверждением/ошибкой. Обычный экран
  // каналов почти никогда его не застаёт (мастер сбрасывает его при любом
  // выходе без подтверждения), но карточка не должна показывать сырой
  // ключ статуса, если всё же встретит его.
  checking: "Проверяется",
};

const STATUS_TAG_TYPES = {
  active: "is-primary",
  inactive: undefined,
  paused: undefined,
  error: "is-danger",
  displaced: "is-warning",
  checking: "is-info",
};

const statusLabel = computed(() => STATUS_LABELS[props.channel.status] ?? props.channel.status);
const statusTagType = computed(() => STATUS_TAG_TYPES[props.channel.status]);
const switchId = computed(() => `channel-lifecycle-${props.channel.id}`);
const enabledLabel = computed(() => (props.lifecycle.checked ? "Включён" : "Выключен"));
</script>
