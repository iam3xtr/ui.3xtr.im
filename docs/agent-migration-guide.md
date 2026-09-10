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
3. Эталонные файлы для сверки (в этом репозитории):
   `Agents.vue`, `Knowledge.vue`, `Integrations.vue`, `Conversations.vue`,
   `Dashboard.vue`, `Settings.vue`, `UiKit.vue`. Перед правкой любой страницы
   ЛК — открыть страницу отсюда с максимально похожей структурой и
   переносить разметку поэлементно.

## 1. Главный принцип

**Одинаковый визуальный контейнер = одинаковое имя класса.**
Если на двух страницах ЛК есть, например, сетка карточек — это не
"agents-grid" и "knowledge-grid", это один `.tr-catalog__grid` в обоих
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
- Пустое состояние (нет данных) → **раздел 9**.

## 3. Каталоги карточек

Эталон: `Agents.vue`, `Knowledge.vue`, `Integrations.vue` — визуально и
структурно это один и тот же паттерн, только с разными данными.

```html
<section class="tr-workbench-page">
  <header class="tr-workbench-page__header tr-page-toolbar">
    <!-- см. раздел 5 -->
  </header>

  <section class="tr-catalog" aria-label="...">
    <div class="tr-catalog__grid">
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

      <p v-if="isEmptyByFilter" class="tr-catalog__empty">
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
  `Integrations.vue`) — брать только `tr-card tr-card--interactive
  tr-entity-card`, без `--interactive`.
- Иконка карточки — всегда `tr-icon-tile tr-icon-tile--plain` вместе с
  размерным классом (`tr-entity-card__icon` = 44px, `__create-icon` = 48px).
  Не переопределять `border-radius`/`background` вручную в компоненте.
- Пустое состояние внутри сетки — всегда `tr-catalog__empty`, растягивается
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

  <b-table :data="rows" striped hoverable paginated :per-page="10">
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
- `striped hoverable` — по умолчанию всегда. `paginated` — если список
  потенциально длинный.
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

Эталон: шапка `Agents.vue` / `Knowledge.vue` / `Integrations.vue` /
`Conversations.vue`.

```html
<header class="tr-workbench-page__header tr-page-toolbar">
  <SearchField v-model="query" class="tr-page-toolbar__search" placeholder="..." />

  <ToolbarDropdown
    v-model="filter"
    class="tr-page-toolbar__filter"
    all-label="Все ..."
    aria-label="..."
    :options="filterOptions"
  />

  <MobileFilters :active="Boolean(filter)">
    <b-field label="...">
      <b-select v-model="filter" expanded>...</b-select>
    </b-field>
  </MobileFilters>
</header>
```

Классы `tr-page-toolbar`, `__search`, `__filter`, `__action` — общие,
использовать без изменений.

Фильтр-пилюля в toolbar — всегда компонент `ToolbarDropdown` (обёртка над
`b-dropdown` с `v-model`), а не `b-select`: он даёт кастомный вид кнопки с
шевроном вместо нативного `<select>`, как в остальном ките. `options`
принимает либо массив строк, либо массив `{ value, label }`; выбор "все" —
пустая строка, добавляется автоматически, текст задаётся через `all-label`.
Если исходное состояние типизировано уже, а не просто `string` (`ref<Status
| "">("")`), под `v-model` нужен `computed`-прокси с приведением типа при
записи — см. `typeFilterProxy` в `Knowledge.vue`.

Внутри `MobileFilters` (мобильный drawer с фильтрами) `b-select` остаётся —
это форма с явными подписями `b-field`, а не toolbar-пилюля, паттерн
`ToolbarDropdown` на неё не распространяется.

## 6. Master-detail / workbench-страницы (список + контент)

Эталон: `Conversations.vue` (канонический), `Agents.vue` (тот же паттерн,
переиспользованный для режима "чат с песочницей").

Ключевые классы: корень `tr-workbench-page`, внутри —
`tr-conversations` (да, буквально этот класс, даже не для диалогов — это
имя общего layout-примитива "список + рабочая область + панель свойств")
с модификаторами `is-${viewMode}-view` и `is-properties-open`;
`tr-conversations__panel`, `__list`, `__chat`, `__properties`, `__header`,
`__messages`, `__composer`, `__properties-body`; кнопки навигации между
панелями — `tr-conversations__icon-action` + `__list-action` /
`__settings-action` / `__properties-action` / `__properties-close`.

Если у ЛК появляется новая master-detail страница (например, "заявки" со
списком и деталями заявки) — переиспользовать этот набор классов целиком,
а не создавать параллельный `.tr-tickets` layout. Уникальным для страницы
может быть только то, что действительно не описано паттерном (пример:
`.tr-agents__workbench` — переопределение колонок грида и
`.tr-agents__sandbox-note` — плашка про тестовый режим).

## 7. Вкладки

Эталон: раздел «Вкладки» в `UiKit.vue`, `tr-settings__tabs` в `Settings.vue`.

```html
<b-tabs v-model="activeTab" type="is-boxed">
  <b-tab-item label="...">...</b-tab-item>
