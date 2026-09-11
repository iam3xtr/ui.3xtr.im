# Инструкция: перенос дизайн-системы Trickster UI Kit в личный кабинет

Документ для агента, который приводит вёрстку реального личного кабинета
к единому шаблону, описанному в `trickster-ui-kit`. Здесь — правила и
конкретные имена классов, а не общие пожелания: если страница ЛК содержит
элемент, похожий на что-то из этого кита, он обязан получить **то же самое**
имя класса и **ту же** разметку, а не свой вариант.

## 0. Подготовка

1. Скопировать `src/styles/*` (`_trickster-tokens.scss`, `trickster-buefy.scss`)
   в целевой репозиторий, подключить файл темы в точке входа приложения
   (см. комментарий в шапке `trickster-buefy.scss`).
2. Стек-эталон — Vue 3 + Buefy 3.x + Bulma 1.x. Если ЛК на другом стеке,
   переносится **структура и имена классов**, а не сами Vue-компоненты
   один в один — но CSS-классы должны совпадать буквально, чтобы стили из
   `trickster-buefy.scss` подхватились без модификаций.
3. Регистрация Buefy — только полным плагином (`app.use(Buefy, { ... })` в
   точке входа, как в `src/main.js` этого репозитория): это одним вызовом
   регистрирует весь набор из таблицы «Собственный компонент или Buefy» в
   `docs/design-system.md` (Table/Field/Modal/Dialog/Toast/Loading/
   Pagination/Skeleton/Upload/Tabs/Message/Sidebar). Если элемент из этой
   таблицы покрывает нужную часть разметки ЛК — используется штатный
   Buefy-компонент, а не ручной аналог; единственное документированное
   исключение — `NavbarTabs` (маршрутные вкладки, а не переключение
   контента). Живые примеры каждого пункта — в разделе «Buefy-first
   реестр» `UiKit.vue`.
4. Эталонные файлы для сверки (в этом репозитории):
   `Agents.vue`, `Knowledge.vue`, `Channels.vue`, `Conversations.vue`,
   `Dashboard.vue`, `WorkspaceSettings.vue`, `UiKit.vue`. Перед правкой любой страницы
   ЛК — открыть страницу отсюда с максимально похожей структурой и
   переносить разметку поэлементно.

## 1. Главный принцип

**Одинаковый визуальный контейнер = одинаковое имя класса.**
Если на двух страницах ЛК есть, например, сетка карточек — это не
"agents-grid" и "knowledge-grid", это один `.tr-catalog-grid` в обоих
местах. Перед тем как писать новый класс — искать в `trickster-buefy.scss`,
нет ли уже подходящего. Собственный `scoped`-класс заводится только под
то, что реально уникально для страницы (например, специфичная логика
раскладки чата в `Agents.vue` — `.tr-agents__workbench`).

## 2. Разбор страницы перед правкой (чек-лист)

Для каждой страницы ЛК определить, что это, и применить соответствующий
раздел ниже:

- Список однотипных сущностей карточками (агенты, интеграции, каналы,
  проекты, шаблоны и т.п.) → **раздел 3, каталог карточек**.
- Табличные/построчные данные с одинаковыми полями (имя/статус/дата,
  список пользователей, список счетов, логи и т.д.) → **раздел 4, b-table**.
- Над списком есть поиск/фильтры → **раздел 5, toolbar**.
- Режим master-detail: список слева, содержимое/чат справа, с мобильным
  переключением вида → **раздел 6, workbench**.
- Есть вкладки → **раздел 7, b-tabs**.
- Страница/блок с переключателями-настройками → **раздел 8, settings-панель**.
- Форма с обязательными полями (создание/редактирование записи, логин,
  профиль) → **раздел 14, формы**.
- Постраничный список вне `b-table` (нужны отдельные "предыдущая/следующая") →
  **раздел 15, пагинация**.
- Модалка, подтверждение опасного действия, боковая панель или уведомление →
  **раздел 16, оверлеи**.
- Пустое состояние (нет данных) → **раздел 9**.

## 3. Каталоги карточек

Эталон: `Agents.vue`, `Knowledge.vue`, `Channels.vue` — визуально и
структурно это один и тот же паттерн, только с разными данными.

```html
<section class="tr-workbench-page">
  <header class="tr-workbench-page__header tr-page-toolbar">
    <!-- см. раздел 5 -->
  </header>

  <section class="tr-catalog" aria-label="...">
    <div class="tr-catalog-grid">
      <button
        class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive"
        type="button"
      >
        <span class="tr-entity-card__header">
          <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__icon">
            <b-icon icon="..." size="is-medium" />
          </span>
          <b-tag size="is-small">...</b-tag>
        </span>

        <strong class="tr-entity-card__title">...</strong>
        <span class="tr-entity-card__description">...</span>

        <span class="tr-entity-card__footer">
          <span>...</span>
          <span>...</span>
        </span>
      </button>

      <p v-if="isEmptyByFilter" class="tr-catalog-empty">
        По вашему запросу ничего не найдено.
      </p>

      <!-- Карточка создания нового объекта, если применимо -->
      <button
        class="tr-card tr-card--interactive tr-entity-card tr-entity-card--interactive tr-entity-card--create"
        type="button"
      >
        <span class="tr-icon-tile tr-icon-tile--plain tr-entity-card__create-icon">
          <b-icon icon="plus" size="is-medium" />
        </span>
        <strong>Создать...</strong>
        <span>Пояснение.</span>
      </button>
    </div>
  </section>
</section>
```

Правила:

- Если карточка кликабельна сама по себе (весь `<button>`/`<a>` — цель
  клика) — добавлять `tr-entity-card--interactive` (сброс курсора/шрифта/
  выравнивания текста под кнопку).
