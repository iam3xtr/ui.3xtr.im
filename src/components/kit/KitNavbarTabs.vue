<template>
  <!--
    Stage 5: рабочие варианты публичного `NavbarTabs` из
    `@iam3xtr/vue/navigation`. Тот же компонент, что KitShell телепортирует
    в Navbar, здесь рендерится прямо в карточке, чтобы ширину контейнера
    можно было сузить и увидеть стрелки переполнения.
  -->
  <section class="tr-card mb-5">
    <h2 class="tr-card__title">NavbarTabs</h2>
    <p class="tr-muted mb-4">
      Полоса вкладок занимает ширину контейнера и не сжимает подписи.
      Стрелки появляются только при фактическом переполнении и
      прокручивают к следующей скрытой вкладке; активная вкладка
      прокручивается в видимую область после смены маршрута и resize.
    </p>

    <b-field label="Ширина контейнера">
      <b-radio-button
        v-for="option in WIDTHS"
        :key="option.value"
        v-model="width"
        :native-value="option.value"
        size="is-small"
      >
        {{ option.label }}
      </b-radio-button>
    </b-field>

    <div
      class="tr-navbar-tabs-kit__frame"
      :class="`tr-navbar-tabs-kit__frame--${width}`"
    >
      <NavbarTabs
        :items="items"
        aria-label="Разделы UI Kit (пример)"
        prev-label="Предыдущие разделы"
        next-label="Следующие разделы"
      />
    </div>

    <h3 class="tr-card__subtitle mt-4">Публичный API</h3>
    <ul class="tr-muted">
      <li>
        Импорт:
        <code>import { NavbarTabs } from "@iam3xtr/vue/navigation";</code>
        — отдельный entry point, требует установленный Vue Router.
      </li>
      <li>
        Props: <code>items</code> (обязателен, <code>{ label, to }</code>;
        <code>to</code> — любой <code>RouteLocationRaw</code>),
        <code>ariaLabel</code>, <code>prevLabel</code>,
        <code>nextLabel</code> (accessible names полосы и стрелок; передавайте
        локализованные строки приложения).
      </li>
      <li>
        Events и slots: нет. Активная вкладка —
        <code>router-link-exact-active</code> /
        <code>aria-current="page"</code> от <code>RouterLink</code>.
      </li>
      <li>
        Keyboard/focus: вкладки — обычные ссылки в Tab-порядке; стрелки —
        <code>&lt;button&gt;</code> с accessible name и
        <code>disabled</code> на краю прокрутки. Поддерживается RTL.
      </li>
      <li>
        В app shell вкладки телепортируются в Navbar через
        <code>NavbarMenu</code> из <code>@iam3xtr/vue</code>.
      </li>
      <li>
        Места применения в демо:
        <RouterLink :to="{ name: 'agent', params: { id: 1 } }">
          карточка агента
        </RouterLink>,
        <RouterLink :to="{ name: 'knowledge-collection', params: { id: 1 } }">
          коллекция знаний
        </RouterLink>,
        <RouterLink :to="{ name: 'workspace' }">
          рабочее пространство
        </RouterLink>,
        <RouterLink :to="{ name: 'profile' }">
          профиль
        </RouterLink>
        и навигация самого UI Kit в Navbar.
      </li>
    </ul>
  </section>

  <section class="tr-card mb-5" data-testid="navbar-resources-reference">
    <h2 class="tr-card__title">Navbar: ресурсы рядом с действиями</h2>
    <p class="tr-muted mb-4">
      Ссылки ресурсов занимают собственную ширину и стоят сразу перед
      правой группой действий; свободное место остаётся слева, а вкладки
      забирают его целиком и не усечены. Окно с шириной от 1280px
      показывает ресурсы, ниже они уходят в мобильное меню.
    </p>

    <b-field label="Ресурсы">
      <b-radio-button
        v-for="option in RESOURCE_OPTIONS"
        :key="option.value"
        v-model="resourceCount"
        :native-value="option.value"
        size="is-small"
      >
        {{ option.label }}
      </b-radio-button>
    </b-field>
    <b-field label="Вкладки">
      <b-radio-button
        v-for="option in TAB_OPTIONS"
        :key="option.value"
        v-model="tabCount"
        :native-value="option.value"
        size="is-small"
      >
        {{ option.label }}
      </b-radio-button>
    </b-field>
    <b-field>
      <b-switch v-model="showCreate" size="is-small">Create</b-switch>
    </b-field>

    <div class="tr-topbar tr-navbar-resources-kit__bar" data-testid="navbar-resources-bar">
      <strong>Logo</strong>
      <NavbarTabs
        v-if="tabCount > 0"
        :items="resourceTabs"
        aria-label="Вкладки (пример)"
        prev-label="Предыдущие разделы"
        next-label="Следующие разделы"
      />
      <nav
        v-if="resourceCount > 0"
        class="tr-topbar__links"
        aria-label="Ресурсы (пример)"
      >
        <a
          v-for="n in resourceCount"
          :key="n"
          :href="`#resource-${n}`"
          @click.prevent
        >
          Ресурс {{ n }}
        </a>
      </nav>
      <div class="tr-topbar__actions">
        <b-button v-if="showCreate" size="is-small" type="is-primary">
          Создать
        </b-button>
        <b-button size="is-small">Профиль</b-button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

import { NavbarTabs } from "@iam3xtr/vue/navigation";

const WIDTHS = [
  { value: "full", label: "Вся ширина" },
  { value: "narrow", label: "Узкий" },
];

const width = ref("narrow");

const RESOURCE_OPTIONS = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 3, label: "N" },
];
const TAB_OPTIONS = [
  { value: 0, label: "Без вкладок" },
  { value: 5, label: "5 вкладок" },
  { value: 12, label: "Длинный список" },
];

const resourceCount = ref(3);
const tabCount = ref(5);
const showCreate = ref(true);

const resourceTabs = computed(() =>
  Array.from({ length: tabCount.value }, (_, i) => ({
    label: i === 0 ? "Обзор" : `Раздел ${i + 1}`,
    to: { name: "kit" },
  })),
);

// Real kit sections, so every tab is a working link and the current page
// (`kit-chat`) is the active one.
const items = [
  { label: "Обзор", to: { name: "kit" } },
  { label: "Формы", to: { name: "kit-forms" } },
  { label: "Таблицы", to: { name: "kit-tables" } },
  { label: "Навигация и состояния", to: { name: "kit-navigation-states" } },
  { label: "Диалоги и оверлеи", to: { name: "kit-dialogs-overlays" } },
  { label: "Vue-компоненты", to: { name: "kit-chat" } },
  { label: "Application shell", to: { name: "kit-application-shell" } },
];
</script>

<!--
  kit-style-exception: рамка showcase для `/kit/chat`, ширину которой
  переключает пример, чтобы показать переполнение `NavbarTabs` вне Navbar.
  Сам компонент стилизуется общим `.tr-navbar-tabs*` namespace из
  `@iam3xtr/ui`; эти правила не часть публичного contract.
-->
<style scoped>
.tr-navbar-tabs-kit__frame {
  display: flex;
  min-height: 3rem;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-large);
  background: var(--tr-surface-1);
}

.tr-navbar-resources-kit__bar {
  position: static;
  margin-top: 1rem;
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-large);
}

.tr-navbar-tabs-kit__frame--narrow {
  max-width: 20rem;
}
</style>
