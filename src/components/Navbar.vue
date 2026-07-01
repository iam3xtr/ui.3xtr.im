<template>
  <header class="tr-topbar">
    <b-dropdown
      ref="mobileNavDropdown"
      class="tr-navbar-dropdown tr-mobile-nav"
      position="is-bottom-right"
      mobile-modal
      aria-role="menu"
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

      <b-dropdown-item
        v-for="item in mainNavigationItems"
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

      <b-dropdown-item v-if="showNotifications" separator />

      <b-dropdown-item v-if="showNotifications" aria-role="menuitem">
        <span class="tr-dropdown-item-row">
          <span class="tr-dropdown-action">
            <b-icon icon="bell-outline" size="is-small" />
            События
          </span>
          <b-tag size="is-small">3</b-tag>
        </span>
      </b-dropdown-item>
    </b-dropdown>

    <Logo />

    <div v-if="showSearch" class="tr-topbar__search">
      <b-input
        ref="searchInput"
        v-model="searchQuery"
        icon="magnify"
        placeholder="Поиск"
        aria-label="Поиск"
      />
      <kbd class="tr-topbar__search-shortcut">{{ searchShortcut }}</kbd>
    </div>

    <nav
      class="tr-topbar__links"
      aria-label="Дополнительная навигация"
      :aria-hidden="!showResourceMenu"
    >
      <template v-if="showResourceMenu">
        <a
          v-for="item in resourceLinks"
          :key="item.label"
          href="#"
          @click.prevent
        >
          {{ item.label }}
        </a>
      </template>
    </nav>

    <div class="tr-topbar__actions">
      <b-dropdown
        v-model="workspace"
        class="tr-navbar-dropdown tr-workspace-dropdown"
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
        v-if="showNotifications"
        class="tr-navbar-dropdown tr-notifications-dropdown"
        position="is-bottom-left"
        aria-role="menu"
      >
        <template #trigger>
          <button
            class="tr-navbar-trigger tr-notifications-trigger"
            type="button"
            aria-label="События: 3 непрочитанных"
          >
            <b-icon icon="bell-outline" size="is-small" />
            <span class="tr-notifications-trigger__badge" aria-hidden="true">
              3
            </span>
          </button>
        </template>

        <b-dropdown-item custom :focusable="false">
          <div class="tr-notifications-heading">
            <strong>События</strong>
            <span>3 новых</span>
          </div>
        </b-dropdown-item>

        <b-dropdown-item separator />

        <b-dropdown-item
          v-for="event in notificationEvents"
          :key="event.title"
          aria-role="menuitem"
        >
          <span class="tr-notification">
            <span
              class="tr-notification__marker"
              :class="{ 'is-read': event.isRead }"
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

        <b-dropdown-item>
          <span class="tr-notifications-all">Все события</span>
        </b-dropdown-item>
      </b-dropdown>

      <b-dropdown
        ref="userDropdown"
        class="tr-navbar-dropdown tr-user-dropdown"
        position="is-bottom-left"
        mobile-modal
        aria-role="menu"
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

        <template v-if="showResourceMenu">
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

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { mainNavigationItems } from "../navigation";
import { useSiteSettingsStore } from "../stores/siteSettings";
import Logo from "./Logo.vue";

interface Workspace {
  id: string;
  name: string;
  role: string;
  plan: string;
}

interface User {
  firstName: string;
  lastName: string;
  role: string;
}

interface NotificationEvent {
  title: string;
  description: string;
  time: string;
  isRead?: boolean;
}

interface ResourceLink {
  label: string;
}

interface DropdownInstance {
  toggle: () => void;
}

const props = defineProps<{
  workspaces: Workspace[];
  user: User;
}>();

const emit = defineEmits<{
  "create-workspace": [];
  logout: [];
}>();

const workspace = defineModel<string>("workspace", { required: true });
const isDark = defineModel<boolean>("isDark", { required: true });
const locale = ref("ru");
const searchQuery = ref("");
const searchInput = ref<{ focus: () => void } | null>(null);
const mobileNavDropdown = ref<DropdownInstance | null>(null);
const userDropdown = ref<DropdownInstance | null>(null);
const searchShortcut = ref("Ctrl K");
const route = useRoute();
const router = useRouter();
const siteSettings = useSiteSettingsStore();
const {
  showSearch,
  showResourceMenu,
  showNotifications,
} = storeToRefs(siteSettings);

const resourceLinks: ResourceLink[] = [
  { label: "Новости" },
  { label: "API" },
  { label: "Документация" },
];

const notificationEvents: NotificationEvent[] = [
  {
    title: "Новый диалог",
    description: "Анна начала диалог с агентом «Консультант».",
    time: "5 минут назад",
  },
  {
    title: "Агент обновлён",
    description: "Настройки агента «Sales Assistant» сохранены.",
    time: "1 час назад",
  },
  {
    title: "Участник приглашён",
    description: "В пространство отправлено новое приглашение.",
    time: "Вчера",
    isRead: true,
  },
];

const activeWorkspace = computed(
  () => props.workspaces.find((item) => item.id === workspace.value)
    ?? props.workspaces[0],
);

const userInitials = computed(
  () => `${props.user.firstName[0] ?? ""}${props.user.lastName[0] ?? ""}`,
);

function goToWorkspaceSettings(): void {
  router.push({ name: "settings" });
}

function goToWorkspaceMembers(): void {
  router.push({ name: "workspace-members" });
}

function goToProfile(): void {
  router.push({ name: "profile" });
}

function goToSecurity(): void {
  router.push({ name: "security" });
}

function closeMobileNav(): void {
  mobileNavDropdown.value?.toggle();
}

function closeUserMenu(): void {
  userDropdown.value?.toggle();
}

function handleSearchShortcut(event: KeyboardEvent): void {
  if (
    (event.ctrlKey || event.metaKey)
    && event.key.toLocaleLowerCase() === "k"
  ) {
    event.preventDefault();
    searchInput.value?.focus();
  }
}

onMounted(() => {
  if (/Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    searchShortcut.value = "⌘ K";
  }

  window.addEventListener("keydown", handleSearchShortcut);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleSearchShortcut);
});
</script>
