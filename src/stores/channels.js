import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * @typedef {"active" | "inactive" | "paused" | "error" | "displaced"} ChannelRuntimeStatus
 */

/**
 * @typedef {Object} ChannelLimit
 * @property {string} key
 * @property {string} label
 * @property {string} effective
 * @property {"default" | "workspace" | "plan"} source
 * @property {boolean} overridable
 * @property {number | null} configured
 */

/**
 * @typedef {Object} Channel
 * @property {string} id
 * @property {string} name
 * @property {"telegram"} provider — MVP поддерживает только Telegram, как в
 *   кабинете (`get.3xtr.im/src/modules/channels/components/ChannelCard.vue`).
 * @property {ChannelRuntimeStatus} status
 * @property {boolean} isEnabled
 * @property {string | null} providerIdentity — `@bot_username`, известен
 *   только после хотя бы одной активации.
 * @property {string | null} providerPublicUrl
 * @property {string | null} runtimeReason — причина `error`/`displaced`.
 * @property {ChannelLimit[]} limits
 */

/**
 * @typedef {Object} ActivationConflict
 * @property {string} message
 */

/** @type {Omit<ChannelLimit, "configured">[]} */
const DEFAULT_LIMIT_DEFS = [
  { key: "messages_per_minute", label: "Сообщений в минуту", effective: "20", source: "plan", overridable: true },
  { key: "max_message_length", label: "Длина сообщения", effective: "4096 симв.", source: "default", overridable: false },
  { key: "max_file_size", label: "Размер вложения", effective: "20 МБ", source: "workspace", overridable: true },
];

/**
 * @param {Partial<Record<string, number | null>>} [overrides]
 * @returns {ChannelLimit[]}
 */
function makeLimits(overrides = {}) {
  return DEFAULT_LIMIT_DEFS.map((def) => ({
    ...def,
    configured: Object.prototype.hasOwnProperty.call(overrides, def.key)
      ? overrides[def.key]
      : null,
  }));
}

/**
 * Локальные domain-фикстуры каналов, сгруппированные по рабочему пространству
 * и агенту (`stores/agents.js`) — в кабинете канал всегда принадлежит одному
 * агенту (`get.3xtr.im/src/modules/channels/store.js` грузит список по
 * `agent_id`). Нет бэкенда — весь стор синхронный in-memory state (Stage A5.5).
 *
 * @type {Record<string, Record<string, Channel[]>>}
 */
const initialChannelsByWorkspaceAndAgent = {
  demo: {
    1: [
      {
        id: "ch-101",
        name: "Основной бот поддержки",
        provider: "telegram",
        status: "active",
        isEnabled: true,
        providerIdentity: "@consultant_support_bot",
        providerPublicUrl: "https://t.me/consultant_support_bot",
        runtimeReason: null,
        limits: makeLimits({ messages_per_minute: 30 }),
      },
      {
        id: "ch-102",
        name: "WhatsApp — резервный канал",
        provider: "telegram",
        status: "error",
        isEnabled: false,
        providerIdentity: "@consultant_backup_bot",
        providerPublicUrl: null,
        runtimeReason: "Токен бота отозван провайдером.",
        limits: makeLimits(),
      },
    ],
    2: [],
    3: [
      {
        id: "ch-103",
        name: "Telegram-бот службы поддержки",
        provider: "telegram",
        status: "displaced",
        isEnabled: false,
        providerIdentity: "@support_bot_legacy",
        providerPublicUrl: null,
        runtimeReason: "Бот уже активирован в другом рабочем пространстве.",
        limits: makeLimits(),
      },
    ],
    4: [
      {
        id: "ch-104",
        name: "Enterprise-бот для корпоративных клиентов с длинным названием "
          + "под перенос строки",
        provider: "telegram",
        status: "inactive",
        isEnabled: false,
        providerIdentity: null,
        providerPublicUrl: null,
        runtimeReason: null,
        limits: makeLimits(),
      },
    ],
  },
  trickster: {
    1: [
      {
        id: "ch-201",
        name: "Trickster Concierge Bot",
        provider: "telegram",
        status: "paused",
        isEnabled: false,
        providerIdentity: "@trickster_concierge_bot",
        providerPublicUrl: "https://t.me/trickster_concierge_bot",
        runtimeReason: null,
        limits: makeLimits(),
      },
    ],
  },
  empty: {},
};