- Если карточка статична, а действие — во внутренней кнопке (как в
  `Channels.vue`) — брать только `tr-card tr-card--interactive
  tr-entity-card`, без `--interactive`.
- Иконка карточки — всегда `tr-icon-tile tr-icon-tile--plain` вместе с
  размерным классом (`tr-entity-card__icon` = 44px, `__create-icon` = 48px).
  Не переопределять `border-radius`/`background` вручную в компоненте.
- Пустое состояние внутри сетки — всегда `tr-catalog-empty`, растягивается
  на всю ширину грида (`grid-column: 1 / -1` уже в стилях).
- Ничего из этого не описывается в `<style scoped>` компонента — вся эта
  система уже в `trickster-buefy.scss`. В `scoped`-стилях страницы остаётся
  только то, что реально специфично для неё.

## 4. Табличные данные — только `b-table`

Эталон: сводная таблица «Последние агенты» в `Dashboard.vue`, полная демо-
таблица в `UiKit.vue`.

```html
<article class="tr-card">
  <div class="tr-row tr-row--between mb-4">
    <h2 class="tr-card__title mb-0">Заголовок таблицы</h2>
    <b-button size="is-small" type="is-primary" icon-left="plus">
      Добавить
    </b-button>
  </div>

  <b-table :data="rows" hoverable mobile-cards paginated :per-page="10">
    <b-table-column field="name" label="Название" v-slot="{ row }">
      <strong>{{ row.name }}</strong>
    </b-table-column>

    <b-table-column field="status" label="Статус" v-slot="{ row }">
      <b-tag :type="row.status === 'Активен' ? 'is-primary' : undefined">
        {{ row.status }}
      </b-tag>
    </b-table-column>

    <b-table-column field="updated" label="Обновлено" v-slot="{ row }">
      {{ row.updated }}
    </b-table-column>

    <b-table-column v-slot="{ row }" width="80">
      <b-dropdown position="is-bottom-left" aria-role="list">
        <template #trigger>
          <b-button icon-left="dots-vertical" size="is-small" aria-label="Действия" />
        </template>
        <b-dropdown-item aria-role="listitem">Редактировать</b-dropdown-item>
      </b-dropdown>
    </b-table-column>
  </b-table>
</article>
```

Правила:

- Любой список записей с одинаковым набором полей (пользователи, счета,
  логи, тарифы, API-ключи, элементы коллекции знаний и т.п.) заворачивается
  в `b-table`, а не рисуется вручную через `<table>` или `div`-сетку. Пример
  такого списка — таблица элементов коллекции в `Knowledge.vue`.
- `hoverable` — по умолчанию всегда. `paginated` — если список
  потенциально длинный.
- `mobile-cards` — по умолчанию всегда. Это штатный мобильный режим Buefy
  (строки превращаются в карточки label/value ниже брейкпоинта `mobile`),
  замена ручному `.tr-table--stack` и `data-label`-разметке. Не собирать
  мобильный вид таблицы вручную.
- Частные случаи оформления — модификаторы на корневом элементе:
  `<b-table class="tr-table--compact">` (плотные списки без построчных
  действий: лимиты, логи) и `<b-table class="tr-table--breakdown">`
  (сводка «статья: значение» без шапки: разбивка стоимости, итоги). Класс,
  переданный на `<b-table>`, доходит до корневого `.b-table`, потому что
  Buefy 3 прокидывает `class`/`style`/`id` через `compatFallthrough`. Смотри
  раздел «Таблица» в `UiKit.vue`. Новый визуальный вариант таблицы — это один
  из этих модификаторов или ещё один такой же, а не новый компонент.
- Статус — всегда через `b-tag` с тем же тернарным паттерном
  `:type="row.<field> === '<активное значение>' ? 'is-primary' : undefined"`,
  как во всех остальных местах кита (Agents/Conversations/Dashboard/UiKit).
- Действия над строкой — через `b-dropdown` в последней колонке с
  фиксированной шириной, как в `UiKit.vue`, а не через набор отдельных
  кнопок в ряд.
- Таблица оборачивается в `.tr-card`, заголовок — `.tr-card__title` внутри
  `.tr-row.tr-row--between`, как в примере. Не изобретать свой заголовок
  таблицы.
- Если для записи по-настоящему нужна более богатая строка, чем ячейки
  таблицы (например, крупная превью-иконка файла) — расширять именно
  колонки `b-table` (кастомный `v-slot` в `b-table-column`), а не заводить
  параллельный `div`-паттерн строки.

## 5. Toolbar (поиск + фильтры над списком)

Эталон: шапка `Agents.vue` / `Knowledge.vue` / `Channels.vue` /
`Conversations.vue`. С Task A4.7 сборка идёт через компонент `Toolbar`
(`src/components/common/Toolbar.vue`), а не вручную на каждом экране.

```html
<Toolbar
  class="tr-workbench-page__header"
  v-model:search="query"
  search-placeholder="..."
  :filters-active="Boolean(filter)"
>
  <template #filters>
    <ToolbarDropdown
      v-model="filter"
      class="tr-page-toolbar__filter"
      all-label="Все ..."
      aria-label="..."
      :options="filterOptions"
    />
  </template>

  <template #actions>
    <b-button type="is-primary" icon-left="plus">Добавить</b-button>
  </template>
</Toolbar>
```

`Toolbar` рендерит `.tr-page-toolbar` с поиском (`ToolbarSearch`, наследует
`Ctrl/⌘ K` и `kbd`-подсказку), слотом `filters`, слотом `actions` (или
`default`) и — ниже брейкпоинта `.tr-page-toolbar__filter` — тем же слотом
`filters` ещё раз внутри `MobileFilters`: это не второй набор полей, а
единственный способ добраться до фильтров на узком экране, поэтому
`MobileFilters` содержит те же `ToolbarDropdown`, а не `b-field`/`b-select`.
Проп `filters-active` пробрасывает признак «есть активный фильтр» на триггер
`MobileFilters` — сам `Toolbar` не видит состояние слота. Классы
`tr-page-toolbar`, `__search`, `__filter`, `tr-action-group` — общие,
использовать без изменений; собственные toolbar-классы под конкретный экран
не заводятся. `Navbar` — исключение: у него нет фильтров/действий, поэтому
он рендерит `ToolbarSearch` напрямую, без `Toolbar`.

