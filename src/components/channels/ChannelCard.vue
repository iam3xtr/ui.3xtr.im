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
      <b-tag :type="statusTagType" size="is-small">
        {{ statusLabel }}
      </b-tag>
    </header>

    <strong class="tr-entity-card__title">
      {{ channel.name }}
      <span v-if="channel.providerIdentity" class="tr-entity-card__identity">
        {{ channel.providerIdentity }}
      </span>
    </strong>

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
        v-if="showActivate"
        size="is-small"
        type="is-primary"
        @click="emit('activate', channel)"
      >
        Активировать
      </b-button>

      <b-button
        v-if="channel.status === 'active'"
        size="is-small"
        @click="emit('deactivate', channel)"
      >
        Деактивировать
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
const props = defineProps({
  channel: { type: Object, required: true },
  agentId: { type: [String, Number], required: true },
});

const emit = defineEmits(["activate", "deactivate", "edit", "delete"]);

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
const showActivate = computed(
  () => props.channel.status === "inactive" || props.channel.status === "paused",
);
</script>
