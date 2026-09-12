<template>
  <AuthPage>
    <h1 class="tr-card__title">Вход</h1>

    <form class="tr-form" novalidate @submit.prevent="submit">
      <b-notification v-if="errorMessage" type="is-danger" :closable="false">
        {{ errorMessage }}
      </b-notification>

      <b-field>
        <b-input
          v-model="form.email"
          type="email"
          placeholder="Введите email"
          aria-label="Email"
          autocomplete="email"
          :disabled="isSubmitting"
          required
        />
      </b-field>

      <b-field>
        <b-input
          v-model="form.password"
          type="password"
          password-reveal
          placeholder="Введите пароль"
          aria-label="Пароль"
          autocomplete="current-password"
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
        Войти
      </b-button>

      <p class="tr-auth__footer">
        <span>Ещё нет аккаунта?</span>
        <RouterLink to="/auth/signup" class="tr-auth__link">Зарегистрироваться</RouterLink>
      </p>

      <div class="tr-auth__divider">или</div>

      <GoogleButton />
    </form>

    <WorkspaceSelector v-if="showWorkspacePicker" @select="onWorkspaceSelected" />
  </AuthPage>
</template>

<script setup>
import { reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useAuthStore } from "../../stores/auth";
import { useWorkspaceStore } from "../../stores/workspace";
import AuthPage from "./AuthPage.vue";
import GoogleButton from "./GoogleButton.vue";
import WorkspaceSelector from "./WorkspaceSelector.vue";

// `/auth/login` (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/views/LoginView.vue`. Кабинетная форма
// собрана на `vee-validate`; кит не подключает эту зависимость (см.
// CLAUDE.md, «Stack»), поэтому валидация — нативные HTML-атрибуты
// (`required`, `type="email"`) плюс единственная проверка учётных данных в
// `stores/auth.js`. Пароль показывает Buefy-примитив `password-reveal`
// вместо отдельного `PasswordInput.vue` — см. `docs/agent-migration-guide.md`,
// раздел 14 «Формы» («Секретное поле — `b-input type="password"
// password-reveal`, свой toggle-глаз не рисуется»), тот же выбор уже сделан
// `ChannelFormModal.vue` (Task A5.5). В отличие от остальных форм кабинета
// (раздел 14 — `b-field label="..."`), кабинетные формы входа/регистрации
// подписей полей не используют — здесь `b-field` без `label`, а подпись
// поля для скринридеров переносится в `aria-label` на `b-input`.
//
// После успешного фикстурного входа кит демонстрирует `WorkspaceSelector` —
// показывает пикер пространства поверх формы (а не редиректом сквозь
// `App.vue`, которого кит не меняет, см. `.todo`/`.plan`, «Область» задачи).
const router = useRouter();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const { pendingInvite } = storeToRefs(authStore);

const form = reactive({ email: "", password: "" });
const errorMessage = ref("");
const isSubmitting = ref(false);
const showWorkspacePicker = ref(false);

async function submit() {
  if (isSubmitting.value) {
    return;
  }

  errorMessage.value = "";
  isSubmitting.value = true;

  try {
    await authStore.login({ email: form.email, password: form.password });
    isSubmitting.value = false;

    if (pendingInvite.value) {
      router.push({ name: "auth-invite" });
      return;
    }

    if (workspaceStore.workspaces.length > 1) {
      showWorkspacePicker.value = true;
      return;
    }

    router.push({ name: "dashboard" });
  } catch (error) {
    isSubmitting.value = false;
    errorMessage.value = error.message;
  }
}

/** @param {string} _id */
function onWorkspaceSelected(_id) {
  showWorkspacePicker.value = false;
  router.push({ name: "dashboard" });
}
</script>