Фильтр-пилюля в toolbar — всегда компонент `ToolbarDropdown` (обёртка над
`b-dropdown` с `v-model`), а не `b-select`: он даёт кастомный вид кнопки с
шевроном вместо нативного `<select>`, как в остальном ките. `options`
принимает либо массив строк, либо массив `{ value, label }`; выбор "все" —
пустая строка, добавляется автоматически, текст задаётся через `all-label`.
Если исходное состояние типизировано уже, а не просто `string` (`ref<Status
| "">("")`), под `v-model` нужен `computed`-прокси с приведением типа при
записи — см. `typeFilterProxy` в `Knowledge.vue`.

## 6. Master-detail / workbench-страницы (список + контент)

Эталон: `Conversations.vue` (канонический), `Agents.vue` (тот же паттерн,
переиспользованный для режима "чат с песочницей").

Ключевые классы: корень `tr-workbench-page`, внутри —
`tr-conversations` (да, буквально этот класс, даже не для диалогов — это
имя общего layout-примитива "список + рабочая область + панель свойств")
с модификаторами `is-${viewMode}-view` и `is-properties-open`.

С Task A3.3 элементы этого блока разделены по фактической принадлежности
(правило R1 — `__`-элемент не может называть то, что используется в шаблоне
другого компонента):

- **`tr-conversations-*`** (множественное число) — то, что принадлежит
  только странице-списку: `tr-conversations-list` (панель списка),
  `tr-conversations-list__items`, `tr-conversations-placeholder` (заглушка
  "выберите диалог"). Состояние "поиск/фильтр ничего не нашёл" внутри списка
  — не отдельный класс, а `.tr-async-state.tr-async-state--no-results`, см.
  раздел 9.
- **`tr-conversation-*`** (единственное число) — переиспользуемый виджет
  "чат + свойства одного диалога", который `Agents.vue` берёт целиком под
  свою песочницу: `tr-conversation-panel`, `tr-conversation-chat`,
  `tr-conversation-properties`, `tr-conversation-header`,
  `tr-conversation-title`, `tr-conversation-identity`,
  `tr-conversation-messages`, `tr-conversation-composer`,
  `tr-conversation-composer-input`, `tr-conversation-properties-body`,
  `tr-conversation-profile`, `tr-conversation-profile-image`,
  `tr-conversation-details`; кнопки навигации между панелями —
  `tr-conversation-icon-action` + `tr-conversation-list-action` /
  `tr-conversation-settings-action` / `tr-conversation-properties-action` /
  `tr-conversation-properties-close`.

Старые `tr-conversations__*`-имена (до Task A3.3) остаются только как
`@deprecated`-алиасы — см. раздел 13.

Если у ЛК появляется новая master-detail страница (например, "заявки" со
списком и деталями заявки) — переиспользовать этот набор классов целиком,
а не создавать параллельный `.tr-tickets` layout. Уникальным для страницы
может быть только то, что действительно не описано паттерном (пример:
`.tr-agents__workbench` — переопределение колонок грида и
`.tr-agents__sandbox-note` — плашка про тестовый режим).

## 7. Вкладки

Два контракта, у каждого своя роль — третьего (ручной Bulma `.tabs`) не
заводить нигде.

**Маршрутные вкладки раздела** — переключают URL, а не контент на месте.
Единственное документированное исключение из Buefy-first (раздел 0, п. 3):
`b-tabs` умеет переключать только локальный контент, а не маршрут.

Эталон: `NavbarTabs` в `Workspace.vue`, телепортированный в шапку через
`NavbarMenu` (владелец ветки маршрутов — родитель раздела, не `Navbar.vue`
сам по себе; см. «Меню страницы в Navbar» в `design-system.md`).

```html
<NavbarMenu>
  <NavbarTabs :items="workspaceTabs" aria-label="Навигация по пространству" />
</NavbarMenu>
```

`items` — массив `{ label, to }`, `to` — `RouteLocationRaw` для `RouterLink`.
Классы `tr-navbar-tabs`, `tr-navbar-tabs__link`,
`tr-navbar-tabs__link--icon` (иконка вместо подписи), `tr-navbar-tabs__icon`
— часть контракта компонента, отдельно не переопределять.

**Вкладки внутри страницы или модалки** — переключают контент на месте, а
маршрут не меняют.

Эталон: раздел «Вкладки» в `UiKit.vue`.

```html
<b-tabs v-model="activeTab" type="is-boxed">
  <b-tab-item label="...">...</b-tab-item>
</b-tabs>
```

Всегда `b-tabs`/`b-tab-item` из Buefy, не самодельные табы на `div`+`button`.
Если вкладки открывают панель настроек — контент вкладки оборачивается в
`tr-settings__panel` (см. раздел 8).

## 8. Панели настроек (список опций с переключателями)

Эталон: `WorkspaceSettings.vue` целиком.

```html
<div class="tr-settings__panel">
  <div class="tr-settings__panel-header">
    <h2>...</h2>
    <p>...</p>
  </div>

  <div class="tr-settings__option">
    <span class="tr-settings__option-copy">
      <strong>...</strong>
      <small>...</small>
    </span>
    <b-switch v-model="..." aria-label="..." />
  </div>

  <footer class="tr-settings__panel-footer">
    <b-button>Сохранить</b-button>
  </footer>
</div>
```

