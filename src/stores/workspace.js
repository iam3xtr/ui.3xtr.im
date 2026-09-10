import { defineStore } from "pinia";
import { computed, ref } from "vue";

/**
 * @typedef {Object} Workspace
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} plan
 */

/**
 * @typedef {Object} WorkspaceTariffLimit
 * @property {string} key
 * @property {string} label
 * @property {string} caption
 * @property {number | null} progress 0-100, `null` — лимит не задан (unlimited).
 */

/**
 * @typedef {Object} WorkspaceTariff
 * @property {string} displayName
 * @property {string} priceLabel
 * @property {string} [tagType]
 * @property {WorkspaceTariffLimit[]} limits
 */

/**
 * @param {{
 *   creditsProgress: number;
 *   creditsCaption: string;
 *   conversationsProgress: number | null;
 *   conversationsCaption: string;
 * }} params
 * @returns {WorkspaceTariffLimit[]}
 */
const freeTariffLimits = (
  { creditsProgress, creditsCaption, conversationsProgress, conversationsCaption },
) => [
  {
    key: "credits",
    label: "Кредиты",
    caption: creditsCaption,
    progress: creditsProgress,
  },
  {
    key: "active_conversations_monthly",
    label: "Диалоги",
    caption: conversationsCaption,
    progress: conversationsProgress,
  },
];

/** @type {WorkspaceTariff} */
const emptyTariff = {
  displayName: "Free",
  priceLabel: "Бесплатно",
  limits: freeTariffLimits({
    creditsProgress: 0,
    creditsCaption: "0 из 100 000",
    conversationsProgress: 0,
    conversationsCaption: "0 из 1 000",
  }),
};

/** @type {Record<string, WorkspaceTariff>} */
const tariffsByWorkspaceId = {
  demo: {
    displayName: "Free",
    priceLabel: "Бесплатно",
    limits: freeTariffLimits({
      creditsProgress: 38,
      creditsCaption: "38 000 из 100 000",
      conversationsProgress: 62,
      conversationsCaption: "620 из 1 000",
    }),
  },
  trickster: {
    displayName: "Superior",
    priceLabel: "2 900 ₽ / мес",
    tagType: "is-primary",
    limits: [
      {
        key: "credits",
        label: "Кредиты",
        caption: "124 000 из 1 000 000",
        progress: 12,
      },
      {
        key: "active_conversations_monthly",
        label: "Диалоги",
        caption: "Без ограничений",
        progress: null,
      },
    ],
  },
  empty: emptyTariff,
};

export const useWorkspaceStore = defineStore("workspace", () => {
  /** @type {import("vue").Ref<Workspace[]>} */
  const workspaces = ref([
    {
      id: "demo",
      name: "Демо-пространство",
      role: "Владелец",
      plan: "Free",
    },
    {
      id: "trickster",
      name: "Trickster Team",
      role: "Администратор",
      plan: "Superior",
    },
    {
      id: "empty",
      name: "Пустое пространство",
      role: "Участник",
      plan: "Free",
    },
  ]);
  const activeWorkspaceId = ref(workspaces.value[0].id);
  const activeWorkspaceTariff = computed(
    () => tariffsByWorkspaceId[activeWorkspaceId.value] ?? emptyTariff,
  );

  function createWorkspace() {
    const number = workspaces.value.length + 1;
    const id = `workspace-${number}`;

    workspaces.value.push({
      id,
      name: `Пространство ${number}`,
      role: "Владелец",
      plan: "Free",
    });
    activeWorkspaceId.value = id;
  }

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspaceTariff,
    createWorkspace,
  };
});
