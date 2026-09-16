<template>
  <section class="tr-workspace-audit">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Аудит пространства</h1>
        <p class="tr-page-subtitle">
          История изменений владельцев, участников, доступов и настроек.
        </p>
      </div>
    </div>

    <Loader v-if="loading" size="section" class="tr-loader--standalone" />

    <AsyncState
      v-else-if="!canView"
      variant="permission-denied"
      icon="lock-outline"
      title="Доступ ограничен"
      message="Аудит пространства доступен только владельцу и администратору. Обратитесь к владельцу пространства, если он нужен вам."
    />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <template v-else>
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показаны не все записи аудита: часть истории недоступна из-за
        временной ошибки. Остальное ниже — актуально.
      </b-message>

      <div class="tr-card">
        <h2 class="tr-card__title">Действия</h2>

        <ListAsyncState
          v-bind="demoStore.listAsyncState"
          :empty="entries.length === 0 || demoStore.isEmpty"
          empty-icon="clipboard-text-clock-outline"
          empty-title="Здесь пока пусто"
          empty-message="Изменения владельцев, участников, доступов и настроек появятся здесь."
        >
          <b-table :data="entries" hoverable mobile-cards>
            <b-table-column field="actor" label="Кто" v-slot="{ row }">
              {{ row.actor }}
            </b-table-column>
            <b-table-column field="action" label="Действие" v-slot="{ row }">
              {{ row.action }}
            </b-table-column>
            <b-table-column field="time" label="Когда" v-slot="{ row }">
              {{ row.time }}
            </b-table-column>
          </b-table>
        </ListAsyncState>

        <p v-for="gap in gaps" :key="gap.id" class="tr-workspace-audit__gap">
          <b-icon icon="information-outline" size="is-small" />
          {{ gap.note }}
        </p>
      </div>

      <p class="tr-muted mt-4">
        Аудит не заменяет ленту личных уведомлений и не содержит пароли, ключи
        API или содержимое сообщений — только действие, автора и время.
      </p>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useDemoStore } from "../../stores/demo";
import { getAuditLogFor, useWorkspaceStore } from "../../stores/workspace";
import { AsyncState, Loader, ListAsyncState } from "@iam3xtr/vue";

// Workspace audit (Task A10.8, `.plan` item 7, API Issue #109): a capability-
// gated tab separate from the personal notification feed
// (`profile/NotificationHistory.vue`) — "не смешивая персональную ленту с
// workspace audit" from the task's own description. Visibility is gated on
// `useWorkspaceStore().canViewAudit` (role-based, see that store) *before*
// the usual demo-mode loading/error/empty contract — an unauthorized role
// sees permission-denied regardless of the global demo mode, matching the
// task's "показывает только разрешённые actor/action/time/gaps" acceptance.
// No new API producers are implemented here — the fixture log is static, per
// the source `.plan` item's own "Новые API producers здесь не реализуются".
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const loading = computed(() => isLoading.value || demoStore.isLoading);
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const canView = computed(() => workspaceStore.canViewAudit(activeWorkspaceId.value));

const auditLog = computed(() => getAuditLogFor(activeWorkspaceId.value));
const entries = computed(() => auditLog.value.filter((item) => !item.gap));
const gaps = computed(() => auditLog.value.filter((item) => item.gap));
</script>