Любая страница ЛК вида "список настроек с тумблерами/выпадающими списками"
(уведомления, права доступа, интеграционные флаги и т.п.) — этот паттерн,
не самодельные строки.

## 9. Пустые состояния и загрузка — `.tr-async-state`

Единственный контент-блок для состояний "контента нет" — `.tr-async-state`.
Он ограничен пятью модификаторами и третьего не заводится:
`--loading`, `--empty`, `--no-results`, `--error`, `--permission-denied`.
Presentation-only: блок ничего не запрашивает и не решает про permissions —
это остаётся на вызывающей странице. В ките контракт собран в
`src/components/common/AsyncState.vue` (пропсы `variant`/`icon`/`title`/
`message`, слот `default` → `.tr-async-state__actions`; сам расставляет
`role`/`aria-live`) и `ListAsyncState.vue` (тонкая обёртка, флаги
`loading`/`error`/`empty`/`noResults`, приоритет
`loading > error > empty > no-results`, слоты `error-action`/
`empty-action`/`default`) — новая разметка использует их вместо ручных
`<div class="tr-async-state ...">`.

```html
<div class="tr-async-state tr-async-state--empty">
  <span class="tr-async-state__icon">
    <b-icon icon="..." size="is-large" />
  </span>
  <strong class="tr-async-state__title">Заголовок</strong>
  <span class="tr-async-state__message">Пояснение и что делать дальше.</span>
  <!-- необязательно: <div class="tr-async-state__actions">...</div> -->
</div>
```

Правила по модификаторам:

- **`--loading`** — своей разметки нет; внутрь кладётся `Loader`
  (`size="section"` или `inline`), `.tr-async-state` его только
  центрирует. Ручной спиннер (`.async-state__spinner` и подобное) не
  заводится нигде — это единственный источник "нет контента".
- **`--empty`** — вся страница/секция пуста (нет ни одной записи), с
  предметной CTA. Для полностраничного варианта `.tr-async-state`
  оборачивается в `.tr-section-empty` (растягивает высоту на весь
  `tr-workbench-page`, ничего не рисует сам) — см. `Conversations.vue`, когда
  список диалогов пуст. Внутри карточки/панели (например, у пустой
  коллекции знаний в `Knowledge.vue`) обёртка `.tr-section-empty` не нужна —
  `.tr-async-state` сам растягивается на `flex: 1` родителя. Альтернатива —
  предметная CTA-карточка вроде `.tr-dashboard-create` в `Dashboard.vue`,
  если предполагается крупный акцент на "создать первое".
- **`--no-results`** — записи есть, но фильтр/поиск ничего не нашёл.
  Для каталога карточек — не `.tr-async-state`, а `.tr-catalog-empty`
  внутри сетки (раздел 3); для `b-table` — пустая строка (штатное поведение
  Buefy, ничего доп. не рисовать); во всех остальных списках (например,
  список диалогов в `Conversations.vue`) — `.tr-async-state--no-results`.
- **`--error`** — `role="alert"` и `aria-live="assertive"` на самом блоке
  (это ответственность вызывающей страницы, не CSS); иконка красится
  токеном danger автоматически.
- **`--permission-denied`** — визуально не отличается от `--empty`/
  `--error` по умолчанию; модификатор существует для явной семантики и
  будущих CSS-хуков, а не для собственного оформления.

Третьего вида "пусто" не заводится: `.tr-section-empty`,
`.tr-knowledge__items-empty`, `.tr-conversations-list__empty` и подобные
постраничные дубликаты — упразднены в Task A3.7 в пользу `.tr-async-state`.

## 10. Общие элементы поверхности

- `.tr-card` — базовая поверхность (фон/рамка/тень/скругление/паддинг).
  Использовать для любого прямоугольного блока с контентом.
- `.tr-card--interactive` — добавлять, если карточка кликабельна/это ссылка
  (даёт hover-подъём и focus-visible рамку). Не переписывать
  `transition`/`:hover`/`:focus-visible` вручную в компоненте.
- `.tr-card__title` — заголовок внутри `.tr-card`.
- `.tr-icon-tile` — иконка-бейдж (по умолчанию с мягкой заливкой и рамкой,
  32px). `.tr-icon-tile--plain` — модификатор без заливки/рамки, круглый,
  для акцентных карточек. Размер (32/40/44/48/64px) — всегда отдельным
  классом конкретного места использования, не трогать `.tr-icon-tile`
  напрямую.
- `.tr-grid`, `.tr-grid--2`, `.tr-grid--3` — генерик-сетки для произвольных
  блоков (не для каталогов карточек — там `.tr-catalog-grid`).
- `.tr-row`, `.tr-row--between`, `.tr-stack`, `.tr-muted`, `.tr-strong`,
  `.tr-divider` — типографские/layout-утилиты, использовать вместо
  инлайновых стилей.
- Общий вид меню `b-dropdown` (`dropdown-content`, `dropdown-item`,
  `dropdown-item.is-active`, `dropdown-divider`) стилизован глобально в
  `trickster-buefy.scss` — любой `b-dropdown` выглядит одинаково без
  дополнительного класса. Точечные отличия (ширина панели, вид
  кнопки-триггера) описываются отдельным модификатор-классом на корневом
  `b-dropdown` (`tr-workspace-dropdown`, `tr-toolbar-dropdown`,
  `tr-notifications-dropdown`, `tr-user-dropdown` и т.п.), а не
  переопределением `dropdown-content` заново. `.tr-navbar-dropdown` — общий
  маркер только для панелей topbar (мобильное меню, пространство,
  уведомления, профиль): ограничивает ширину панели вьюпортом на узких
  экранах и ставится **вместе** со своим модификатором
  (`class="tr-navbar-dropdown tr-workspace-dropdown"`). На 2026-09-10
  `Navbar.vue` вместо этого использует класс-заглушку `tr-dropdown`, у
  которого нет собственного CSS-правила, — `.tr-navbar-dropdown` объявлен,
  но не подключён ни к одной из четырёх панелей navbar; см.
  `design-system.md`, «Расхождения контракта и реализации».

