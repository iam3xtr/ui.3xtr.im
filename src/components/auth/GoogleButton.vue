<template>
  <b-button
    type="is-light"
    size="is-medium"
    expanded
    disabled
    class="tr-auth__google"
    title="Недоступно в демонстрационном режиме — кит не подключает реальный OAuth"
  >
    <Icon name="google" size="18" />
    <span>Продолжить с Google</span>
  </b-button>
</template>

<script setup>
// Демонстрационная кнопка (Task A5.10), эквивалент
// `get.3xtr.im/src/modules/auth/components/GoogleButton.vue`. Кабинетная
// версия вставляет живой `<script src="https://accounts.google.com/gsi/client">`
// и реальный `data-login_uri` — кит не делает сетевых запросов и не проводит
// настоящую авторизацию (см. AGENTS.md/CLAUDE.md, «Backend changes»), поэтому
// здесь только визуальный контракт кнопки: disabled `button`, иконка вендора
// `google` (уже в реестре, `docs/design-system.md#иконки`) через общий
// `Icon.vue`.
import { Icon } from "@iam3xtr/vue";
</script>
