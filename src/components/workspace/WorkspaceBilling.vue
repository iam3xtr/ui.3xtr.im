<template>
  <section class="tr-workspace-billing">
    <div class="tr-page-header">
      <div>
        <h1 class="tr-page-title">Биллинг</h1>
        <p class="tr-page-subtitle">История платежей и способы оплаты.</p>
      </div>
    </div>

    <AsyncState
      variant="empty"
      icon="credit-card-off-outline"
      title="Биллинг скоро появится"
      :message="emptyMessage"
    />
  </section>
</template>

<script setup>
// Billing tab (Task A5.8), routed at `/workspace/billing` — a documented
// empty state per `.todo`'s clarified requirement, matching
// get.3xtr.im's own `workspace/components/WorkspaceBilling.vue` (which
// likewise renders one `AsyncState`/comingSoon block, no billing API on
// either side yet).
import AsyncState from "../common/AsyncState.vue";

// Task A10.6: called out separately from BYOK, per `.plan`'s "Платформенная
// оплата и BYOK имеют разные пояснения" — this billing surface is for the
// platform's own tariff, not for agents configured with their own provider
// key (whose response cost is billed directly by that provider, outside
// this kit's fixture data either way).
const emptyMessage = "Кит не хранит платёжные данные — история счетов и способы оплаты "
  + "появятся вместе с интеграцией платёжного провайдера в кабинете. Текущий тариф и "
  + "лимиты пространства — на вкладке «Тариф». Ответы агентов с собственным ключом "
  + "провайдера (BYOK) сюда не входят — их оплачивает напрямую сам провайдер.";
</script>