export const useChannelsStore = defineStore("channels", () => {
  /** @type {import("vue").Ref<Record<string, Record<string, Channel[]>>>} */
  const channelsByWorkspaceAndAgent = ref(
    structuredClone(initialChannelsByWorkspaceAndAgent),
  );

  /**
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @returns {Channel[]}
   */
  function listByAgent(workspaceId, agentId) {
    return channelsByWorkspaceAndAgent.value[workspaceId]?.[agentId] ?? [];
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @returns {Channel[]}
   */
  function ensureAgentBucket(workspaceId, agentId) {
    const workspace = channelsByWorkspaceAndAgent.value[workspaceId]
      ?? (channelsByWorkspaceAndAgent.value[workspaceId] = {});

    return workspace[agentId] ?? (workspace[agentId] = []);
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {{ name: string }} data
   * @returns {Channel}
   */
  function createChannel(workspaceId, agentId, data) {
    /** @type {Channel} */
    const channel = {
      id: `ch-${Date.now()}`,
      name: data.name,
      provider: "telegram",
      status: "inactive",
      isEnabled: false,
      providerIdentity: null,
      providerPublicUrl: null,
      runtimeReason: null,
      limits: makeLimits(),
    };

    ensureAgentBucket(workspaceId, agentId).push(channel);

    return channel;
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} id
   * @param {{ name: string, token?: string }} data
   */
  function updateChannel(workspaceId, agentId, id, data) {
    const channel = listByAgent(workspaceId, agentId)
      .find((item) => item.id === id);

    if (!channel) {
      return;
    }

    channel.name = data.name;

    // Заменённый токен чинит канал, ушедший в ошибку (демо-эквивалент
    // повторной проверки credentials на сервере) — только если токен
    // действительно передан в этом сохранении, а не оставлен пустым.
    if (channel.status === "error" && data.token) {
      channel.status = "inactive";
      channel.runtimeReason = null;
    }
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} id
   */
  function deleteChannel(workspaceId, agentId, id) {
    const bucket = ensureAgentBucket(workspaceId, agentId);
    const index = bucket.findIndex((item) => item.id === id);

    if (index !== -1) {
      bucket.splice(index, 1);
    }
  }

  /**
   * Активация канала. Демо-эквивалент конфликта 409 из кабинета: канал в
   * состоянии `displaced` требует подтверждения через `TakeoverModal`
   * (Task A5.5) вместо немедленной активации.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} id
   * @returns {ActivationConflict | undefined} конфликт, если активация
   *   требует подтверждения перехвата — иначе `undefined`.
   */
  function activateChannel(workspaceId, agentId, id) {
    const channel = listByAgent(workspaceId, agentId)
      .find((item) => item.id === id);

    if (!channel) {
      return undefined;
    }

    if (channel.status === "displaced") {
      return { message: channel.runtimeReason ?? "Бот уже активирован в другом рабочем пространстве." };
    }

    applyActivation(channel);

    return undefined;
  }

  /**
   * @param {Channel} channel
   */
  function applyActivation(channel) {
    channel.status = "active";
    channel.isEnabled = true;
    channel.runtimeReason = null;

    if (!channel.providerIdentity) {
      channel.providerIdentity = `@${channel.name.toLocaleLowerCase().replace(/\s+/g, "_")}_bot`;
    }

    if (!channel.providerPublicUrl) {
      channel.providerPublicUrl = `https://t.me/${channel.providerIdentity.slice(1)}`;
    }
  }

  /**
   * Подтверждение перехвата бота у другого рабочего пространства
   * (`TakeoverModal`) — демо-эквивалент повторного вызова активации с
   * `confirmation_token`.
   *
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} id
   */
  function confirmTakeover(workspaceId, agentId, id) {
    const channel = listByAgent(workspaceId, agentId)
      .find((item) => item.id === id);

    if (channel) {
      applyActivation(channel);
    }
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} id
   */
  function deactivateChannel(workspaceId, agentId, id) {
    const channel = listByAgent(workspaceId, agentId)
      .find((item) => item.id === id);

    if (!channel) {
      return;
    }

    channel.status = "paused";
    channel.isEnabled = false;
  }

  /**
   * @param {string} workspaceId
   * @param {string | number} agentId
   * @param {string} channelId
   * @param {Record<string, number | null>} values
   */
  function updateLimits(workspaceId, agentId, channelId, values) {
    const channel = listByAgent(workspaceId, agentId)
      .find((item) => item.id === channelId);

    if (!channel) {
      return;
    }

    for (const limit of channel.limits) {
      if (Object.prototype.hasOwnProperty.call(values, limit.key)) {
        limit.configured = values[limit.key];
      }
    }
  }

  return {
    channelsByWorkspaceAndAgent,
    listByAgent,
    createChannel,
    updateChannel,
    deleteChannel,
    activateChannel,
    confirmTakeover,
    deactivateChannel,
    updateLimits,
  };
});
