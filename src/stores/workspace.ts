import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface Workspace {
  id: string;
  name: string;
  role: string;
  plan: string;
}

export interface WorkspaceTariffLimit {
  key: string;
  label: string;
  caption: string;
  /** 0-100, `null` — лимит не задан (unlimited). */
  progress: number | null;
}

export interface WorkspaceTariff {
  displayName: string;
  priceLabel: string;
  tagType?: string;
  limits: WorkspaceTariffLimit[];
}

const freeTariffLimits = (
  { creditsProgress, creditsCaption, conversationsProgress, conversationsCaption }: {
    creditsProgress: number;
    creditsCaption: string;
    conversationsProgress: number | null;
    conversationsCaption: string;
  },
): WorkspaceTariffLimit[] => [
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

const emptyTariff: WorkspaceTariff = {
  displayName: "Free",
  priceLabel: "Бесплатно",
  limits: freeTariffLimits({
    creditsProgress: 0,
    creditsCaption: "0 из 100 000",
    conversationsProgress: 0,
    conversationsCaption: "0 из 1 000",
  }),
};

const tariffsByWorkspaceId: Record<string, WorkspaceTariff> = {
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
  const workspaces = ref<Workspace[]>([
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

  function createWorkspace(): void {
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