## 11. Чего не делать (антипаттерны — уже встречались и исправлены в ките)

- ❌ Заводить `<feature>-card`, `<feature>__grid`, `<feature>__catalog`,
  `<feature>__empty` под каждую страницу. ✅ Только `tr-entity-card`,
  `tr-catalog-grid`, `tr-catalog`, `tr-catalog-empty`.
- ❌ Копировать `transition`/`:hover`/`:focus-visible` карточки в
  `<style scoped>` каждой страницы. ✅ `.tr-card--interactive`.
- ❌ Переопределять `border-radius`/`background`/`border` иконки-бейджа
  вручную под каждую карточку. ✅ `.tr-icon-tile[--plain]` + класс размера.
- ❌ Рисовать таблицу руками (`<table>`, `div`-грид) там, где данные —
  однородные записи. ✅ `b-table`.
- ❌ Держать в SCSS классы, которых больше нет в шаблонах (мёртвый CSS).
  Перед коммитом — `grep` по имени класса в `src/`, если 0 совпадений в
  `.vue`-шаблонах — удалять.
- ❌ Разное поведение "нет данных из-за фильтра" на разных страницах
  (где-то просто текст, где-то с иконкой на всю высоту карточки). ✅ Один
  `.tr-catalog-empty` (раздел 9).
- ❌ Заводить `<feature>__empty`/`<feature>-empty` под каждую страницу
  (`tr-knowledge__items-empty`, `tr-conversations-list__empty` и подобные —
  упразднены в A3.7). ✅ Один `.tr-async-state` с одним из пяти модификаторов
  (раздел 9).
- ❌ Рисовать спиннер вручную (CSS-анимация `border-top-color`, SVG-иконка
  `bars-scale-fade` и подобное). ✅ `Loader` — единственный индикатор "нет
  контента"; загрузка поверх контента — `b-loading`.
- ❌ `b-select` для пилюли-фильтра в `tr-page-toolbar`. ✅ `ToolbarDropdown`
  (раздел 5); `b-select` остаётся только внутри `MobileFilters`.
- ❌ Свой набор `dropdown-content`/`dropdown-item`/`dropdown-divider`-стилей
  под каждый новый `b-dropdown`. ✅ Глобальный вид уже общий (раздел 10) —
  добавлять нужен только модификатор-класс на конкретный экземпляр для его
  ширины/триггера.
- ❌ Класс-заглушка вида `-is-*` (`btn-is-primary`, `card-is-active` и
  подобное) вместо настоящего Bulma/Buefy-модификатора. ✅ Штатные `is-*`
  модификаторы Bulma/Buefy как есть (`is-primary`, `is-danger`, `is-active`),
  без обёртывающего дефиса.
- ❌ Классы Tailwind (`flex`, `gap-4`, `text-sm`, `rounded-lg` и т.п.) в
  разметке — параллельного Tailwind-entrypoint в ките нет (см.
  `design-system.md`, «Единственный entrypoint»). ✅ `tr-*`-контракт и
  штатные Bulma/Buefy-классы, уже настроенные в `trickster-buefy.scss`.
- ❌ Ручная Bulma-разметка там, где есть штатный Buefy-компонент (`.tabs`
  руками, `.modal`/`.dropdown-content`/`.pagination` без `b-*`-обёртки).
  ✅ Соответствующий `b-*`-компонент — таблица «Собственный компонент или
  Buefy» в `design-system.md`.
- ❌ Неверный `__`: BEM-элемент одного блока, который на деле рендерится
  шаблоном другого компонента (пример — старое `tr-conversations__chat`
  внутри одиночного диалога, а не списка). ✅ Разделять класс по фактической
  принадлежности шаблону — правило R1, раздел 6 (`tr-conversations-*` для
  списка, `tr-conversation-*` для виджета одного диалога).

## 12. Карта соответствия иконок «набор кабинета → MDI»

Источник: аудит `src/assets/icons/**` кабинета (114 файлов) в `.todo`
(Task A1.4), реестр кастомных иконок — в `design-system.md` (раздел
«Иконки»). Здесь — только та часть набора, что уходит на MDI: 18 служебных
UI-иконок, 2 типа коллекций и 2 состояния робота, у которых MDI-имя не
совпадает буквально с MDI-семейством `robot-*`, но перечислены для полноты
карты. Остальные имена семьи роботов (`robot`, `robot-angry`, `robot-confused`,
`robot-excited`, `robot-happy`, `robot-off`) в кабинете не используются и в
карту не входят.

Каждое MDI-имя проверено на существование в установленном `@mdi/font`
(`node_modules/@mdi/font/css/materialdesignicons.css`) на момент составления
карты (2026-09-10).

