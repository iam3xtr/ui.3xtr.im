<template>
  <section class="tr-workspace-members">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Участники пространства</h1>
        <p class="tr-page-subtitle">Управляйте составом команды и приглашениями.</p>
      </div>
      <b-button type="is-primary" icon-left="account-plus-outline" @click="openInvite">
        Пригласить
      </b-button>
    </div>

    <Loader v-if="isLoading" size="section" class="tr-loader--standalone" />

    <template v-else>
      <div class="tr-card mb-5">
        <h2 class="tr-card__title">Участники</h2>

        <ListAsyncState
          :empty="members.length === 0"
          empty-icon="account-group-outline"
          empty-title="В пространстве пока нет участников"
        >
          <b-table :data="members" hoverable mobile-cards>
            <b-table-column field="name" label="Участник" v-slot="{ row }">
              <strong>{{ row.name }}</strong>
              <br>
              <small class="tr-muted">{{ row.email }}</small>
            </b-table-column>

            <b-table-column field="role" label="Роль" v-slot="{ row }">
              <b-select
                v-if="editingMemberId === row.id"
                v-model="editingRole"
                size="is-small"
              >
                <option v-for="role in MEMBER_ROLES" :key="role" :value="role">
                  {{ role }}
                </option>
              </b-select>
              <span v-else>{{ row.role }}</span>
            </b-table-column>

            <b-table-column field="joined" label="В команде" v-slot="{ row }">
              {{ row.joined }}
            </b-table-column>

            <b-table-column v-slot="{ row }" label="Действия">
              <div class="buttons are-small has-addons is-justify-content-end mb-0">
                <template v-if="editingMemberId === row.id">
                  <b-button size="is-small" type="is-primary" @click="saveRole(row)">
                    Сохранить
                  </b-button>
                  <b-button size="is-small" @click="cancelEdit">
                    Отмена
                  </b-button>
                </template>
                <template v-else>
                  <b-button
                    size="is-small"
                    :disabled="row.role === 'Владелец'"
                    @click="startEditRole(row)"
                  >
                    Изменить роль
                  </b-button>
                  <b-button
                    size="is-small"
                    type="is-danger"
                    outlined
                    :disabled="row.role === 'Владелец'"
                    @click="confirmRemoveMember(row)"
                  >
                    Удалить
                  </b-button>
                </template>
              </div>
            </b-table-column>
          </b-table>
        </ListAsyncState>
      </div>

      <div class="tr-card">
        <h2 class="tr-card__title">Приглашения</h2>

        <ListAsyncState
          :empty="invites.length === 0"
          empty-icon="email-outline"
          empty-title="Нет активных приглашений"
          empty-message="Пригласите участников по email — они появятся здесь до подтверждения."
        >
          <b-table :data="invites" hoverable mobile-cards>
            <b-table-column field="email" label="Email" v-slot="{ row }">
              {{ row.email }}
            </b-table-column>
            <b-table-column field="role" label="Роль" v-slot="{ row }">
              {{ row.role }}
            </b-table-column>
            <b-table-column field="sent" label="Отправлено" v-slot="{ row }">
              {{ row.sent }}
            </b-table-column>
            <b-table-column v-slot="{ row }" label="Действия">
              <div class="buttons are-small has-addons is-justify-content-end mb-0">
                <b-button size="is-small" @click="resendInvite(row)">
                  Отправить снова
                </b-button>
                <b-button size="is-small" type="is-danger" outlined @click="cancelInvite(row)">
                  Отменить
                </b-button>
              </div>
            </b-table-column>
          </b-table>
        </ListAsyncState>
      </div>
    </template>

    <InviteMemberForm />
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { MEMBER_ROLES, useMembersStore } from "../../stores/members";
import { useModalStore } from "../../stores/modal";
import { useToasterStore } from "../../stores/toaster";
import { useWorkspaceStore } from "../../stores/workspace";
import Loader from "../common/Loader.vue";
import ListAsyncState from "../common/ListAsyncState.vue";
import InviteMemberForm from "./InviteMemberForm.vue";

// Members tab (Task A5.8), routed at `/workspace/members` — two `b-table`s
// (members, invites) plus the invite flow, per `.todo`'s clarified
// requirement ("Members отображает две b-table и invite flow"). Role editing
// mirrors the cabinet's start/save/cancel inline-select pattern
// (`get.3xtr.im/src/modules/workspace/components/Members.vue`) without its
// permission gate — the kit has no auth/roles store to check against.
const { isLoading } = useSimulatedLoading();
const membersStore = useMembersStore();
const modalStore = useModalStore();
const toaster = useToasterStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const members = computed(() => membersStore.listMembers(activeWorkspaceId.value));
const invites = computed(() => membersStore.listInvites(activeWorkspaceId.value));

const editingMemberId = ref(null);
const editingRole = ref(null);

function startEditRole(member) {
  editingMemberId.value = member.id;
  editingRole.value = member.role;
}

function cancelEdit() {
  editingMemberId.value = null;
  editingRole.value = null;
}

function saveRole(member) {
  if (editingRole.value && editingRole.value !== member.role) {
    membersStore.updateMemberRole(activeWorkspaceId.value, member.id, editingRole.value);
  }

  cancelEdit();
}

function confirmRemoveMember(member) {
  modalStore.confirm({
    title: "Удалить участника",
    message: `Участник «${member.name}» потеряет доступ к пространству. Действие необратимо.`,
    confirmText: "Удалить",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      membersStore.removeMember(activeWorkspaceId.value, member.id);
      toaster.success("Участник удалён");
    },
  });
}

function resendInvite(invite) {
  toaster.info(`Приглашение отправлено повторно на ${invite.email}`);
}

function cancelInvite(invite) {
  membersStore.cancelInvite(activeWorkspaceId.value, invite.id);
}

function openInvite() {
  modalStore.open("invite-member");
}

watch(activeWorkspaceId, cancelEdit);
</script>
