import { defineStore } from "pinia";
import { ref } from "vue";

export interface Workspace {
  id: string;
  name: string;
  role: string;
  plan: string;
}

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
      plan: "Pro",
    },
    {
      id: "empty",
      name: "Пустое пространство",
      role: "Участник",
      plan: "Free",
    },
  ]);
  const activeWorkspaceId = ref(workspaces.value[0].id);

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
    createWorkspace,
  };
});
