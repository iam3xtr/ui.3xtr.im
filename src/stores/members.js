import { defineStore } from "pinia";
import { ref } from "vue";

/** @typedef {"Владелец" | "Администратор" | "Участник"} MemberRole */

/**
 * @typedef {Object} WorkspaceMember
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {MemberRole} role
 * @property {string} joined
 */

/**
 * @typedef {Object} WorkspaceInvite
 * @property {number} id
 * @property {string} email
 * @property {MemberRole} role
 * @property {string} sent
 */

export const MEMBER_ROLES = ["Владелец", "Администратор", "Участник"];

/**
 * Фикстуры участников и приглашений рабочего пространства (домен workspace
 * members/invites, см. `src/stores/workspace.js`) — потребитель:
 * `workspace/Members.vue` (Task A5.8, вкладка Workspace → Участники). Нет
 * бэкенда — синхронный in-memory state (Stage A5.2).
 *
 * @type {Record<string, WorkspaceMember[]>}
 */
const initialMembersByWorkspace = {
  demo: [
    {
      id: 1,
      name: "Иван Петров",
      email: "ivan.petrov@example.com",
      role: "Владелец",
      joined: "3 мес назад",
    },
    {
      id: 2,
      name: "Анна Смирнова",
      email: "anna.smirnova@example.com",
      role: "Администратор",
      joined: "2 мес назад",
    },
    {
      id: 3,
      name: "Служба поддержки клиентов регионального подразделения",
      email: "regional-support-desk-escalations@example-holding-company.com",
      role: "Участник",
      joined: "Вчера",
    },
  ],
  trickster: [
    {
      id: 1,
      name: "Мария Волкова",
      email: "maria@trickster.team",
      role: "Владелец",
      joined: "1 год назад",
    },
  ],
  empty: [
    {
      id: 1,
      name: "Владелец пространства",
      email: "owner@example.com",
      role: "Владелец",
      joined: "Сегодня",
    },
  ],
};

/** @type {Record<string, WorkspaceInvite[]>} */
const initialInvitesByWorkspace = {
  demo: [
    {
      id: 1,
      email: "candidate@example.com",
      role: "Участник",
      sent: "Вчера",
    },
  ],
  trickster: [],
  empty: [],
};

export const useMembersStore = defineStore("members", () => {
  /** @type {import("vue").Ref<Record<string, WorkspaceMember[]>>} */
  const membersByWorkspace = ref(structuredClone(initialMembersByWorkspace));
  /** @type {import("vue").Ref<Record<string, WorkspaceInvite[]>>} */
  const invitesByWorkspace = ref(structuredClone(initialInvitesByWorkspace));

  /**
   * @param {string} workspaceId
   * @returns {WorkspaceMember[]}
   */
  function listMembers(workspaceId) {
    return membersByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * @param {string} workspaceId
   * @returns {WorkspaceInvite[]}
   */
  function listInvites(workspaceId) {
    return invitesByWorkspace.value[workspaceId] ?? [];
  }

  /**
   * @param {string} workspaceId
   * @param {number} memberId
   */
  function removeMember(workspaceId, memberId) {
    membersByWorkspace.value[workspaceId] = listMembers(workspaceId)
      .filter(({ id }) => id !== memberId);
  }

  /**
   * @param {string} workspaceId
   * @param {number} memberId
   * @param {MemberRole} role
   */
  function updateMemberRole(workspaceId, memberId, role) {
    const member = listMembers(workspaceId).find(({ id }) => id === memberId);

    if (member) {
      member.role = role;
    }
  }

  /**
   * @param {string} workspaceId
   * @param {{ email: string, role: MemberRole }} input
   * @returns {WorkspaceInvite}
   */
  function inviteMember(workspaceId, { email, role }) {
    const invites = invitesByWorkspace.value[workspaceId]
      ?? (invitesByWorkspace.value[workspaceId] = []);
    /** @type {WorkspaceInvite} */
    const invite = { id: Date.now(), email, role, sent: "Сейчас" };

    invites.push(invite);

    return invite;
  }

  /**
   * @param {string} workspaceId
   * @param {number} inviteId
   */
  function cancelInvite(workspaceId, inviteId) {
    invitesByWorkspace.value[workspaceId] = listInvites(workspaceId)
      .filter(({ id }) => id !== inviteId);
  }

  return {
    membersByWorkspace,
    invitesByWorkspace,
    listMembers,
    listInvites,
    removeMember,
    updateMemberRole,
    inviteMember,
    cancelInvite,
  };
});
