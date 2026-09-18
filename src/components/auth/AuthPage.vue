<template>
  <section class="tr-auth">
    <div class="tr-auth__card" :class="{ 'tr-card': !flat }">
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
// по умолчанию переиспользует уже существующий `.tr-card`. Кит не подключает
// vue-i18n (см. CLAUDE.md «Stack»), поэтому текст соглашения — статичная
// строка, а не `lang.t(...)`.
//
// Issue #9.1: узкий flat variant — `flat` убирает только класс `.tr-card`
// (background/border/radius/padding/shadow приходят именно из него и общего
// правила `.tr-card, .box, .card, ...` в `theme.scss`, раздел 8 «Cards and
// catalogs»), не трогая общий theme contract и не требуя shared package
// change. `.tr-auth__card` остаётся всегда — он не декоративный, только
// задаёт центрированную адаптивную колонку (`width`/`max-width`/`gap`).
// `LoginView`/`SignupView`/`ForgotView` передают `flat`; `InviteView`/
// `VerifyView` не передают его и сохраняют текущий card-layout.
defineProps({
  flat: {
    type: Boolean,
    default: false,
  },
});
</script>
