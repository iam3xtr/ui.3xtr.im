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

Эталон: шапка `Agents.vue` / `Knowledge.vue` / `Integrations.vue`.

```html
<header class="tr-workbench-page__header tr-page-toolbar">
  <SearchField v-model="query" class="tr-page-toolbar__search" placeholder="..." />

  <b-select v-model="filter" class="tr-page-toolbar__filter" expanded aria-label="...">
    <option value="">Все ...</option>
  </b-select>

  <MobileFilters :active="Boolean(filter)">
    <b-field label="...">
      <b-select v-model="filter" expanded>...</b-select>
    </b-field>
  </MobileFilters>
</header>
```

Классы `tr-page-toolbar`, `__search`, `__filter`, `__action` — общие,
использовать без изменений. Мобильная версия фильтров — всегда через
существующий компонент `MobileFilters`, не через собственный modal/drawer.

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

## 12. Порядок работы над одной страницей ЛК

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
