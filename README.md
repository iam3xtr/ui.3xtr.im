# Trickster UI Kit for Buefy

Эталонная реализация UI/UX-контракта личного кабинета Trickster
(`get.3xtr.im`), а не отдельная витрина Buefy. Кит — работающая упрощённая
копия кабинета без бэкенда: те же маршруты, та же анатомия разметки, те же
имена классов, тот же иконочный набор. Правка дизайна выполняется в ките,
проверяется на всех его экранах за один проход и переносится в кабинет через
`npm run ui-kit:update` кабинета. Контракт целиком описан в
[`docs/design-system.md`](docs/design-system.md).

## Состав

- `src/styles/_trickster-tokens.scss` — фирменные цвета, нейтральная палитра, типографика, отступы и геометрия.
- `src/styles/trickster-buefy.scss` — конфигурация Bulma/Buefy, светлая и тёмная темы, базовые стили приложения. Это **единственный** файл со стилями проекта.
- `src/router.js` — маршруты основных разделов приложения.
- `src/components/Dashboard.vue` — главный экран рабочего пространства.
- `src/components/Conversations.vue` — список и поиск диалогов.
- `src/components/UiKit.vue` — примеры основных компонентов Buefy, иконок и загрузчика (страница `/ui-kit`).
- `src/assets/icons/` — обоснованный набор кастомных SVG-иконок (вендоры LLM и виды моделей), см. раздел «Иконки».
- `src/components/common/Icon.vue`, `src/components/common/Loader.vue` — общие компоненты набора иконок и индикации загрузки.

## Целевая версия

Шаблон ориентирован на:

- Vue 3 (чистый JavaScript, без TypeScript — `<script setup>` без `lang="ts"`);
- Buefy 3.x;
- Bulma 1.x;
- Dart Sass.

Для старого проекта на Vue 2 / Buefy 0.x потребуется legacy-вариант импортов.

## Иконки

UI-иконки — только Material Design Icons (`b-icon`, `@mdi/font`). Собственный
SVG допускается исключительно там, где у MDI нет эквивалента: иконки
вендоров LLM и иконки видов моделей. Полный реестр кастомных иконок с
обоснованием каждой — в [`docs/design-system.md`](docs/design-system.md#иконки);
карта соответствия «имя из набора кабинета → MDI-имя» — в
[`docs/agent-migration-guide.md`](docs/agent-migration-guide.md). Иконка без
записи в реестре в набор не попадает.

## Загрузчик

Индикация загрузки — один компонент `Loader` (`src/components/common/Loader.vue`)
с тремя размерами (`inline`/`section`/`screen`), темозависимым цветом через
`currentColor` и статичным вариантом при `prefers-reduced-motion`. Правила
описаны в [`docs/design-system.md`](docs/design-system.md#загрузчик).

## Стили

Стили проекта живут только в `src/styles/trickster-buefy.scss` (и подключаемом
им `_trickster-tokens.scss`). Файл структурирован по разделам с баннерами и
оглавлением в шапке (токены, shell, навигация, toolbar, вкладки, таблицы,
формы, карточки и каталоги, состояния, оверлеи, тарифы, диалоги, утилиты,
responsive). Блоков `<style>` в `.vue`-компонентах кита быть не должно — это
правило, а не соглашение: новые компоненты не заводят собственных `<style>`,
существующие исключения снимаются по `.plan` (Stage A2).

`npm run lint:style` запускает Stylelint (запрещает новый `!important` и
дублирование селекторов) и guard `scripts/no-component-styles.js`, который
падает, если какой-либо `src/**/*.vue` содержит `<style`. Guard можно
вызвать отдельно: `npm run guard:no-component-styles`. Обе проверки не
требуют сети и подключены в CI (`.github/workflows/deploy-pages.yml`).
Существующие переопределения specificity Bulma/Buefy, перенесённые as-is из
кабинета, помечены `stylelint-disable-next-line declaration-no-important` с
комментарием `Stage A3 debt` и снимаются в рамках Stage A3 (Buefy-first).

## Установка

```bash
npm install buefy bulma
npm install --save-dev sass
```

## Подключение

В `src/main.js`:

```js
import { createApp } from "vue";
import Buefy from "buefy";
import App from "./App.vue";

import "./styles/trickster-buefy.scss";

createApp(App)
  .use(Buefy)
  .mount("#app");
```

Не подключайте одновременно готовый `buefy.css`: SCSS-файл уже собирает Bulma и Buefy с нужными переменными.

## Переключение темы

```js
document.documentElement.dataset.theme = "light";
document.documentElement.dataset.theme = "dark";
```

В примерах тема сохраняется в `localStorage` под ключом `trickster-theme`.

## Основные решения

### Brand

```scss
$primary: hsl(264, 52%, 60%); // #8E64CE
```

Зелёный и оранжевый из исходного логотипа не используются как фирменные цвета.

Зелёный, жёлтый и красный остаются только семантическими цветами:

- success;
- warning;
- danger.

### Тёмная тема

Тёмная тема построена на нейтральных серых цветах:

- фон приложения: `#151515`;
- sidebar/topbar: `#191919`;
- основные поверхности: `#1d1d1d`;
- вложенные поверхности: `#232323`;
- границы: `#383838`.

Синие оттенки в нейтральной палитре не используются.

### Геометрия

- базовый radius: `6px`;
- карточки: `8px`;
- шаг отступов: `4px`;
- sidebar: `232px`;
- topbar: `64px`.

## Сборка standalone CSS

```bash
npx sass \
  --load-path=node_modules \
  src/styles/trickster-buefy.scss \
  dist/trickster-buefy.css
```

Готовый CSS не привязан к Vue-приложению кита и годится для standalone-проверки
классов вне `npm run dev`.

## Публикация на GitHub Pages

Проект автоматически собирается и публикуется из ветки `main` через
`.github/workflows/deploy-pages.yml`.

После загрузки репозитория на GitHub:

1. Откройте `Settings → Pages`.
2. В разделе `Build and deployment` выберите `Source: GitHub Actions`.
3. Отправьте изменения в ветку `main` или вручную запустите workflow
   `Deploy to GitHub Pages` на вкладке `Actions`.

Workflow получает базовый путь сайта из настроек GitHub Pages, поэтому проект
работает как в корне домена, так и по адресу вида
`https://username.github.io/repository/`. Для опубликованной версии роутер
автоматически использует hash-режим, чтобы внутренние страницы открывались без
серверной настройки SPA fallback.

## Лицензия

Проект распространяется по лицензии [MIT](LICENSE).

## Рекомендации по применению

- Используйте Buefy-компоненты для поведения, accessibility и интерактивности.
- Используйте классы `tr-*` для оболочки приложения, dashboard-карточек и композиции.
- Не задавайте background/text прямо внутри отдельных Vue-компонентов: используйте CSS variables.
- Переключатель пространства размещайте в верхней панели и не скрывайте внутри настроек.
- Для нового компонента сначала используйте существующие токены; новый цвет или radius добавляйте только при отсутствии подходящего.