</b-tabs>
```

- Всегда `b-tabs`/`b-tab-item` из Buefy, не самодельные табы на `div`+`button`.
- Если вкладки открывают панель настроек — контент вкладки оборачивается в
  `tr-settings__panel` (см. раздел 8), а сам `b-tabs` — в `tr-settings__tabs`,
  чтобы получить единый отступ `.tab-content` из темы.

## 8. Панели настроек (список опций с переключателями)

Эталон: `Settings.vue` целиком.

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

## 9. Пустые состояния

Два вида, не путать и не изобретать третий:

- **Вся страница пуста** (нет вообще ни одной записи, действие "создать
  первую") → `.tr-section-empty` (см. `Conversations.vue`, когда список
  диалогов пуст) или предметная CTA-карточка вроде `.tr-dashboard-create` в
  `Dashboard.vue`, если предполагается крупный акцент на "создать первое".
- **Список пуст из-за фильтра/поиска** (записи есть, просто ничего не
  подошло) → `.tr-catalog__empty` внутри сетки (раздел 3) или пустая строка
  в `b-table` (стандартное поведение Buefy, ничего доп. не рисовать).

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
  блоков (не для каталогов карточек — там `.tr-catalog__grid`).
- `.tr-row`, `.tr-row--between`, `.tr-stack`, `.tr-muted`, `.tr-strong`,
  `.tr-divider` — типографские/layout-утилиты, использовать вместо
  инлайновых стилей.
- `.tr-dropdown` — общий вид меню `b-dropdown` (`dropdown-content`,
  `dropdown-item`, `dropdown-item.is-active`, `dropdown-divider`). Ставить
  на **любой** `b-dropdown`, будь то меню в navbar (`Navbar.vue`) или
  `ToolbarDropdown`, вместе со своим модификатором для специфичной ширины/
  триггера (`tr-workspace-dropdown`, `tr-toolbar-dropdown` и т.п.) — так все
  дропдауны в приложении выглядят одинаково, а точечные отличия (ширина
  меню, вид кнопки-триггера) описываются в паре `.tr-dropdown.<модификатор>`.

## 11. Чего не делать (антипаттерны — уже встречались и исправлены в ките)

- ❌ Заводить `<feature>-card`, `<feature>__grid`, `<feature>__catalog`,
  `<feature>__empty` под каждую страницу. ✅ Только `tr-entity-card`,
  `tr-catalog__grid`, `tr-catalog`, `tr-catalog__empty`.
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
  `.tr-catalog__empty` (раздел 9).
- ❌ `b-select` для пилюли-фильтра в `tr-page-toolbar`. ✅ `ToolbarDropdown`
  (раздел 5); `b-select` остаётся только внутри `MobileFilters`.
- ❌ Свой набор `dropdown-content`/`dropdown-item`/`dropdown-divider`-стилей
  под каждый новый `b-dropdown`. ✅ Общий `.tr-dropdown` (раздел 10) + один
  модификатор-класс на конкретный экземпляр для его ширины/триггера.

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

## 13. Порядок работы над одной страницей ЛК

1. Определить тип страницы по чек-листу (раздел 2).
2. Открыть в `trickster-ui-kit` эталонный компонент с тем же типом и
   скопировать структуру/имена классов поэлементно (разделы 3–9).
3. Перенести только разметку и классы; данные, стор, бизнес-логику ЛК —
   оставить как есть, адаптировать по месту.
4. Убрать из `<style scoped>` страницы всё, что теперь покрывается
   глобальными классами из `trickster-buefy.scss` — не оставлять дублей.
5. Прогнать `grep` по старым/удалённым классам страницы — убедиться, что
   ничего не осталось ни в шаблоне, ни в стилях.
6. Собрать проект и визуально сверить получившуюся страницу с аналогичной
   страницей `trickster-ui-kit` (те же отступы, радиусы, hover-эффекты).
