# Инструкция: перенос дизайн-системы Trickster UI Kit в личный кабинет

Ссылки B1–B4 в этом документе — исторические идентификаторы внешних задач
кабинета, исключённых из локальных этапов UI Kit:
[B1 — #24](https://github.com/iam3xtr/get.3xtr.im/issues/24),
[B2 — #25](https://github.com/iam3xtr/get.3xtr.im/issues/25),
[B3 — #26](https://github.com/iam3xtr/get.3xtr.im/issues/26),
[B4 — #27](https://github.com/iam3xtr/get.3xtr.im/issues/27).
Полные постановки и зависимости перенесены в эти Issues.

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
   контента). Живые примеры каждого пункта — в справочнике `components/kit/**`
   (`/kit` и его подразделы, Task A8.6; ранее единый `UiKit.vue`).
4. Эталонные файлы для сверки (в этом репозитории):
   `Agents.vue`, `Knowledge.vue`, `channels/ChannelsView.vue`,
   `Conversations.vue` + `conversations/{ConversationDetail,History,
   ConversationHeader,MessageDeliveryStatus,Settings}.vue`, `Dashboard.vue`,
   `WorkspaceSettings.vue`, `kit/KitShell.vue` (+ его пять подразделов
   `kit/{Overview,Forms,Tables,NavigationStates,DialogsOverlays}.vue`),
   `NotFound.vue`.
   Перед правкой любой страницы ЛК — открыть страницу отсюда с максимально
   похожей структурой и переносить разметку поэлементно. `components/kit/**`
   смонтирован на `/kit` и его подразделах (`/kit/overview`, `/kit/forms`,
   `/kit/tables`, `/kit/navigation-states`, `/kit/dialogs-overlays`, Task
   A8.6) и в ките служит справочником
   контрактов дизайн-системы, а не набором Buefy-демо — соответствующая
   страница ЛК должна переноситься с той же ролью, а не как отдельная
   демо-страница. Плитки `Dashboard.vue` (Task A5.3) — актуальный набор:
   «Диалоги»/«Агенты»/«Знания»/«Пространство»/«Тариф»/«Профиль»; плитки
   «Интеграции» (вела на удалённый в Stage A5 отдельный маршрут каналов)
   в текущем составе нет — плитка «Профиль» ведёт на `profile` и берёт
   данные из общего профильного стора, а не из per-workspace фикстур.

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

Эталон: `Agents.vue`, `Knowledge.vue`, `channels/ChannelsView.vue` — визуально
и структурно это один и тот же паттерн, только с разными данными.

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
  `channels/ChannelCard.vue`) — брать только `tr-card tr-card--interactive
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
таблица в `kit/Tables.vue`.

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
  раздел «Таблица» в `kit/Tables.vue`. Новый визуальный вариант таблицы — это один
  из этих модификаторов или ещё один такой же, а не новый компонент.
- Статус — всегда через `b-tag` с тем же тернарным паттерном
  `:type="row.<field> === '<активное значение>' ? 'is-primary' : undefined"`,
  как во всех остальных местах кита (Agents/Conversations/Dashboard/kit/Tables.vue).
- Действия над строкой — через `b-dropdown` в последней колонке с
  фиксированной шириной, как в `kit/Tables.vue`, а не через набор отдельных
  кнопок в ряд.
- Таблица оборачивается в `.tr-card`, заголовок — `.tr-card__title` внутри
  `.tr-row.tr-row--between`, как в примере. Не изобретать свой заголовок
  таблицы.
- Если для записи по-настоящему нужна более богатая строка, чем ячейки
  таблицы (например, крупная превью-иконка файла) — расширять именно
  колонки `b-table` (кастомный `v-slot` в `b-table-column`), а не заводить
  параллельный `div`-паттерн строки.

## 5. Toolbar (поиск + фильтры над списком)

Эталон: шапка `Agents.vue` / `Knowledge.vue` / `channels/ChannelsView.vue` /
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

Эталон исторический (и всё ещё актуальный для ЛК до его портирования):
единый `Conversations.vue` со внутренним `viewMode` ("список + чат +
свойства" в одном компоненте, `is-${viewMode}-view`/`is-properties-open` на
корневом `tr-conversations`). Task A5.7 временно развела список и деталь
диалога по полностью независимым маршрутам (детальный экран не делил грид
со списком вообще); **Task A8.4 вернула их на один персистентный грид**, но
уже маршрутный, а не через внутренний `viewMode` — картина ниже описывает
текущее устройство кита.

**Устройство кита после Task A8.4** — список и деталь диалога снова на
одном гриде, но каждый со своим маршрутом:

- `Conversations.vue` (`/conversations`, `/conversations/:agentId`) —
  владеет корневым `tr-conversations tr-conversation-split` и списком
  (`tr-conversation-panel tr-conversations-list`); открытие диалога — переход
  на вложенный маршрут `conversation` (см. `router.js`: он вложен под
  `conversations-agent`, а не под отдельный верхнеуровневый путь), который
  рендерится через собственный `<RouterView>` этого же компонента, рядом со
  списком — а не полноэкранной заменой. Список подсвечивает открытый диалог
  классом `is-active` (`route.params.conversationId === conversation.id`).
  Этот же компонент владеет и панелью настроек как третьей колонкой того же
  грида: `propertiesOpen`/`openProperties`/`closeProperties` из `provide`/
  `conversationPropertiesKey` (`src/composables/conversationProperties.js`)
  — `ConversationDetail.vue`'s кнопка-шестерёнка их читает/вызывает, не владея
  состоянием сама. `is-properties-open` на корневом `tr-conversations`
  разворачивает грид до 3 колонок (список/чат/настройки) — открыта по
  умолчанию (`propertiesOpen` стартует `true`, как и в песочнице агента, см.
  раздел 6) и возвращается к `true` при каждой смене выбранного диалога
  (`watch` на `route.params.conversationId`), чтобы следующий открытый
  диалог всегда начинался с видимой панели настроек, независимо от того,
  что было у предыдущего. Ниже `1024px` `tr-conversation-split` вместо
  этого показывает одну колонку за раз через
  `is-list-view`/`is-chat-view`/`is-properties-view` — тем же приёмом,
  который у ЛК ниже описан как всё ещё живой на синхронной таблице стилей,
  только без маршрута `/settings` (см. следующий пункт). Какой вид активен,
  включая на узких экранах, решает сам URL — `mobileView` здесь просто
  `computed`, читающий `hasSelectedConversation`, а не отдельное
  provide/inject-состояние: кнопка "назад" в шапке диалога — обычный
  `router-link` на `{ name: "conversations" }`, клик по ней реально уходит
  на `/conversations/` и снимает выбор диалога (этот фикс убрал прежний
  `conversationMobileViewKey`/`showList()`/`src/composables/conversationMobileView.js`,
  которые только скрывали панели CSS-правилом, оставляя диалог смонтированным
  и выбранным под ними).
- `components/conversations/ConversationDetail.vue` (маршрут `conversation`)
  — route-driven shell по паттерну `AgentDetail.vue`/`CollectionDetail.vue`
  (раздел 3): резолвит диалог по `:agentId/:conversationId`, рендерит ДВА
  корневых узла (fragment-шаблон), оба — прямые дети грида `Conversations.vue`
  через её `<RouterView>`: `<section class="tr-conversation-panel
  tr-conversation-chat">` (виджет "один диалог": шапка с аватаром/именем,
  `ConversationHeader`'s channel/status-тегами, кнопкой "назад"
  (`tr-conversation-list-action`, видна только ниже `1024px`) слева и
  кнопкой-шестерёнкой (`tr-conversation-settings-action`, `cog-outline`,
  `v-if="!propertiesOpen"` — рендерится только пока панель закрыта) справа,
  плюс `History.vue` в `tr-conversation-detail-body`) и `<aside
  class="tr-conversation-panel tr-conversation-properties" v-if="isReady &&
  propertiesOpen">` (своя шапка со стрелкой "назад к диалогу"
  (`tr-conversation-properties-action`) — без крестика, закрывать в
  открытом-по-умолчанию виде нечего, только переключиться на историю — +
  `Settings.vue` в `tr-conversation-properties-body`). Настроек нет ни
  отдельного маршрута, ни вкладки `NavbarTabs`/меню в навбаре — стрелка
  дергает `closeProperties()`, шестерёнка — `openProperties()`, обе из
  `conversationPropertiesKey`.
- `components/conversations/History.vue` (тело чат-панели) — не несёт
  собственную шапку/грид (они в `ConversationDetail.vue` выше): рендерит
  только фрагмент `tr-conversation-messages` +
  `tr-conversation-composer`/`-composer-input`. Статус доставки исходящих
  сообщений — `components/conversations/MessageDeliveryStatus.vue`
  (`tr-message-delivery`); канал/статус диалога под именем — отдельный
  `components/conversations/ConversationHeader.vue`
  (`tr-conversation-channel-context`), рендерится из `ConversationDetail.vue`.
- `components/conversations/Settings.vue` (тело `<aside>`-панели, включаемой
  шестерёнкой в шапке — не отдельный маршрут) — плоский `.tr-form` (как поля
  `AgentSettings.vue`, но без обёртки `.tr-settings__panel` — тот же
  бордер/тень уже даёт сама `.tr-conversation-properties`, вложенная
  `.tr-settings__panel` внутри нее дублировала рамку), обёрнут в
  `tr-conversation-settings` (ограничивает ширину панели внутри узкой
  колонки `tr-conversation-properties`).

Ключевые классы, всё ещё общие для обоих устройств (кита и ЛК):

- **`tr-conversations-*`** (множественное число) — то, что принадлежит
  только странице-списку: `tr-conversations-list` (панель списка),
  `tr-conversations-list__items`, `tr-conversations-placeholder` (заглушка
  "выберите диалог", видна только когда ничего не выбрано). Состояние
  "поиск/фильтр ничего не нашёл" внутри списка — не отдельный класс, а
  `.tr-async-state.tr-async-state--no-results`, см. раздел 9.
- **`tr-conversation-*`** (единственное число) — переиспользуемый виджет
  "один диалог": `tr-conversation-panel`, `tr-conversation-chat`,
  `tr-conversation-header`, `tr-conversation-title`,
  `tr-conversation-identity`, `tr-conversation-messages`,
  `tr-conversation-composer`, `tr-conversation-composer-input`,
  `tr-conversation-details`, `tr-conversation-detail-body`; кнопка "назад к
  списку" — `tr-conversation-icon-action` + `tr-conversation-list-action`.
  Панель настроек сбоку от чата — `tr-conversation-properties`,
  `tr-conversation-properties-body`; её шестерёнка-триггер в шапке чата —
  `tr-conversation-icon-action` + `tr-conversation-settings-action`,
  `v-if="!propertiesOpen"` (не `is-active` — раз она рендерится только пока
  панель закрыта, то всегда неактивна, пока видна); её собственная шапка
  несёт только стрелку влево — `tr-conversation-icon-action` +
  `tr-conversation-properties-action` ("назад к диалогу"/"к песочнице",
  видна только ниже `1024px`/`768px`, где грид схлопывается в одну колонку
  за раз — на более широких панель не закрывается вообще). И диалог, и
  песочница (`agents/AgentPlayground.vue`, раздел 6 ниже) используют ровно
  эти классы и это поведение — `propertiesOpen` стартует `true` в обоих.
  `tr-conversation-properties-close` (`×`) в ките не рендерится нигде — ни
  `Settings.vue`, ни песочница не дают панели закрываться на широких экранах
  — и остаётся в `trickster-buefy.scss` только для ЛК (см. класс ниже).
  `tr-conversation-profile`/`tr-conversation-profile-image` (аватар-блок
  внутри панели) в ките тоже не используются — и остаются как цель
  `@extend` для алиасов раздела 13: ЛК ещё не портирован с этих BEM-имён.

Старые `tr-conversations__*`-имена (до Task A3.3) остаются только как
`@deprecated`-алиасы — см. раздел 13.

**Downstream sync (важно для Task B2/B4).** Только два файла синхронизируются
в ЛК автоматически — `trickster-buefy.scss` и `_trickster-tokens.scss` (см.
CLAUDE.md "Downstream sync"); Vue-компоненты кита переносятся вручную и
отдельной задачей. С этим сообщением-фиксом кит и ЛК снова используют один и
тот же слой классов для диалогов (3-колоночный грид `tr-conversations`/
`--tr-conversation-main-column`/`is-properties-open`,
`tr-conversation-properties*`, `tr-conversation-settings-action`,
`is-${view}-view`, `tr-conversation-item.is-active`) — до этого кит держал
параллельный слой (`tr-conversation-split`, `tr-conversation-detail-body`,
`tr-conversation-channel-context`, `tr-conversation-settings`,
`tr-message-delivery`), потому что Task A5.7 временно вынесла историю/
настройки в отдельный маршрут-паттерн вместо properties-aside. Тот
кит-only слой (`tr-conversation-split` и далее) остаётся — он всё ещё нужен
для `1024px`-брейкпоинта и BEM-независимой кит-разметки — но теперь
дополняет общий слой, а не подменяет его; `tr-conversation-profile*`
остаётся единственным по-прежнему неиспользуемым в ките именем (только
`get.3xtr.im/src/modules/conversations/views/Conversation(s).vue` рендерит
профильный блок внутри панели — см. выше).

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

Эталон: раздел «Вкладки» в `kit/NavigationStates.vue`.

```html
<b-tabs v-model="activeTab" type="is-boxed">
  <b-tab-item label="...">...</b-tab-item>
</b-tabs>
```

Всегда `b-tabs`/`b-tab-item` из Buefy, не самодельные табы на `div`+`button`.
Если вкладки открывают панель настроек — контент вкладки оборачивается в
`tr-settings__panel` (см. раздел 8).

## 8. Панели настроек (список опций с переключателями)

`WorkspaceSettings.vue` был этим эталоном до Task A5.8, когда его содержимое
(демо-переключатели видимости navbar — `siteSettings.js`) заменили реальными
настройками рабочего пространства (форма переименования +
`.tr-destructive-zone`, см. раздел 14). Кит-эталон теперь —
`src/components/profile/Settings.vue` (Task A5.9, `/profile`): панель
переключателей уведомлений над `stores/profile.js`'s
`notificationPreferences`. Каждый `b-switch` там применяется сразу
(`toggleNotificationPreference`), без отдельного сохранения, поэтому у
панели нет футера с кнопкой — класс `.tr-settings__panel-footer` не нашёл
потребителя за Stage A5 и был удалён из `trickster-buefy.scss` задачей
A5.11. Если где-то переключатели должны сохраняться одной транзакцией,
footer-ряд с кнопкой собирается на уже существующем `.tr-form__footer`
(раздел 14), а не на отдельном классе для этой панели.

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

  <footer class="tr-form__footer">
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

Эталон полностраничного `--empty` для 404 — `NotFound.vue`: смонтирован на
`/404` и как цель catch-all маршрута (не редирект на dashboard), даёт
`RouterLink` назад вместо тупика.

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
| `Integrations` (компонент/маршрут `/integrations`) | `channels/ChannelsView.vue` (маршрут `/agents/:id/channels`, вложен в `agent`-shell, Task A5.5) | A3.3 | B4 |
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
не менялся) и переноса `Integrations`/`Channels` — там нет CSS-переименования,
только смена маршрута и разбор экрана на компоненты (см. таблицу выше):
`/integrations` в ките больше не существует ни как маршрут, ни как
`redirect` — каналы открываются только по `/agents/:id/channels`, в контексте
конкретного агента.

