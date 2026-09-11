<template>
  <section class="tr-settings">
    <PageHeader
      title="Безопасность"
      subtitle="Активные сеансы и выход с других устройств."
    />

    <Loader v-if="isLoading" size="section" class="tr-loader--standalone" />

    <template v-else>
      <div class="tr-card">
        <h2 class="tr-card__title">Активные сеансы</h2>

        <ListAsyncState
          :empty="sessions.length === 0"
          empty-icon="devices"
          empty-title="Нет активных сеансов"
        >
          <b-table :data="sessions" hoverable mobile-cards>
            <b-table-column field="device" label="Устройство" v-slot="{ row }">
              <strong>{{ row.device }}</strong>
              <b-tag v-if="row.current" type="is-success" size="is-small" class="ml-2">
                Текущий
              </b-tag>
            </b-table-column>

            <b-table-column field="location" label="Местоположение" v-slot="{ row }">
              {{ row.location }}
            </b-table-column>

            <b-table-column field="lastActive" label="Активность" v-slot="{ row }">
              {{ row.lastActive }}
            </b-table-column>

            <b-table-column v-slot="{ row }" label="Действия">
              <div class="buttons are-small is-justify-content-end mb-0">
                <b-button
                  size="is-small"
                  type="is-danger"
                  outlined
                  :disabled="row.current"
                  @click="confirmRevoke(row)"
                >
                  Завершить
                </b-button>
              </div>
            </b-table-column>
          </b-table>
        </ListAsyncState>
      </div>

      <div v-if="otherSessions.length > 0" class="tr-destructive-zone mt-5">
        <h2 class="tr-destructive-zone__title">Завершить остальные сеансы</h2>
        <p class="tr-muted">
          Выйти из всех устройств, кроме текущего. Действие необратимо.
        </p>
        <b-button type="is-danger" outlined @click="confirmRevokeOthers">
          Завершить все другие сеансы
        </b-button>
      </div>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useModalStore } from "../../stores/modal";
import { useProfileStore } from "../../stores/profile";
import { useToasterStore } from "../../stores/toaster";
import Loader from "../common/Loader.vue";
import ListAsyncState from "../common/ListAsyncState.vue";
import PageHeader from "../common/PageHeader.vue";

// Security tab (Task A5.9), routed at `/profile/security` — cabinet
// equivalent: `profile/components/Security.vue`, minus its password-change
// and API-key sections: both call a real backend (`api.authPassword`/
// `api.authKeys*`) the kit has no fixture or store for, so this screen keeps
// only the sessions/security-actions slice named in `.todo`'s clarified
// requirement ("/profile/security — sessions/security actions"). Same
// list pattern as `workspace/Members.vue`: `useSimulatedLoading` + `Loader`
// + `ListAsyncState`, revoke actions confirmed through `useModalStore`.
const { isLoading } = useSimulatedLoading();
const profileStore = useProfileStore();
const modalStore = useModalStore();
const toaster = useToasterStore();
const { sessions } = storeToRefs(profileStore);

const otherSessions = computed(() => sessions.value.filter((session) => !session.current));

/**
 * @param {import("../../stores/profile").ProfileSession} session
 */
function confirmRevoke(session) {
  modalStore.confirm({
    title: "Завершить сеанс",
    message: `Сеанс «${session.device}» будет завершён.`,
    confirmText: "Завершить",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      profileStore.revokeSession(session.id);
      toaster.success("Сеанс завершён");
    },
  });
}

function confirmRevokeOthers() {
  modalStore.confirm({
    title: "Завершить остальные сеансы",
    message: "Все сеансы, кроме текущего, будут завершены.",
    confirmText: "Завершить",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => {
      otherSessions.value.forEach((session) => profileStore.revokeSession(session.id));
      toaster.success("Остальные сеансы завершены");
    },
  });
}
</script>
