<template>
  <!--
    Application shell (Handoff.2, .todo строки 761-828, требование 3):
    trVue-плагин собран в один исполняемый `main.js`-фрагмент отдельно от
    шаблона, sidebar с clickable `TariffSummaryCard` показан живьём, а
    приоритет резолюции `Icon` — частично живьём (то, что реально резолвит
    установленная `@iam3xtr/vue@0.1.1-alpha`), частично кодом (расширенная
    slot/registry/MDI-fallback цепочка из `packages/vue/src/components/
    Icon.vue`, ещё не опубликованная — см. секцию ниже и `.todo`).
    Кит-собственный `src/main.js` использует equivalent named imports (Icon +
    `provideIconRegistry` + `app.use(Buefy)`), а не `trVue` — ни сам плагин,
    ни его subpath-экспорт (`@iam3xtr/vue/plugin`) не входят в установленную
    `package.json#exports`; фрагмент ниже — не executed в этом сценарии,
    только документированный код для будущего downstream-потребителя (см.
    Handoff.1, docs/issue-drafts/…).
  -->
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
        Живой пример ниже — то, что реально резолвит установленная
        <code>@iam3xtr/vue@0.1.1-alpha</code> (см. <code>node_modules</code>,
        та же версия, что использует <code>main.js</code> этого кита):
        <code>name</code> обязателен, реестр — только то, что передано в
        <code>provideIconRegistry</code>, без slot и без MDI fallback.
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
          <Icon name="not-registered-icon" size="32" />
          <span>
            <strong>Без совпадения</strong> — <code>aria-hidden</code>
            placeholder текущего размера; это единственный fallback
            установленной версии, без Buefy MDI.
          </span>
        </div>
      </div>

      <p class="tr-muted mb-2">
        Расширенная цепочка resolution — slot → реестр потребителя →
        default-реестр <code>@iam3xtr/ui/icons</code> → Buefy MDI fallback →
        placeholder — уже реализована в
        <code>packages/vue/src/components/Icon.vue</code> (Issue #8.2), но
        <strong>не реализуема живьём в этом сценарии</strong>: этот
        workspace-source ещё не опубликован под новой версией — установленная
        <code>@iam3xtr/vue@0.1.1-alpha</code> — это более ранний снимок
        реестра (см. Handoff.1 и «Что остаётся невыполненным» в
        <code>.todo</code>). Ниже — код именно из будущего опубликованного
        контракта, не выполняемый здесь.
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

// Not-yet-published contract (`packages/vue/src/components/Icon.vue`, Issue
// #8.2) — the resolution chain the live demo above cannot reach with the
// installed `@iam3xtr/vue@0.1.1-alpha` (no slot, no `icon` alias, no
// default `@iam3xtr/ui/icons` registry, no Buefy MDI fallback: only a
// required `name` against whatever `provideIconRegistry` injected, or an
// `aria-hidden` placeholder). Shown as text only, never imported/executed.
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

<!-- 5. aria-hidden placeholder — нет совпадения ни на одном шаге -->
<Icon name="not-registered-icon" />
`;
</script>
