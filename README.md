# Trickster UI Kit for Buefy

Готовая основа UI-kit для личного кабинета Trickster.

## Состав

- `src/styles/_trickster-tokens.scss` — фирменные цвета, нейтральная палитра, типографика, отступы и геометрия.
- `src/styles/trickster-buefy.scss` — конфигурация Bulma/Buefy, светлая и тёмная темы, базовые стили приложения.
- `src/router.ts` — маршруты основных разделов приложения.
- `src/components/Dashboard.vue` — главный экран рабочего пространства.
- `src/components/Conversations.vue` — список и поиск диалогов.
- `src/components/UiKit.vue` — примеры основных компонентов Buefy.
- `ui-kit.html` — HTML-примеры элементов на классах Bulma.
- `src/main.ts.example` — подключение Buefy и темы.
- `vite.config.ts.example` — минимальная конфигурация Vite/Dart Sass.

## Целевая версия

Шаблон ориентирован на:

- Vue 3;
- Buefy 3.x;
- Bulma 1.x;
- Dart Sass.

Для старого проекта на Vue 2 / Buefy 0.x потребуется legacy-вариант импортов.

## Установка

```bash
npm install buefy bulma
npm install --save-dev sass
```

## Подключение

В `main.ts`:

```ts
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

```ts
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

После этого можно открыть `ui-kit.html`.

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
