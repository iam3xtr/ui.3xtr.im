<template>
  <b-modal
    :model-value="modalStore.isOpen(modalKey)"
    has-modal-card
    @update:model-value="(value) => (value ? modalStore.open(modalKey) : modalStore.close(modalKey))"
  >
    <form class="modal-card" novalidate @submit.prevent="submit">
      <header class="modal-card-head">
        <p class="modal-card-title">Пригласить участника</p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="modalStore.close(modalKey)"
        />
      </header>

      <section class="modal-card-body tr-form">
        <b-field label="Email" :type="emailError ? 'is-danger' : undefined" :message="emailError">
          <b-input
            v-model="email"
            type="email"
            placeholder="name@example.com"
            required
          />
        </b-field>

        <b-field label="Роль">
          <b-select v-model="role" expanded>
            <option v-for="item in invitableRoles" :key="item" :value="item">
              {{ item }}
            </option>
          </b-select>
        </b-field>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="modalStore.close(modalKey)">
          Отмена
        </b-button>
        <b-button native-type="submit" type="is-primary">
          Отправить приглашение
        </b-button>
      </footer>
    </form>
  </b-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import { MEMBER_ROLES, useMembersStore } from "../../stores/members";
import { useModalStore } from "../../stores/modal";
import { useToasterStore } from "../../stores/toaster";
import { useWorkspaceStore } from "../../stores/workspace";

// Invite flow (Task A5.8), equivalent of
// get.3xtr.im/src/modules/workspace/components/InviteMemberForm.vue —
// opens/closes through `useModalStore` by key, same convention as
// `channels/ChannelFormModal.vue` (Task A5.5). No email delivery to
// simulate: submitting adds a pending invite straight to `stores/members.js`.
const modalKey = "invite-member";
const invitableRoles = MEMBER_ROLES.filter((role) => role !== "Владелец");

const modalStore = useModalStore();
const membersStore = useMembersStore();
const toaster = useToasterStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const email = ref("");
const role = ref(invitableRoles[invitableRoles.length - 1]);
const validationAttempted = ref(false);
const emailError = computed(() => {
  if (!validationAttempted.value) return undefined;
  if (!email.value.trim()) return "Укажите Email.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
    ? undefined
    : "Введите корректный Email.";
});

watch(
  () => modalStore.isOpen(modalKey),
  (isOpen) => {
    if (!isOpen) {
      return;
    }

    email.value = "";
    role.value = invitableRoles[invitableRoles.length - 1];
    validationAttempted.value = false;
  },
);

function submit() {
  validationAttempted.value = true;
  if (emailError.value) return;
  const trimmedEmail = email.value.trim();

  membersStore.inviteMember(activeWorkspaceId.value, { email: trimmedEmail, role: role.value });
  toaster.success(`Приглашение отправлено на ${trimmedEmail}`);
  modalStore.close(modalKey);
}
</script>
