<template>
  <AuthPage>
    <h1 class="tr-card__title">Приглашение</h1>

    <template v-if="status === 'inspecting' || (status === 'ready' && demoStore.isLoading)">
      <Loader size="section" />
    </template>

    <AsyncState
      v-else-if="status === 'ready' && demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <AsyncState
      v-else-if="status === 'ready' && demoStore.isError"
      variant="error"
      :icon="demoStore.listAsyncState.errorIcon"
      :title="demoStore.listAsyncState.errorTitle"
      :message="demoStore.listAsyncState.errorMessage"
    />

    <template v-else-if="status === 'ready'">
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Часть данных приглашения недоступна из-за временной ошибки. Само
        приглашение ниже — актуально.
      </b-message>

      <p class="mb-4">
        Вас пригласили в пространство «{{ pendingInvite?.workspaceName }}».
      </p>
      <b-button type="is-primary" size="is-medium" expanded class="mb-2" @click="accept">
        Принять приглашение
      </b-button>
      <b-button size="is-medium" expanded @click="goSignup">
        Создать аккаунт
      </b-button>
      <p class="tr-auth__footer mt-4">
        <button type="button" class="tr-auth__link" @click="report">
          Это не моё приглашение
        </button>
      </p>
    </template>

    <template v-else-if="status === 'success'">
      <p class="mb-4">Вы присоединились к пространству «{{ pendingInvite?.workspaceName }}».</p>
      <RouterLink :to="{ name: 'dashboard' }" class="button is-primary is-medium is-fullwidth">
        Перейти в кабинет
      </RouterLink>
    </template>

    <template v-else-if="status === 'reported'">
      <p class="mb-4">Спасибо, мы разберёмся.</p>
      <p class="tr-auth__footer">
        <RouterLink to="/auth/login" class="tr-auth__link">Вернуться ко входу</RouterLink>
      </p>
    </template>

    <template v-else-if="status === 'invalid'">
      <b-notification type="is-danger" :closable="false">
        Приглашение недействительно, отозвано или уже использовано.
      </b-notification>
      <p class="tr-auth__footer mt-4">
        <RouterLink to="/auth/login" class="tr-auth__link">Вернуться ко входу</RouterLink>
      </p>
    </template>
  </AuthPage>
</template>

<script setup>
// `/auth/invite/:token?` (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/views/InviteView.vue`. Кабинетная версия
// различает workspace/registration-инвайты и состояние аутентификации через
// реальные `api.invitationsInspect/Accept/Report`; кит без бэкенда сводит это
// к одной фикстурной ветке — "приглашение в существующее демо-пространство"
// (имя берётся из `stores/workspace.js`), — с тем же набором терминальных
// состояний (`success`/`reported`/`invalid`) и тем же принципом «токен только
// в памяти» (см. `VerifyView.vue`), но без различения причин отказа.
//
// Demo-режим (Stage A7, Task A7.5): применяется только к найденному
// приглашению (`status === 'ready'`), не к реальной валидации токена —
// `inspecting`/`invalid` не затронуты, тот же принцип, что "route-валидация
// побеждает над demo-режимом" в `agents/AgentDetail.vue`/
// `knowledge/CollectionDetail.vue`. Loading/permission-denied/error — тот же
// приём, что `Dashboard.vue`; partial — `b-message`-баннером поверх карточки
// приглашения.
import { onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useAuthStore } from "../../stores/auth";
import { useDemoStore } from "../../stores/demo";
import { useWorkspaceStore } from "../../stores/workspace";
import { AsyncState, Loader } from "@iam3xtr/vue";
import AuthPage from "./AuthPage.vue";

const route = useRoute();
const router = useRouter();
const demoStore = useDemoStore();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const { pendingInvite } = storeToRefs(authStore);

/** @type {import("vue").Ref<"inspecting" | "ready" | "success" | "reported" | "invalid">} */
const status = ref("inspecting");

onMounted(async () => {
  const routeToken = typeof route.params.token === "string" ? route.params.token : "";

  if (routeToken) {
    authStore.setPendingInvite({
      token: routeToken,
      kind: "workspace",
      workspaceName: workspaceStore.workspaces[0]?.name ?? "",
    });
    await router.replace({ name: "auth-invite", params: {} }).catch(() => {});
  }

  window.setTimeout(() => {
    status.value = pendingInvite.value ? "ready" : "invalid";
  }, 400);
});

function accept() {
  status.value = "success";
  authStore.clearPendingInvite();
}

function goSignup() {
  router.push({ name: "auth-signup" });
}

function report() {
  authStore.clearPendingInvite();
  status.value = "reported";
}
</script>
