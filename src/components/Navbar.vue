<template>
  <header class="tr-topbar" :class="{ 'tr-topbar--minimal': minimal }">
    <b-dropdown
      v-if="!minimal"
      ref="mobileNavDropdown"
      class="tr-dropdown tr-mobile-nav"
      position="is-bottom-right"
      mobile-modal
      aria-role="menu"
      @active-change="isMobileNavActive = $event"
    >
      <template #trigger>
        <button
          class="tr-navbar-trigger tr-mobile-nav__trigger"
          type="button"
          aria-label="Открыть главное меню"
        >
          <b-icon icon="menu" />
        </button>
      </template>

      <b-dropdown-item
        class="tr-mobile-menu-header"
        custom
        :focusable="false"
      >
        <div class="tr-mobile-menu-header__row">
          <Logo @click="closeMobileNav" />
          <button
            class="tr-mobile-menu-header__close"
            type="button"
            aria-label="Закрыть главное меню"
            @click.stop="closeMobileNav"
          >
            <b-icon icon="close" />
          </button>
        </div>
      </b-dropdown-item>

      <b-dropdown-item custom :focusable="false">
        <div class="tr-mobile-workspace">
          <span class="tr-mobile-workspace__label">
            <b-icon icon="briefcase-outline" size="is-small" />
            Пространство
          </span>
          <b-select
            v-model="workspace"
            expanded
            aria-label="Выбрать рабочее пространство"
          >
            <option
              v-for="item in workspaces"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </option>
          </b-select>
        </div>
      </b-dropdown-item>

      <b-dropdown-item separator />

      <!--
        Постоянное действие «Создать агента» (Stage A9, Task A9.2): доступно
        на любом кабинетном экране независимо от фильтра/пагинации/empty-
        error списка каталога — здесь же на мобильном viewport, где нет
        отдельного `.tr-topbar__actions`. Ведёт в общий route-driven мастер,
        не в отдельную форму — см. `src/components/agents/AgentWizard.vue`.
      -->
      <b-dropdown-item
        aria-role="menuitem"
        @click="openAgentWizard"
      >
        <span class="tr-dropdown-action">
          <b-icon icon="plus" size="is-small" />
          Создать агента
        </span>
      </b-dropdown-item>

      <b-dropdown-item separator />

      <b-dropdown-item
        v-for="item in mainNavigationItems"
        :key="item.routeName"
        :class="{ 'is-active': isNavigationItemActive(item.routeName) }"
        aria-role="menuitem"
        @click="router.push({ name: item.routeName })"
      >
        <span class="tr-dropdown-action">
          <b-icon :icon="item.icon" size="is-small" />
          {{ item.label }}
        </span>
      </b-dropdown-item>

      <b-dropdown-item separator />

      <b-dropdown-item
        class="tr-mobile-nav-section-title"
        custom
        :focusable="false"
      >
        Администрирование
      </b-dropdown-item>

      <b-dropdown-item
        v-for="item in administrationNavigationItems"
        :key="item.routeName"
        :class="{ 'is-active': route.name === item.routeName }"
        aria-role="menuitem"
        @click="router.push({ name: item.routeName })"
      >
        <span class="tr-dropdown-action">
          <b-icon :icon="item.icon" size="is-small" />
          {{ item.label }}
        </span>
      </b-dropdown-item>

      <template v-if="hasUnreadNotifications">
        <b-dropdown-item separator />

        <b-dropdown-item aria-role="menuitem">
          <span class="tr-dropdown-item-row">
            <span class="tr-dropdown-action">
              <b-icon icon="bell-outline" size="is-small" />
              События
            </span>
            <b-tag size="is-small">{{ unreadNotificationsCount }}</b-tag>
          </span>
        </b-dropdown-item>
      </template>
    </b-dropdown>

    <Logo />

    <template v-if="!minimal">
      <slot name="menu" />

      <nav
        v-if="resourceLinks.length"
        class="tr-topbar__links"
        aria-label="Дополнительная навигация"
      >
        <a
          v-for="item in resourceLinks"
          :key="item.label"
          href="#"
          @click.prevent
        >
          {{ item.label }}
        </a>
      </nav>
    </template>

    <!--
      Auth screens (Task A8.7/`isAuthRoute`) render `<Navbar minimal>` — no
      workspace switcher/resource menu/notifications/user menu, so the theme
      switch (normally inside `.tr-user-dropdown`) gets its own top-right
      control here instead, since there is no user menu to hold it.
    -->
    <div v-if="minimal" class="tr-topbar__auth-actions">
      <span class="tr-theme-toggle">
        <b-icon
          class="tr-theme-toggle__icon"
          icon="weather-sunny"
          size="is-small"
        />
        <b-switch
          v-model="isDark"
          size="is-small"
          aria-label="Переключить тему"
        />
        <b-icon
          class="tr-theme-toggle__icon"
          icon="weather-night"
          size="is-small"
        />
      </span>
    </div>

    <div v-if="!minimal" class="tr-topbar__actions">
      <!--
        Постоянное действие «Создать агента» (Stage A9, Task A9.2): не
        зависит от текущего маршрута/фильтра/пагинации — всегда открывает
        общий route-driven мастер (`agent-wizard`), не отдельную форму.
      -->
      <b-button
        type="is-primary"
        icon-left="plus"
        @click="openAgentWizard"
      >
        Создать агента
      </b-button>

      <b-dropdown
        class="tr-dropdown tr-demo-panel"
        position="is-bottom-left"
        aria-role="menu"
      >
        <template #trigger>
          <button
            class="tr-navbar-trigger tr-demo-panel-trigger"
            type="button"
            aria-label="Панель демо-режима кита"
          >
            <b-icon icon="tune-variant" size="is-small" />
            <span class="tr-navbar-trigger__label">Demo</span>
          </button>
        </template>

        <b-dropdown-item custom :focusable="false">
          <p class="tr-dropdown-intro">
            Только кит: переключает демонстрационное состояние экранов, не
            затрагивая контракт кабинета.
          </p>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item custom :focusable="false">
          <div class="tr-demo-panel__field">
            <label class="tr-demo-panel__label" for="tr-demo-panel-mode">
              Сценарий
            </label>
            <b-select
              id="tr-demo-panel-mode"
              v-model="demoMode"
              size="is-small"
              expanded
              aria-label="Демо-сценарий состояния"
            >
              <option
                v-for="item in demoModeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </b-select>
          </div>
        </b-dropdown-item>

        <b-dropdown-item custom :focusable="false">
          <div class="tr-dropdown-setting">
            <span class="tr-dropdown-action">Длинные подписи</span>
            <b-switch
              v-model="demoLongLabels"
              size="is-small"
              aria-label="Длинные подписи в демо-данных"
            />
          </div>
        </b-dropdown-item>

        <b-dropdown-item custom :focusable="false">
          <div class="tr-dropdown-setting">
            <span class="tr-dropdown-action">Много данных</span>
            <b-switch
              v-model="demoDenseData"
              size="is-small"
              aria-label="Большой набор демо-данных"
            />
          </div>
        </b-dropdown-item>

        <b-dropdown-item custom :focusable="false">
          <div class="tr-demo-panel__field">
            <label class="tr-demo-panel__label" for="tr-demo-panel-resource-menu-size">
              Resource-меню
            </label>
            <b-select
              id="tr-demo-panel-resource-menu-size"
              v-model="demoResourceMenuSize"
              size="is-small"
              expanded
              aria-label="Размер resource-меню Navbar"
            >
              <option
                v-for="item in resourceMenuSizeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </b-select>
          </div>
        </b-dropdown-item>
      </b-dropdown>

      <b-dropdown
        v-model="workspace"
        class="tr-dropdown tr-workspace-dropdown"
        position="is-bottom-left"
        aria-role="list"
      >
        <template #trigger>
          <button
            class="tr-navbar-trigger tr-workspace-trigger"
            type="button"
            aria-label="Выбрать рабочее пространство"
          >
            <b-icon icon="briefcase-outline" size="is-small" />
            <span class="tr-workspace-trigger__selection">
              <span class="tr-navbar-trigger__label">
                {{ activeWorkspace.name }}
              </span>
              <b-icon
                class="tr-workspace-switch-icon"
                icon="unfold-more-horizontal"
                size="is-small"
              />
            </span>
          </button>
        </template>

        <b-dropdown-item custom :focusable="false">
          <p class="tr-dropdown-intro">
            Переключайтесь между доступными рабочими пространствами.
          </p>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item
          v-for="item in workspaces"
          :key="item.id"
          :value="item.id"
          aria-role="listitem"
        >
          <span class="tr-dropdown-item-row">
            <span class="tr-dropdown-item-copy">
              <strong>{{ item.name }}</strong>
              <small>{{ item.role }}</small>
            </span>
            <b-tag size="is-small">{{ item.plan }}</b-tag>
          </span>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item @click="goToWorkspaceSettings">
          <span class="tr-dropdown-action">
            <b-icon icon="cog-outline" size="is-small" />
            Настройки
          </span>
        </b-dropdown-item>
        <b-dropdown-item @click="goToWorkspaceMembers">
          <span class="tr-dropdown-action">
            <b-icon icon="account-multiple-outline" size="is-small" />
            Участники
          </span>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item @click="emit('create-workspace')">
          <span class="tr-dropdown-action">
            <b-icon icon="plus" size="is-small" />
            Создать пространство
          </span>
        </b-dropdown-item>
      </b-dropdown>

      <b-dropdown
        v-if="hasUnreadNotifications"
        class="tr-dropdown tr-notifications-dropdown"
        position="is-bottom-left"
        aria-role="menu"
      >
        <template #trigger>
          <button
            class="tr-navbar-trigger tr-notifications-trigger"
            type="button"
            :aria-label="`События: ${unreadNotificationsCount} непрочитанных`"
          >
            <b-icon icon="bell-outline" size="is-small" />
            <span class="tr-notifications-trigger__badge" aria-hidden="true">
              {{ unreadNotificationsCount }}
            </span>
          </button>
        </template>

        <b-dropdown-item custom :focusable="false">
          <div class="tr-notifications-heading">
            <strong>События</strong>
            <span>{{ unreadNotificationsCount }} новых</span>
          </div>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item
          v-for="event in notificationEvents"
          :key="event.id"
          aria-role="menuitem"
          @click="markNotificationRead(event.id)"
        >
          <span class="tr-notification">
            <span
              class="tr-notification__marker"
              :class="{ 'is-read': event.read }"
              aria-hidden="true"
            />
            <span class="tr-notification__copy">
              <strong>{{ event.title }}</strong>
              <small>{{ event.description }}</small>
              <time>{{ event.time }}</time>
            </span>
          </span>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item @click="markAllNotificationsRead">
          <span class="tr-notifications-all">Все события</span>
        </b-dropdown-item>
      </b-dropdown>

      <b-dropdown
        ref="userDropdown"
        class="tr-dropdown tr-user-dropdown"
        position="is-bottom-left"
        mobile-modal
        aria-role="menu"
        @active-change="isUserMenuActive = $event"
      >
        <template #trigger>
          <button
            class="tr-navbar-trigger tr-user-trigger"
            type="button"
            aria-label="Настройки пользователя"
          >
            <span class="tr-user-avatar">{{ userInitials }}</span>
            <span class="tr-user-summary">
              <strong>{{ user.firstName }} {{ user.lastName }}</strong>
              <small>{{ user.role }}</small>
            </span>
          </button>
        </template>

        <b-dropdown-item
          class="tr-mobile-menu-header"
          custom
          :focusable="false"
        >
          <div class="tr-mobile-menu-header__row">
            <div class="tr-mobile-menu-profile">
              <span class="tr-user-avatar">{{ userInitials }}</span>
              <span class="tr-user-summary">
                <strong>{{ user.firstName }} {{ user.lastName }}</strong>
                <small>{{ user.role }}</small>
              </span>
            </div>
            <button
              class="tr-mobile-menu-header__close"
              type="button"
              aria-label="Закрыть меню профиля"
              @click.stop="closeUserMenu"
            >
              <b-icon icon="close" />
            </button>
          </div>
        </b-dropdown-item>

        <b-dropdown-item custom :focusable="false">
          <div class="tr-dropdown-setting">
            <span class="tr-dropdown-action">
              <b-icon icon="theme-light-dark" size="is-small" />
              Тема
            </span>
            <span class="tr-theme-toggle">
              <b-icon
                class="tr-theme-toggle__icon"
                icon="weather-sunny"
                size="is-small"
              />
              <b-switch
                v-model="isDark"
                size="is-small"
                aria-label="Переключить тему"
              />
              <b-icon
                class="tr-theme-toggle__icon"
                icon="weather-night"
                size="is-small"
              />
            </span>
          </div>
        </b-dropdown-item>

        <b-dropdown-item custom :focusable="false">
          <div class="tr-dropdown-setting">
            <span class="tr-dropdown-action">
              <b-icon icon="translate" size="is-small" />
              Язык
            </span>
            <b-select v-model="locale" size="is-small">
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </b-select>
          </div>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item @click="goToProfile">
          <span class="tr-dropdown-action">
            <b-icon icon="account-outline" size="is-small" />
            Профиль
          </span>
        </b-dropdown-item>
        <b-dropdown-item @click="goToSecurity">
          <span class="tr-dropdown-action">
            <b-icon icon="shield-lock-outline" size="is-small" />
            Безопасность
          </span>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item
          class="tr-dropdown-danger"
          @click="emit('logout')"
        >
          <span class="tr-dropdown-action">
            <b-icon icon="logout" size="is-small" />
            Выйти
          </span>
        </b-dropdown-item>

        <template v-if="resourceLinks.length">
          <b-dropdown-item
            class="tr-user-resource-separator"
            separator
          />

          <b-dropdown-item
            v-for="item in resourceLinks"
            :key="item.label"
            class="tr-user-resource"
          >
            {{ item.label }}
          </b-dropdown-item>
        </template>
      </b-dropdown>
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import {
  administrationNavigationItems,
  mainNavigationItems,
} from "../navigation";
import { useFocusTrap } from "../composables/useFocusTrap";
import {
  DEMO_MODE_LABELS,
  DEMO_MODES,
  RESOURCE_MENU_SIZE_LABELS,
  RESOURCE_MENU_SIZES,
  useDemoStore,
} from "../stores/demo";
import { useNotificationsStore } from "../stores/notifications";
import Logo from "./Logo.vue";

