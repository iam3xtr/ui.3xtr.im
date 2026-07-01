<template>
  <header class="tr-topbar">
    <Logo />

    <div class="tr-topbar__search">
      <b-input
        ref="searchInput"
        v-model="searchQuery"
        icon="magnify"
        placeholder="Поиск"
        aria-label="Поиск"
      />
      <kbd class="tr-topbar__search-shortcut">{{ searchShortcut }}</kbd>
    </div>

    <div class="tr-topbar__actions">
      <b-dropdown
        v-model="workspace"
        class="tr-navbar-dropdown"
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
        class="tr-navbar-dropdown tr-user-dropdown"
        position="is-bottom-left"
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
      </b-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

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
const searchShortcut = ref("Ctrl K");
const router = useRouter();

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