| Имя в наборе кабинета | MDI-имя | Обоснование выбора |
|---|---|---|
| `chevron-left` | `chevron-left` | Прямое совпадение |
| `chevron-right` | `chevron-right` | Прямое совпадение |
| `close` | `close` | Прямое совпадение; заодно чинит дефект — `close.svg` в наборе кабинета физически отсутствует, хотя `<icon name="close">` используется в разметке (`Members.vue` и другие), поэтому сейчас рендерится placeholder |
| `copy` | `content-copy` | Стандартное MDI-имя действия «копировать» |
| `delete` | `delete` | Прямое совпадение по смыслу и форме (не `delete-outline`, чтобы визуальный вес совпадал с остальными перенесёнными иконками) |
| `down` | `chevron-down` | `down` — не MDI-конвенция; `chevron-down` — стандартное имя для раскрывающегося индикатора |
| `edit` | `pencil` | В MDI действие «редактировать» называется `pencil`, а не `edit` |
| `eye` | `eye` | Прямое совпадение |
| `eye-slash` | `eye-off` | В MDI используется `eye-off`, не `eye-slash` (Font Awesome / Material Symbols конвенция) |
| `more-vert` | `dots-vertical` | В MDI используется `dots-vertical`, не `more-vert` (Material Symbols конвенция) |
| `person` | `account` | В MDI используется `account`; `user.svg` в наборе кабинета не используется нигде и в карту не входит |
| `resend` | `email-sync-outline` | Единственное применение — повторная отправка приглашения участника (`Members.vue`, `inviteResend`); `email-sync-outline` точнее передаёт «переслать письмо ещё раз», чем нейтральный `refresh` |
| `upload` | `upload` | Прямое совпадение |
| `workspace` | `briefcase` | В MDI нет иконки `workspace`; `briefcase` — принятая MDI-метафора рабочего пространства |
| `chats` | `forum` | В MDI нет иконки `chats`; `forum` — принятая MDI-метафора списка диалогов |
| `dark-mode` | `weather-night` | В MDI переключатель тёмной темы называется `weather-night`, не `dark-mode` (Material Symbols конвенция) |
| `light-mode` | `weather-sunny` | В MDI переключатель светлой темы называется `weather-sunny`, не `light-mode` (Material Symbols конвенция) |
| `star-smile` | `star-face` | Ближайшее по смыслу MDI-имя для «оценки с улыбкой» |
| `collection-links` | `link-variant` | Тип коллекции знаний «ссылки»; прямой MDI-эквивалент есть, кастомная иконка избыточна |
| `collection-storage` | `database` | Тип коллекции знаний «хранилище»; прямой MDI-эквивалент есть, кастомная иконка избыточна |
| `robot-love` | `robot-love` | Состояние агента; MDI содержит всю семью эмоций робота под теми же именами |
| `robot-dead` | `robot-dead` | Состояние агента; MDI содержит всю семью эмоций робота под теми же именами |

Не входят ни в реестр кастомных иконок, ни в эту карту — решены иначе:

- `checkbox-checked`, `checkbox-partial`, `checkbox-unchecked` — это
  состояния контрола, а не иконки; переходят на `b-checkbox` (с
  `indeterminate` для промежуточного состояния) в Stage A3, а не копируются
  в кит как SVG.
- `bars-scale-fade` — инлайновый спиннер, вставленный вручную 30 раз в 29
  компонентах кабинета; поглощается единым компонентом `Loader`
  (Task A1.7) и в кит как отдельная SVG-иконка не переносится.
- Пять брендовых иконок каналов связи (`channels/instagram`,
  `channels/messenger`, `channels/telegram`, `channels/web`,
  `channels/whatsapp`) — не используются: `ChannelCard.vue` рендерит канал
  через `b-icon` (MDI), а не через `<icon>`. В кит не переносятся, пока это
  не изменится.
- Остальные 58 файлов набора не используются нигде в разметке кабинета
  (`<icon name="…">` ни статически, ни динамически) и в кит не переносятся:
  `account`, `admin`, `agents`, `agents-empty`, `audio`, `chat-bubble`,
  `chat-unread`, `cloud-upload`, `credit-card`, `docs`, `draft`, `gear`,
  `group`, `image`, `invite`, `knowledge`, `language`, `library`,
  `library-add`, `library-books`, `link`, `lock`, `login`, `logout`,
  `members`, `menu`, `menu-open`, `monitoring`, `moon`, `more-horiz`,
  `new-tab`, `playground`, `plug`, `plus`, `premium`, `radio-checked`,
  `radio-partial`, `radio-unchecked`, `reset`, `return`, `robot`,
  `robot-angry`, `robot-confused`, `robot-excited`, `robot-happy`,
  `robot-off`, `robot-pig`, `script-text`, `send`, `settings`, `shield-moon`,
  `shield-sun`, `sun`, `text`, `translate`, `user`, `video`, `workspaces`.

Итог по решению для всех 114 физических файлов набора кабинета: 26 — в
реестр кастомных иконок кита; 22 имени уходят на MDI по карте выше (18
UI-имён + 2 типа коллекций + 2 состояния робота), из них у одного
(`close`) физического файла в наборе нет — используется в разметке, но
рендерится placeholder, поэтому реально файлов среди перенесённых на MDI
21, а не 22; 3 — на `b-checkbox`; 1 (`bars-scale-fade`) — в `Loader`; 63 —
не переносятся никуда (58 неиспользуемых прочих плюс 5 неиспользуемых
брендовых иконок каналов). `26 + 21 + 3 + 1 + 63 = 114`.

## 13. Реестр алиасов миграции

Каждый класс кабинета, переименованный в ките ради контракта A3 (нейминг,
BEM-принадлежность и т. п.), получает временный `@deprecated`-алиас в секции
«15. Deprecated aliases» `trickster-buefy.scss` — старый селектор продолжает
работать, пока переносящий кабинет не перейдёт на новое имя. Алиас
удаляется в Stage B4, когда `get.3xtr.im` подтверждённо мигрировал на новое
имя по всем маршрутам.

