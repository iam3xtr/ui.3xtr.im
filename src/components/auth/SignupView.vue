<template>
  <AuthPage>
    <h1 class="tr-card__title">Регистрация</h1>

    <b-notification v-if="isWorkspaceInvite" type="is-info is-light" :closable="false">
      Вас пригласили в пространство «{{ pendingInvite.workspaceName }}».
    </b-notification>

    <form class="tr-form" novalidate @submit.prevent="submit">
      <b-notification v-if="errorMessage" type="is-danger" :closable="false">
        {{ errorMessage }}
      </b-notification>

      <b-field label="Имя">
        <b-input
          v-model="form.name"
          placeholder="Иван Петров"
          autocomplete="name"
          :disabled="isSubmitting"
          required
        />
      </b-field>

      <b-field v-if="!isWorkspaceInvite" label="Название пространства">
        <b-input
          v-model="form.workspace"
          placeholder="Моя команда"
          autocomplete="organization"
          maxlength="64"
          :disabled="isSubmitting"
          required
        />
      </b-field>

      <b-field label="Email">
        <b-input
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          :disabled="isSubmitting"
          required
        />
      </b-field>

      <b-field label="Пароль">
        <b-input
          v-model="form.password"
          type="password"
          password-reveal
          placeholder="Не короче 8 символов"
          autocomplete="new-password"
          :disabled="isSubmitting"
          required
        />
      </b-field>

      <b-field label="Повторите пароль">
        <b-input
          v-model="form.repeat"
          type="password"
          password-reveal
          autocomplete="new-password"
          :disabled="isSubmitting"
          required
        />
      </b-field>

      <b-button
        native-type="submit"
        type="is-primary"
        size="is-medium"
        expanded
        :loading="isSubmitting"
      >
        Зарегистрироваться
      </b-button>

      <p class="tr-auth__footer">
        <span>Уже есть аккаунт?</span>
        <RouterLink to="/auth/login" class="tr-auth__link">Войти</RouterLink>
      </p>
    </form>
  </AuthPage>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useAuthStore } from "../../stores/auth";
import { useToasterStore } from "../../stores/toaster";
import AuthPage from "./AuthPage.vue";

// `/auth/signup` (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/views/SignupView.vue`. Кабинет различает три
// режима (open-mode/workspace-invite/registration-invite) и шлёт разный
// payload на бэкенд; кит не выполняет запрос вовсе (`stores/auth.js`,
// `signup()` — фикстурный промис), поэтому здесь сохранён только
// пользовательский эффект режима: поле «Название пространства» скрывается,
// когда есть pending workspace-инвайт (см. `LoginView.vue`/`InviteView.vue`).
const router = useRouter();
const authStore = useAuthStore();
const toaster = useToasterStore();
const { pendingInvite } = storeToRefs(authStore);

const isWorkspaceInvite = computed(() => pendingInvite.value?.kind === "workspace");

const form = reactive({
  name: "",
  workspace: "",
  email: "",
  password: "",
  repeat: "",
});
const errorMessage = ref("");
const isSubmitting = ref(false);

async function submit() {
  if (isSubmitting.value) {
    return;
  }

  errorMessage.value = "";

  if (form.password !== form.repeat) {
    errorMessage.value = "Пароли не совпадают.";
    return;
  }

  if (!isWorkspaceInvite.value && form.workspace.trim().length < 1) {
    errorMessage.value = "Укажите название пространства.";
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.signup({
      name: form.name.trim(),
      email: form.email,
      password: form.password,
      workspace: isWorkspaceInvite.value ? undefined : form.workspace.trim(),
      inviteToken: pendingInvite.value?.token,
    });
    authStore.clearPendingInvite();
    toaster.success("Регистрация завершена. Войдите в аккаунт.");
    router.replace({ name: "auth-login" });
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isSubmitting.value = false;
  }
}
</script>
