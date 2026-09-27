<template>
  <!-- The plugin setup is a copyable fragment; the sidebar and Icon examples render live. -->
  <PageHeader
    title="Application shell"
    subtitle="Установка trVue, боковая навигация с тарифом и приоритет резолюции Icon — в одном маршруте."
  />

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Установка `trVue`</h2>
    <p class="tr-muted mb-4">
      Плагин регистрирует весь публичный набор core/navigation компонентов
      под фиксированными именами <code>tr-*</code> одним вызовом
      <code>app.use(trVue)</code> — альтернатива именованным импортам,
      которые использует собственный <code>src/main.js</code> этого кита
      (см. его код и комментарий там). Порядок обязателен: Router → Buefy →
      trVue — плагин не регистрирует ни то, ни другое сам.
    </p>
    <CopyPre :text="mainJsFragment" title="Скопировать main.js" />
  </section>

  <section class="tr-grid tr-grid--2 mb-5">
    <article class="tr-card">
      <h2 class="tr-card__title">Боковая навигация</h2>
      <p class="tr-muted mb-4">
        Тот же список, что рендерит настоящий <code>Sidebar.vue</code> —
        prefix-aware active-состояние по текущему маршруту, не отдельная
        демо-разметка.
      </p>

      <aside class="tr-uikit-demo-padded tr-card">
        <b-menu>
          <b-menu-list>
            <b-menu-item
              v-for="item in mainNavigationItems"
              :key="item.routeName"
              tag="router-link"
              :to="{ name: item.routeName }"
              :icon="item.icon"
              :label="item.label"
              :title="item.label"
            />
          </b-menu-list>
        </b-menu>

        <TariffSummaryCard
          class="mt-4"
          :tariff="activeWorkspaceTariff"
          :to="{ name: 'workspace-plans' }"
        />
        <p class="tr-muted mt-2">
          Карточка — <code>RouterLink</code> на «Пространство → Тарифы»;
          кликните, чтобы перейти на реальный маршрут этого приложения.
        </p>
      </aside>
    </article>

    <article class="tr-card">
      <h2 class="tr-card__title">Приоритет резолюции `Icon`</h2>
      <p class="tr-muted mb-4">
        Живые примеры используют установленную опубликованную версию
        <code>@iam3xtr/vue</code>: сначала реестр SVG, затем Buefy MDI,
        а при отсутствии имени — placeholder.
      </p>

      <div class="tr-stack mb-4">
        <div class="tr-row">
          <Icon name="openai" size="32" />
          <span>
            <strong>Custom SVG — совпадение</strong> —
            <code>name="openai"</code> совпадает с ключом, который
            <code>main.js</code> передаёт в <code>provideIconRegistry</code>.
          </span>
        </div>

        <div class="tr-row">
          <Icon icon="shield-account-outline" size="32" />
          <span>
            <strong>Buefy MDI fallback</strong> —
            <code>icon="shield-account-outline"</code> не найден в SVG-реестре.
          </span>
        </div>
        <div class="tr-row">
          <Icon size="32" />
          <span>
            <strong>Без имени</strong> — <code>aria-hidden</code>
            placeholder текущего размера.
          </span>
        </div>
      </div>

      <p class="tr-muted mb-2">
        Опубликованная цепочка resolution — slot → реестр потребителя →
        default-реестр <code>@iam3xtr/ui/icons</code> → Buefy MDI fallback →
        placeholder. Ниже — копируемый пример всех вариантов; часть из них
        показана живьём выше.
      </p>
      <CopyPre :text="iconPrecedenceFragment" title="Скопировать пример" />
    </article>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";

import { Icon, CopyPre } from "@iam3xtr/vue";
import { PageHeader, TariffSummaryCard } from "@iam3xtr/vue/navigation";
import { mainNavigationItems } from "../../navigation";
import { useWorkspaceStore } from "../../stores/workspace";

const workspaceStore = useWorkspaceStore();
const { activeWorkspaceTariff } = storeToRefs(workspaceStore);

// Executable fragment (Handoff.2 требование 3: "отдельным executable main.js
// fragment, а не в template") — валидный, самодостаточный ESM-код в порядке
// Router → Buefy → trVue, как документирует `packages/vue/README.md`
// ("Плагин `trVue`") и doc-comment `packages/vue/src/plugin.js`. Показан как
// текст через `CopyPre`, а не выполняется этим компонентом: сам кит
// использует named imports (см. `src/main.js`), а не `trVue`, — фрагмент
// ниже документирует альтернативный путь для downstream-потребителя.
const mainJsFragment = `import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import Buefy from "buefy";

import { trVue } from "@iam3xtr/vue/plugin";
import "@iam3xtr/ui/styles/theme.scss";

import App from "./App.vue";
import routes from "./routes.js";

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);

// Порядок обязателен: Router -> Buefy -> trVue.
app.use(router);
app.use(Buefy, { defaultIconPack: "mdi" });
app.use(trVue);

app.mount("#app");
`;

// Copyable example of the published Icon resolution contract.
const iconPrecedenceFragment = `<!-- 1. Непустой default slot — full escape hatch -->
<Icon name="openai">
  <b-icon icon="star" type="is-warning" />
</Icon>

<!-- 2. "name"/"icon" в реестре потребителя (provideIconRegistry) -->
<Icon name="openai" />

<!-- 3. "name"/"icon" в default-реестре @iam3xtr/ui/icons (без единого
        вызова provideIconRegistry) -->
<Icon icon="anthropic" />

<!-- 4. Buefy MDI fallback через глобально зарегистрированный BIcon -->
<Icon icon="shield-account-outline" />

<!-- 5. aria-hidden placeholder — имя и содержимое отсутствуют -->
<Icon />
`;
</script>
