<template>
  <AuthPage>
    <h1 class="tr-card__title">Подтверждение почты</h1>

    <template v-if="status === 'idle'">
      <p class="tr-muted mb-4">Нажмите кнопку ниже, чтобы подтвердить адрес электронной почты.</p>
      <b-button type="is-primary" size="is-medium" expanded @click="confirm">
        Подтвердить
      </b-button>
    </template>

    <template v-else-if="status === 'submitting'">
      <b-button type="is-primary" size="is-medium" expanded loading disabled />
    </template>

    <template v-else-if="status === 'success'">
      <p class="mb-4">Почта подтверждена.</p>
      <RouterLink :to="{ name: 'auth-login' }" class="button is-primary is-medium is-fullwidth">
        Войти
      </RouterLink>
    </template>

    <template v-else-if="status === 'invalid'">
      <b-notification type="is-danger" :closable="false">
        Ссылка недействительна или уже использована.
      </b-notification>
      <p class="tr-auth__footer mt-4">
        <RouterLink to="/auth/login" class="tr-auth__link">Вернуться ко входу</RouterLink>
      </p>
    </template>
  </AuthPage>
</template>

<script setup>
// `/auth/verify/:token?` (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/views/VerifyView.vue`. Кабинетная версия
// хранит одноразовый токен только в памяти и вычищает его из адресной строки
// сразу после захвата (см. её собственный подробный комментарий о жизненном
// цикле секрета) — здесь тот же принцип воспроизведён в упрощённом виде:
// токен читается один раз в `onMounted`, тут же стирается `router.replace`
// на маршрут без параметра, и дальше живёт только в локальном `ref`. Кит не
// делает сетевого запроса — `confirm()` использует `window.setTimeout` вместо
// `api.verificationConfirm`, а «неверный токен» — единственный безопасный
// исход и для отсутствующего, и для просроченного токена, как и в кабинете.
import { onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import AuthPage from "./AuthPage.vue";

const route = useRoute();
const router = useRouter();

/** @type {import("vue").Ref<"idle" | "submitting" | "success" | "invalid">} */
const status = ref("idle");
const token = ref("");

onMounted(async () => {
  const routeToken = typeof route.params.token === "string" ? route.params.token : "";

  if (routeToken) {
    token.value = routeToken;
    await router.replace({ name: "auth-verify", params: {} }).catch(() => {});
  }

  if (!token.value) {
    status.value = "invalid";
  }
});

function confirm() {
  if (!token.value || status.value === "submitting") {
    return;
  }

  status.value = "submitting";
  window.setTimeout(() => {
    token.value = "";
    status.value = "success";
  }, 500);
}
</script>