/**
 * @typedef {Object} Workspace
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} plan
 */

/**
 * @typedef {Object} User
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} role
 */

/**
 * @typedef {Object} ResourceLink
 * @property {string} label
 */

const props = defineProps({
  /** @type {import("vue").PropType<Workspace[]>} */
  workspaces: {
    type: Array,
    required: true,
  },
  /** @type {import("vue").PropType<User>} */
  user: {
    type: Object,
    required: true,
  },
  // Bare topbar for `/auth/*` (Logo only, no workspace switcher/resource
  // menu/notifications/user menu) — mirrors get.3xtr.im's App.vue, which
  // renders a prop-less `<Navbar />` on auth routes. `workspaces`/`user`
  // stay required props here regardless (the kit has no distinct
  // "logged out" state — fixtures are always loaded), this only hides the
  // markup that reads them.
  minimal: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["create-workspace", "logout"]);

const workspace = defineModel("workspace", { required: true });
const isDark = defineModel("isDark", { required: true });
const locale = ref("ru");
const mobileNavDropdown = ref(null);
const userDropdown = ref(null);
const route = useRoute();
const router = useRouter();

// Kit-only demo control panel (Task A7.2): two-way bound to `useDemoStore()`
// (Task A7.1), not part of the get.3xtr.im navbar contract — see
// `docs/design-system.md`, "Демо-панель навбара (только кит)".
const demoStore = useDemoStore();
const {
  mode: demoMode,
  longLabels: demoLongLabels,
  denseData: demoDenseData,
  resourceMenuSize: demoResourceMenuSize,
} = storeToRefs(demoStore);

const demoModeOptions = DEMO_MODES.map((value) => ({
  value,
  label: DEMO_MODE_LABELS[value],
}));

const resourceMenuSizeOptions = RESOURCE_MENU_SIZES.map((value) => ({
  value,
  label: RESOURCE_MENU_SIZE_LABELS[value],
}));

// Buefy's `mobile-modal` dropdowns already trap Tab (`trap-focus` directive)
// and close on Escape themselves (`Dropdown.vue`'s own `keyup` listener);
// they never return focus to the trigger once closed, so `useFocusTrap` is
// wired in for that gap only — it reacts to the real `active-change` below,
// it does not close the dropdown itself (see `composables/useFocusTrap.js`).
const isMobileNavActive = ref(false);
const isUserMenuActive = ref(false);
const mobileNavMenuEl = computed(
  () => mobileNavDropdown.value?.$el?.querySelector(".dropdown-menu") ?? null,
);
const userMenuEl = computed(
  () => userDropdown.value?.$el?.querySelector(".dropdown-menu") ?? null,
);

useFocusTrap(mobileNavMenuEl, isMobileNavActive);
useFocusTrap(userMenuEl, isUserMenuActive);

// Kit-only resource-menu registry by demo-store size (Task A8.1): "compact"
// is the base set, "full" extends it to demonstrate a wider Navbar without a
// second hardcoded markup branch — see `resourceLinks` below and
// `docs/design-system.md`, "Демо-панель навбара (только кит)".
/** @type {Record<import("../stores/demo").ResourceMenuSize, ResourceLink[]>} */
const RESOURCE_LINKS_BY_SIZE = {
  none: [],
  compact: [
    { label: "Новости" },
    { label: "API" },
    { label: "Документация" },
  ],
  full: [
    { label: "Новости" },
    { label: "API" },
    { label: "Документация" },
    { label: "Поддержка" },
    { label: "Сообщество" },
  ],
};

/** @type {import("vue").ComputedRef<ResourceLink[]>} */
const resourceLinks = computed(
  () => RESOURCE_LINKS_BY_SIZE[demoResourceMenuSize.value] ?? RESOURCE_LINKS_BY_SIZE.compact,
);

// Kit-only fixture-уведомления Navbar (Task A8.2): изолированный
// `useNotificationsStore()`, keyed по активному `workspace` (само значение
// приходит из `useWorkspaceStore().activeWorkspaceId` через App.vue —
// `Navbar.vue` про это не знает, только читает переданный id). Колокольчик
// существует только пока `hasUnreadNotifications` истинно — см.
// `docs/design-system.md`, «Уведомления Navbar (только кит)».
const notificationsStore = useNotificationsStore();
const notificationEvents = computed(
  () => notificationsStore.notificationsFor(workspace.value),
);
const unreadNotificationsCount = computed(
  () => notificationsStore.unreadCountFor(workspace.value),
);
const hasUnreadNotifications = computed(
  () => unreadNotificationsCount.value > 0,
);

/** @param {string} notificationId */
function markNotificationRead(notificationId) {
  notificationsStore.markRead(workspace.value, notificationId);
}

function markAllNotificationsRead() {
  notificationsStore.markAllRead(workspace.value);
}

const activeWorkspace = computed(
  () => props.workspaces.find((item) => item.id === workspace.value)
    ?? props.workspaces[0],
);

const userInitials = computed(
  () => `${props.user.firstName[0] ?? ""}${props.user.lastName[0] ?? ""}`,
);

// Единая точка входа в мастер создания агента (Stage A9, Task A9.2) — общая
// для desktop-кнопки и мобильного пункта меню выше.
function openAgentWizard() {
  router.push({ name: "agent-wizard" });
}

function goToWorkspaceSettings() {
  router.push({ name: "workspace-settings" });
}

function goToWorkspaceMembers() {
  router.push({ name: "workspace-members" });
}

function goToProfile() {
  router.push({ name: "profile" });
}

function goToSecurity() {
  router.push({ name: "security" });
}

function closeMobileNav() {
  mobileNavDropdown.value?.toggle();
}

function closeUserMenu() {
  userDropdown.value?.toggle();
}

/**
 * Prefix-aware match: every main navigation item is the root of a route
 * family (catalog + its detail/settings/channels/statistics children), so a
 * nested route (e.g. "agent-settings" under "/agents/:id/settings") must
 * still keep the "agents" item active. See docs/design-system.md,
 * "Навигация".
 * @param {string} routeName
 */
function isNavigationItemActive(routeName) {
  return route.path.startsWith(`/${routeName}`);
}

</script>