| Старый класс/компонент | Новый класс/компонент | Добавлен | Удаляется |
|---|---|---|---|
| `ToolbarTabs` (компонент) | `NavbarTabs` | A3.3 | B4 |
| `.tr-toolbar-tabs` | `.tr-navbar-tabs` | A3.3 | B4 |
| `.tr-toolbar-tabs__link` | `.tr-navbar-tabs__link` | A3.3 | B4 |
| `.tr-toolbar-tabs__link--icon` | `.tr-navbar-tabs__link--icon` | A3.3 | B4 |
| `.tr-toolbar-tabs__icon` | `.tr-navbar-tabs__icon` | A3.3 | B4 |
| `SearchField` (компонент) | `ToolbarSearch` | A3.3 | B4 |
| `.tr-topbar__search` | `.tr-search-field--navbar` | A3.3 | B4 |
| `Integrations` (компонент/маршрут `/integrations`) | `Channels` (маршрут `/channels`) | A3.3 | B4 |
| `WorkspacePlan` (компонент) | `WorkspacePlans` | A3.3 | B4 |
| `Settings.vue` (workspace-settings) | `WorkspaceSettings.vue` | A3.3 | — (имя файла, не класс — алиас не требуется) |
| `.tr-catalog__grid` | `.tr-catalog-grid` | A3.3 | B4 |
| `.tr-catalog__empty` | `.tr-catalog-empty` | A3.3 | B4 |
| `.tr-conversations__panel` | `.tr-conversation-panel` | A3.3 | B4 |
| `.tr-conversations__list` | `.tr-conversations-list` | A3.3 | B4 |
| `.tr-conversations__chat` | `.tr-conversation-chat` | A3.3 | B4 |
| `.tr-conversations__properties` | `.tr-conversation-properties` | A3.3 | B4 |
| `.tr-conversations__placeholder` | `.tr-conversations-placeholder` | A3.3 | B4 |
| `.tr-conversations__header` | `.tr-conversation-header` | A3.3 | B4 |
| `.tr-conversations__title` | `.tr-conversation-title` | A3.3 | B4 |
| `.tr-conversations__items` | `.tr-conversations-list__items` | A3.3 | B4 |
| `.tr-conversations__empty` | `.tr-async-state` (`--no-results`) | A3.3, superseded A3.7 | B4 |
| `.tr-conversations__identity` | `.tr-conversation-identity` | A3.3 | B4 |
| `.tr-conversations__messages` | `.tr-conversation-messages` | A3.3 | B4 |
| `.tr-conversations__composer` | `.tr-conversation-composer` | A3.3 | B4 |
| `.tr-conversations__composer-input` | `.tr-conversation-composer-input` | A3.3 | B4 |
| `.tr-conversations__properties-body` | `.tr-conversation-properties-body` | A3.3 | B4 |
| `.tr-conversations__profile` | `.tr-conversation-profile` | A3.3 | B4 |
| `.tr-conversations__profile-image` | `.tr-conversation-profile-image` | A3.3 | B4 |
| `.tr-conversations__details` | `.tr-conversation-details` | A3.3 | B4 |
| `.tr-conversations__list-action` | `.tr-conversation-list-action` | A3.3 | B4 |
| `.tr-conversations__settings-action` | `.tr-conversation-settings-action` | A3.3 | B4 |
| `.tr-conversations__properties-action` | `.tr-conversation-properties-action` | A3.3 | B4 |
| `.tr-conversations__properties-close` | `.tr-conversation-properties-close` | A3.3 | B4 |
| `.tr-conversations__icon-action` | `.tr-conversation-icon-action` | A3.3 | B4 |

Каждая строка выше соответствует `@deprecated`-записи в секции «15.
Deprecated aliases» `trickster-buefy.scss`, кроме переименования файла
`Settings.vue` → `WorkspaceSettings.vue` (имя `.vue`-файла не является CSS-
селектором и не нуждается в переходном алиасе; сам маршрут `workspace-settings`
не менялся). Маршрут `/integrations` сохранён как `redirect` на `/channels`
в `src/router.js` — это функциональный эквивалент CSS-алиаса для ссылок,
ведущих на старый URL.

## 14. Формы

Эталон композиции — `.tr-form` из `design-system.md` (раздел «Формы»);
конкретные поля в ките сегодня живут внутри модалок создания записи
(`Agents.vue`, `Knowledge.vue`), а не на отдельной full-page форме — оба места
показывают один и тот же паттерн `b-field` + штатный control, без ручного
`<input>`/`<select>`.

```html
<form class="modal-card" @submit.prevent="createAgent">
  <header class="modal-card-head">
    <p class="modal-card-title">Новый агент</p>
    <button class="delete" type="button" aria-label="Закрыть" @click="..." />
  </header>

  <section class="modal-card-body">
    <b-field label="Название">
      <b-input v-model="newAgentName" placeholder="Например, Консультант" required />
    </b-field>
  </section>

  <footer class="modal-card-foot">
    <b-button @click="...">Отмена</b-button>
    <b-button native-type="submit" type="is-primary">Создать</b-button>
  </footer>
</form>
```

Правила:

- Каждое поле — `b-field label="..."` вокруг `b-input`/`b-select`/
  `b-checkbox`/`b-switch`; ошибка — `type="is-danger"` и `message` на
  `b-field`, не отдельный `<span>` под контролом.
- Секретное поле — `b-input type="password" password-reveal`, свой
  toggle-глаз не рисуется.
- Полноразмерная форма (не в модалке) использует `.tr-form` только как
  layout-обёртку (`display: flex; flex-direction: column`) вокруг набора
  `b-field` и `.tr-form__footer` для submit/cancel; опасные действия
  выносятся в `.tr-destructive-zone` с `.tr-destructive-zone__title`.
  На 2026-09-10 в ките нет отдельного маршрута с такой полноразмерной формой
  (панели настроек кита — `tr-settings__panel`, раздел 8, а не форма), и эти
  три класса пока без потребителя в `src/components/**` — известный разрыв,
  см. `design-system.md`, «Расхождения контракта и реализации».
- Форма не эмулирует контролы иконками (чекбокс/радио — только
  `b-checkbox`/`b-radio`, включая `indeterminate` для промежуточного
  состояния).

## 15. Пагинация

