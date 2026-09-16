<template>
  <section class="tr-notification-history">
    <PageHeader
      title="История уведомлений"
      subtitle="Личная лента событий пространства и статус их прочтения."
    />

    <Loader v-if="loading" size="section" class="tr-loader--standalone" />

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
        Показаны не все события: часть истории недоступна из-за временной
        ошибки. Остальное ниже — актуально.
      </b-message>

      <div class="tr-card">
        <div class="tr-row tr-row--between mb-4">
          <b-tabs v-model="filter" type="is-boxed" class="tr-notification-history__tabs">
            <b-tab-item value="all" label="Все" />
            <b-tab-item :value="'unread'" :label="unreadTabLabel" />
          </b-tabs>

          <b-button
            size="is-small"
            :disabled="unreadCount === 0"
            @click="handleMarkAllRead"
          >
            Отметить все как прочитанные
          </b-button>
        </div>

        <ListAsyncState
          v-bind="demoStore.listAsyncState"
          :loading="false"
          :empty="pagedItems.length === 0 || demoStore.isEmpty"
          empty-icon="bell-off-outline"
          :empty-title="filter === 'unread' ? 'Нет непрочитанных событий' : 'Здесь пока пусто'"
          :empty-message="filter === 'unread'
            ? 'Все события пространства прочитаны.'
            : 'Новые события пространства появятся здесь.'"
        >
          <ul class="tr-notification-history__list">
            <li
              v-for="item in pagedItems"
              :key="item.id"
              class="tr-notification"
              :class="{ 'tr-notification--unread': !item.read }"
            >
              <span
                class="tr-notification__marker"
                :class="{ 'is-read': item.read }"
                aria-hidden="true"
              />
              <span class="tr-notification__copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.description }}</small>
                <span class="tr-notification-history__target">
                  <RouterLink
                    v-if="item.target && item.target.available"
                    :to="item.target.to"
                  >
                    Перейти к разделу
                  </RouterLink>
                  <span v-else-if="item.target && !item.target.available" class="tr-muted">
                    Материал недоступен — источник удалён.
                  </span>
                </span>
                <time>{{ item.time }}</time>
              </span>
              <b-button
                v-if="!item.read"
                size="is-small"
                class="tr-notification-history__mark-read"
                @click="handleMarkRead(item)"
              >
                Прочитано
              </b-button>
            </li>
          </ul>
        </ListAsyncState>

        <div v-if="pageCount > 1" class="tr-row tr-row--center mt-4">
          <b-pagination
            v-model="page"
            :total="filteredItems.length"
            :per-page="PER_PAGE"
            order="is-centered"
            aria-next-label="Следующая страница"
            aria-previous-label="Предыдущая страница"
            aria-page-label="Страница"
            aria-current-label="Текущая страница"
          />
        </div>
      </div>

      <p class="tr-muted mt-4">
        Хранятся события за последние 30 дней — более старые не показываются
        здесь и не восстанавливаются. Эта лента — личные уведомления, а не
        полный аудит пространства: изменения владельцев, участников, доступов
        и настроек смотрите в
        <RouterLink v-if="canViewAudit" :to="{ name: 'workspace-audit' }">
          «Аудите» пространства
        </RouterLink>
        <span v-else>«Аудите» пространства (доступен владельцу и администратору)</span>.
      </p>
    </template>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { useSimulatedLoading } from "../../composables/useSimulatedLoading";
import { useDemoStore } from "../../stores/demo";
import { useNotificationsStore } from "../../stores/notifications";
import { useToasterStore } from "../../stores/toaster";
import { useWorkspaceStore } from "../../stores/workspace";
import { AsyncState, Loader, ListAsyncState } from "@iam3xtr/vue";
import { PageHeader } from "@iam3xtr/vue/navigation";

// Route-backed «История уведомлений» (Task A10.8, `.plan` item 7): a
// permanent profile-menu entry (`Navbar.vue`'s user dropdown) over the same
// fixture bell already used by `Navbar.vue` (`stores/notifications.js`,
// Task A8.2) — all/unread filter, pagination and read-all here are new,
// the underlying data and per-workspace isolation are not duplicated.
// Read is per-recipient and never removes the entry; read-all only marks
// the entries visible at the moment of the call (see the store's own
// `markAllRead` doc) — a later `receiveNotification` (test-only) would stay
// unread. Demo-режим (Stage A7): the same `Loader`/`AsyncState`/
// `ListAsyncState` contract as `workspace/Members.vue`, plus a guard on
// `demoStore.isError` for the "read" action itself (Task A10.8 acceptance:
// "ошибка загрузки/read и retry имеют самостоятельные состояния" — loading
// the list and marking read can fail independently).
const PER_PAGE = 5;

const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const loading = computed(() => isLoading.value || demoStore.isLoading);
const notificationsStore = useNotificationsStore();
const toaster = useToasterStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const filter = ref("all");
const page = ref(1);

const allItems = computed(() => notificationsStore.notificationsFor(activeWorkspaceId.value));
const unreadCount = computed(() => notificationsStore.unreadCountFor(activeWorkspaceId.value));
const unreadTabLabel = computed(() => `Непрочитанные${unreadCount.value > 0 ? ` (${unreadCount.value})` : ""}`);

const filteredItems = computed(() => (
  filter.value === "unread"
    ? allItems.value.filter((item) => !item.read)
    : allItems.value
));

const pageCount = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / PER_PAGE)));

const pagedItems = computed(() => {
  const start = (page.value - 1) * PER_PAGE;
  return filteredItems.value.slice(start, start + PER_PAGE);
});

const canViewAudit = computed(() => workspaceStore.canViewAudit(activeWorkspaceId.value));

watch([filter, activeWorkspaceId], () => {
  page.value = 1;
});

// Stage A10 review fix: no `demoStore.isError` guard here — the per-item
// button lives inside `ListAsyncState`'s default slot, which the `error`
// demo mode already hides entirely (same `demoStore.listAsyncState.error`
// flag), so this action is never reachable while that mode is active. The
// error guard that actually matters is on `handleMarkAllRead` below, whose
// button stays visible (it's outside `ListAsyncState`, next to the tabs).
/** @param {ReturnType<typeof notificationsStore.notificationsFor>[number]} item */
function handleMarkRead(item) {
  notificationsStore.markRead(activeWorkspaceId.value, item.id);
}

function handleMarkAllRead() {
  if (demoStore.isError) {
    toaster.error("Не удалось обновить статус событий. Повторите попытку.");
    return;
  }
  notificationsStore.markAllRead(activeWorkspaceId.value);
}
</script>
