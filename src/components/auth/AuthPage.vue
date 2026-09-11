<template>
  <section class="tr-auth">
    <div class="tr-auth__card tr-card">
      <slot />

      <p class="tr-auth__legal">
        Продолжая, вы принимаете
        <a href="#" class="tr-auth__link">пользовательское соглашение</a>
        и
        <a href="#" class="tr-auth__link">политику конфиденциальности</a>.
      </p>
    </div>
  </section>
</template>

<script setup>
// Общий контейнер auth-экранов (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/components/AuthPage.vue`. Кабинетная версия
// вводит мёртвые классы `auth-page`/`auth-form-container` вместо
// tr-пространства — здесь взамен них `.tr-auth`/`.tr-auth__card`
// (`trickster-buefy.scss`, раздел 13 «Utilities», подраздел «Auth»), а карточка
// переиспользует уже существующий `.tr-card`. Кит не подключает vue-i18n
// (см. CLAUDE.md «Stack»), поэтому текст соглашения — статичная строка, а не
// `lang.t(...)`.
</script>