Эталон — раздел «Пагинация» в `UiKit.vue`.

```html
<div class="tr-row tr-row--between mb-4">
  <h2 class="tr-card__title mb-0">Заголовок списка</h2>
  <span class="tr-muted">Страница {{ page }} из {{ totalPages }}</span>
</div>
<b-pagination
  v-model="page"
  :total="total"
  :per-page="perPage"
  order="is-centered"
/>
```

Правила:

- Единственный способ постранично листать список вне `b-table` — `b-pagination`.
  Внутри `b-table` пагинация — атрибуты `paginated`/`per-page` того же
  компонента (раздел 4), отдельный `b-pagination` рядом с таблицей не
  добавляется.
- Собственная реализация («предыдущая/следующая» кнопки на `b-button`, ручной
  счётчик страниц) не заводится нигде. `PaginationControls` существует только
  в потребляющем приложении (`get.3xtr.im`) и в кит окончательно не
  переносится — по решению `.plan` (Stage A4) его заменяет `b-pagination`
  везде, включая случаи, которые сейчас закрывает `PaginationControls`.

## 16. Оверлеи

Эталон — разделы «Диалог подтверждения», «Боковая панель» и последняя модалка
в `UiKit.vue`; рабочие модалки создания — `Agents.vue`, `Knowledge.vue`.

```html
<!-- Модальное окно -->
<b-modal v-model="isModalOpen" has-modal-card trap-focus :destroy-on-hide="false">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">...</p>
      <button class="delete" aria-label="Закрыть" @click="isModalOpen = false" />
    </header>
    <section class="modal-card-body">...</section>
    <footer class="modal-card-foot">
      <b-button @click="isModalOpen = false">Отмена</b-button>
      <b-button type="is-primary" @click="isModalOpen = false">Создать</b-button>
    </footer>
  </div>
</b-modal>
```

```js
// Подтверждение — программный вызов, не самодельная разметка
import { useDialog } from "buefy";
const dialog = useDialog();
dialog.confirm({
  title: "Удалить агента?",
  message: "Действие необратимо.",
  confirmText: "Удалить",
  type: "is-danger",
  onConfirm: () => { /* ... */ },
});
```

```html
<!-- Боковая панель -->
<b-sidebar v-model="isSidebarOpen" type="is-light" right overlay>
  <div style="padding: 24px">...</div>
</b-sidebar>
```

```js
// Тост — программный вызов
import { useToast } from "buefy";
const toast = useToast();
toast.open({ message: "Сохранено", type: "is-success" });
```

Правила:

- Обычная модалка — `b-modal`; подтверждение опасного действия — `b-dialog`
  (программно через `useDialog()`), не «модалка с текстом вместо формы»;
  боковая панель — `b-sidebar`; уведомление — `b-toast`/`useToast()`. Третьего
  способа показать overlay в ките нет.
  - Escape, backdrop-клик и возврат фокуса — штатное поведение Buefy,
  переопределять их в компоненте не нужно и не следует.
- Разметка модалки — `modal-card`/`modal-card-head`/`modal-card-title`/
  `modal-card-body`/`modal-card-foot` (классы самой Buefy/Bulma), кастомных
  `tr-modal__*`-классов нет.
- Баннер (не всплывающий, встроенный в страницу) — `b-message`, это не
  overlay и в данный раздел не входит (см. пример в `UiKit.vue`, «Баннер и
  тост»).

## 16a. Загрузка файлов

Task A4.6. Эталон — секция «Загрузка файлов» в `UiKit.vue`.
`src/modules/uploader/components/{FileUpload,FileList,FileListItem}.vue` в ЛК
переносятся как **шаблон разметки поверх `b-upload`**, а не переносятся один в
один: `b-upload` (`drag-drop`, `expanded`) закрывает дропзону, `b-progress` —
прогресс по каждому файлу, `b-message` (`is-success`/`is-danger`) — итог
успеха/ошибки. Кастомные `.file-upload*`/`.file-list*` классы и их
`<style scoped>` в кит не переносятся.

```html
<b-upload v-model="pickedFile" drag-drop expanded>
  <div class="has-text-centered">
    <p><b-icon icon="upload" size="is-medium" /></p>
    <p>Перетащите файл сюда или нажмите для выбора</p>
  </div>
</b-upload>

<b-progress :value="item.progress" size="is-small" show-value />
<b-message type="is-success" :closable="false">Файл загружен успешно.</b-message>
<b-message type="is-danger" :closable="false">Ошибка загрузки файла.</b-message>
```

Реальная загрузка (подготовка `upload_url`, `axios.put` с `onUploadProgress`,
`collectionObjectCreate`/`Update`/`Delete`) остаётся в ЛК как есть — кит
демонстрирует только очередь/прогресс/успех/ошибку без сети, локальной
fixture-state machine (см. `docs/design-system.md`, «Демо-поток загрузки
файлов»), и не задаёт форму сетевого протокола.

## 17. Порядок работы над одной страницей ЛК

1. Определить тип страницы по чек-листу (раздел 2).
2. Открыть в `trickster-ui-kit` эталонный компонент с тем же типом и
   скопировать структуру/имена классов поэлементно (разделы 3–9, 15–17).
3. Перенести только разметку и классы; данные, стор, бизнес-логику ЛК —
   оставить как есть, адаптировать по месту.
4. Убрать из `<style scoped>` страницы всё, что теперь покрывается
   глобальными классами из `trickster-buefy.scss` — не оставлять дублей.
5. Прогнать `grep` по старым/удалённым классам страницы — убедиться, что
   ничего не осталось ни в шаблоне, ни в стилях.
6. Собрать проект и визуально сверить получившуюся страницу с аналогичной
   страницей `trickster-ui-kit` (те же отступы, радиусы, hover-эффекты).