## 14. Формы

Эталон композиции — `.tr-form` из `design-system.md` (раздел «Формы»);
конкретные поля в ките сегодня живут внутри модалки создания записи
(`Knowledge.vue`), а не на отдельной full-page форме — тот же паттерн
`b-field` + штатный control, без ручного `<input>`/`<select>`. До Task A9.2
`Agents.vue` держало здесь такую же модалку («Новый агент», одно поле
`Название`) — она удалена: единственный вход в создание агента теперь ведёт в
route-driven мастер (`src/components/agents/AgentWizard.vue`,
`docs/design-system.md`, «Мастер создания агента: точки входа»), а не в
отдельную форму.

```html
<!-- src/components/knowledge/CollectionFormModal.vue -->
<form class="modal-card" @submit.prevent="submit">
  <header class="modal-card-head">
    <p class="modal-card-title">Новая коллекция</p>
    <button class="delete" type="button" aria-label="Закрыть" @click="..." />
  </header>

  <section class="modal-card-body">
    <b-field label="Название">
      <b-input v-model="name" required />
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
  `b-field`, не отдельный `<span>` под контролом. Исключение — auth-формы
  входа/регистрации (раздел 18): там `b-field` без `label`, имя поля только
  на `aria-label` `b-input`.
- Секретное поле — `b-input type="password" password-reveal`, свой
  toggle-глаз не рисуется.
- Полноразмерная форма (не в модалке) использует `.tr-form` только как
  layout-обёртку (`display: flex; flex-direction: column`) вокруг набора
  `b-field` и `.tr-form__footer` для submit/cancel; опасные действия
  выносятся в `.tr-destructive-zone` с `.tr-destructive-zone__title`. Эталон
  — `WorkspaceSettings.vue` (Task A5.8): `.tr-form` с полями переименования
  пространства и `.tr-destructive-zone` с удалением пространства через
  программное подтверждение `useModalStore().confirm()` (`b-dialog`, тот же
  API, что и в разделе «Диалог подтверждения» `kit/DialogsOverlays.vue`).
- Форма не эмулирует контролы иконками (чекбокс/радио — только
  `b-checkbox`/`b-radio`, включая `indeterminate` для промежуточного
  состояния).

### 14a. Выбор модели

`get.3xtr.im/src/modules/agents/components/ModelSelect.vue` — ручной
`.dropdown`, открываемый прямым `classList.toggle` по DOM-ссылке: без
клавиатурного управления, без закрытия по клику вне, без `aria-expanded`.
Кит заменяет его `src/components/agents/ModelSelect.vue` (Task A6.2) —
`b-autocomplete` с группами «Рекомендуемые»/«Все модели», иконкой провайдера
в строке результата и BYOK-ограничением до OpenRouter. При переносе в
кабинет: тот же `b-autocomplete`-контракт, пропсы `modelValue`/
`providerModelId` (оба v-model) вместо ручного `dropdown`-рефа и `onSelect`,
собственный `password-reveal` вместо `apiKeyFieldType`/иконок `eye`/
`eye-slash`. Свободный BYOK-идентификатор (`providerModelId`) в кабинете
**не сохраняется**, пока не реализован серверный контракт
[api.3xtr.im#112](https://github.com/iam3xtr/api.3xtr.im/issues/112) — кит
реализует его полностью как спецификацию (см. `design-system.md`, «Выбор
модели»).

### 14b. Ключи API и BYOK-состояние

Stage A6 fix (post-review, по решению пользователя 2026-09-11): в ките ключ
собственного провайдера (OpenRouter) больше не вводится текстом на каждом
агенте — он сохраняется один раз в профиле воркспейса
(`src/stores/apiKeys.js`, fixture-хранилище) и выбирается через
`src/components/agents/ApiKeySelect.vue` (список сохранённых ключей +
«Добавить ключ…» → `b-modal`), а не через `b-input type="password"` в
`AgentSettings.vue` напрямую. `AgentSettings.vue` теперь блокирует
сохранение, пока `useOwnApiKey` включён, а ключ или модель не выбраны
(`stores/agents.js#isByokSaveValid`) — до этого исправления форма позволяла
сохранить агента с включённым BYOK, но без ключа и без модели.

