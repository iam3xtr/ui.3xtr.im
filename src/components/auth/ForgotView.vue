<template>
  <AuthPage>
    <h1 class="tr-card__title">Восстановление пароля</h1>

    <p class="tr-muted mb-2">Самостоятельное восстановление пароля недоступно в демо-режиме.</p>
    <p class="tr-muted">Обратитесь к администратору пространства, чтобы сбросить пароль.</p>

    <p class="tr-auth__footer mt-4">
      <RouterLink to="/auth/login" class="tr-auth__link">Вернуться ко входу</RouterLink>
    </p>
  </AuthPage>
</template>

<script setup>
import { RouterLink } from "vue-router";

import AuthPage from "./AuthPage.vue";

// `/auth/forgot` (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/views/ForgotView.vue` — кабинетный экран уже
// сам по себе объявляет самостоятельное восстановление пароля недоступным
// (`forgotNotAvailable`/`forgotContactAdmin`), так что перенос 1:1 не требует
// формы или запроса — только статический текст и ссылка назад.
</script>