При переносе в кабинет: и хранилище сохранённых ключей воркспейса
(`agent.api_key_id`, ссылка вместо текста), и `byok_model` — предложения к
серверному контракту, а не отражение уже существующего API кабинета или
`api.3xtr.im`; необходимость соответствующих полей задокументирована на
[api.3xtr.im#112](https://github.com/iam3xtr/api.3xtr.im/issues/112). Пока
контракт не реализован, перенос этой механики в кабинет блокирован тем же
способом, что и перенос свободного BYOK-идентификатора (см. 14a выше).

## 15. Пагинация

Эталон — раздел «Пагинация» в `kit/Tables.vue`.

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

Эталон — разделы «Диалог подтверждения», «Боковая панель» и «Модальное окно»
в `kit/DialogsOverlays.vue`; рабочая модалка создания — `Knowledge.vue`
(`knowledge/CollectionFormModal.vue`). `Agents.vue` до Task A9.2 держало
такую же для создания агента — она удалена в пользу единого route-driven
мастера (см. раздел 14 выше).

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
  overlay и в данный раздел не входит (см. пример в `kit/DialogsOverlays.vue`,
  «Баннер и тост»).

## 16a. Загрузка файлов

Task A4.6. Эталон — секция «Загрузка файлов» в `kit/Forms.vue`.
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

## 18. Auth-экраны

Task A5.10. Эталон — `src/components/auth/**` (`AuthPage`, `LoginView`,
`SignupView`, `ForgotView`, `VerifyView`, `InviteView`, `GoogleButton`,
`WorkspaceSelector`) и `stores/auth.js`.

```html
<AuthPage>
  <h1 class="tr-card__title">Вход</h1>
  <form class="tr-form" novalidate @submit.prevent="submit">
    <b-notification v-if="errorMessage" type="is-danger" :closable="false">
      {{ errorMessage }}
    </b-notification>
    <b-field><b-input v-model="form.email" type="email" placeholder="Введите email" aria-label="Email" required /></b-field>
    <b-field>
      <b-input v-model="form.password" type="password" password-reveal placeholder="Введите пароль" aria-label="Пароль" required />
    </b-field>
    <b-button native-type="submit" type="is-primary" expanded :loading="isSubmitting">
      Войти
    </b-button>
  </form>
</AuthPage>
```

Классы и решения, специфичные для замены ЛК-компонентов:

- `.tr-auth`/`.tr-auth__card` заменяют мёртвые `auth-page`/
  `auth-form-container` (`get.3xtr.im/src/modules/auth/components/
  AuthPage.vue`, `<style scoped>`) — при переносе оба старых класса
  удаляются вместе со scoped-стилями, а не переименовываются на месте.
- Секретное поле — `b-input type="password" password-reveal`, как и везде
  (раздел 14); отдельного `PasswordInput.vue` кит не заводит, ЛК может
  удалить свой при портировании или оставить как внутреннюю обёртку над тем
  же `password-reveal`.
- В отличие от остальных форм кабинета (раздел 14 — `b-field label="..."`),
  `LoginView`/`SignupView` подписей полей не показывают: `b-field` без
  `label`, а имя поля для скринридеров — на `aria-label` самого `b-input`.
  Это единственное исключение из правила «каждое поле — `b-field
  label="..."`» (раздел 14), закреплённое явно, а не забытое при переносе.
- `placeholder` на полях `LoginView`/`SignupView` — инструкция, что вводить
  («Введите email», «Придумайте пароль (не короче 8 символов)»), а не
  образец значения (`demo@3xtr.im`, `Иван Петров`); при переносе не
  возвращать placeholder-примеры.
- `GoogleButton.vue` в ките — `disabled`-заглушка без сетевого запроса; при
  портировании в ЛК реальная интеграция (`accounts.google.com/gsi/client`)
  остаётся как есть — переносится только визуальный контракт кнопки
  (`.tr-auth__google`, иконка `google` через `Icon.vue`).
- `WorkspaceSelector.vue` в ките — переиспользуемый компонент, который
  `LoginView.vue` показывает сам как демонстрационный шаг после входа; в ЛК
  он остаётся общеприкладным гейтом `App.vue` по `auth.needsWorkspace` — при
  переносе классы (`.tr-workspace-picker*`) переиспользуются, но
  вызывающий код не переносится 1:1.
- `.tr-auth__divider`, `.tr-auth__footer`, `.tr-auth__legal`, `.tr-auth__link`
  — служебные классы самого `AuthPage`/форм, без прямых кабинетных аналогов.

`ForgotView`, `VerifyView` и `InviteView` в ките не делают сетевых запросов
(`stores/auth.js` — `window.setTimeout` вместо `api.*`); ЛК сохраняет свою
реальную интеграцию (`api.verificationConfirm`, `api.invitationsInspect/
Accept/Report`) — переносится только разметка состояний
(`idle`/`submitting`/`success`/`invalid`/…) и связанные классы.

## 19. Мастер создания агента (Stage A9) — что переносить, что нет

Эталон — `src/components/agents/AgentWizard.vue` + `agents/wizard/**` +
`stores/wizard.js`; полный контракт шагов — `design-system.md`, раздел
«Мастер создания агента: contract и границы downstream (Task A9.9)» (там же
таблица issue-соответствий). Здесь — только то, что специфично для переноса.

- Переносится 1:1 как UI: route-driven controller и все семь шагов, S2-
  презентационная проекция (`getAgentLifecycle`/`getAgentStatusProjection`/
  `getChannelConnectionState` — те же имена и та же семантика, что и в ките),
  fixture-профили тарифов/классов моделей как визуальный образец (не как
  готовые данные), T2 (BotFather + токен) как единственный интерактивный
  Telegram-путь, RU/EN/ES-ключи `src/locales/wizard/**`.
- **Не переносится как есть** — требует своего серверного контракта в ЛК
  до включения реального поведения:
  - draft persistence между reload/устройствами и идемпотентность
    материализации агента — [api.3xtr.im#17](https://github.com/iam3xtr/api.3xtr.im/issues/17);
  - согласованная тарифная матрица и effective capabilities вместо
    kit-fixture-профилей — [api.3xtr.im#114](https://github.com/iam3xtr/api.3xtr.im/issues/114)
    (BYOK `provider_model_id` отдельно, см. раздел 14a/14b — [#112](https://github.com/iam3xtr/api.3xtr.im/issues/112));
  - серверные readiness/reasons и retry-safe launch для S2 —
    [api.3xtr.im#115](https://github.com/iam3xtr/api.3xtr.im/issues/115);
  - CRUD знаний/индексация вместо fixture-таймера в `KnowledgeStep.vue` —
    [api.3xtr.im#116](https://github.com/iam3xtr/api.3xtr.im/issues/116);
  - протокол привязки wizardId/workspaceId к managed-bot creation (T1
    QR/deep-link) — [api.3xtr.im#117](https://github.com/iam3xtr/api.3xtr.im/issues/117);
  - synthetic relay test для «Песочницы» вместо локального транскрипта —
    [api.3xtr.im#87](https://github.com/iam3xtr/api.3xtr.im/issues/87);
  - revision/If-Match + CAS для конфликта сохранения (в ките не
    воспроизводится — single-tab in-memory state) —
    [api.3xtr.im#118](https://github.com/iam3xtr/api.3xtr.im/issues/118).
- До реализации соответствующего issue перенос T1 остаётся неинтерактивным
  макетом (тот же приём, что и `GoogleButton.vue`, раздел 18) — включение
  реального QR/deep-link без подтверждённого протокола создаёт риск показать
  «подключено» для чужого бота (`.plan` Stage A9, «Риски»).
