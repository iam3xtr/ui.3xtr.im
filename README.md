# Trickster UI Kit

Trickster UI Kit — backend-less эталон интерфейса личного кабинета 3xtr.im.
Он повторяет маршруты, анатомию разметки, классы и иконки кабинета, но
использует только fixture-данные. Реальные API, авторизация, права и
persistence остаются в get.3xtr.im.

## Архитектура

- `packages/ui/` — git submodule `@iam3xtr/ui`: токены, Bulma/Buefy-тема,
  логотип и SVG-ассеты.
- `packages/vue/` — git submodule `@iam3xtr/vue`: переносимые Vue-компоненты
  и composables.
- `packages/consumers/` — изолированные проверки поставки npm-пакетов.
- `src/` — маршруты, экранные компоненты и in-memory Pinia fixtures кита.
- `docs/design-system.md` — действующий визуальный и компонентный контракт.
- `docs/agent-migration-guide.md` — правила переноса контракта в кабинет.
- `docs/release-process.md` — выпуск библиотек и требования к доступам.

`npm run dev` резолвит `@iam3xtr/ui` и `@iam3xtr/vue` в исходники локальных
сабмодулей `packages/ui` и `packages/vue`; SVG registry читается из
`packages/ui/src/assets/icons`. Vite
dedupe'ит Vue, Vue Router и Buefy, поэтому локальные компоненты используют
тот же runtime, что и kit. Это только development-режим: `npm run build`, `npm run
build:pages` и внешние приложения подключают опубликованную exact-пару из
GitHub Packages, без `file:packages/*` в runtime-зависимостях.

## Установка и запуск

    git clone https://github.com/iam3xtr/ui.3xtr.im.git
    cd trickster-ui-kit
    npm install
    npm run dev

Для разработки библиотек или запуска release-скриптов дополнительно получите
сабмодули:

    git submodule update --init --recursive
    npm install

Не используйте git submodule update --remote. Изменение библиотеки выполняется
в её собственном репозитории; после публикации новой версии обновляется
точный dependency pin UI Kit.

## Команды

    npm run dev
    npm run build
    npm run lint:style
    npm run test:unit
    node packages/consumers/scripts/run-matrix.mjs
    npm run release:ui
    npm run release:vue
    npm run release:all

Матрица потребителей требует предварительного npm ci в packages/ui и
packages/vue. После неё удалите их вложенные node_modules, чтобы
file-зависимости кита не резолвили дублирующие peer-зависимости.

Команды release:ui, release:vue и release:all по умолчанию работают как dry
run с patch bump. Для релиза передайте -Execute; для minor или major задайте
уровень явно. release:all выпускает UI, дожидается его workflow и только затем
выпускает совместимый Vue. release:vue перед созданием тега проверяет, что
точная версия UI уже опубликована в GitHub Packages.
Для следующего patch prerelease используйте -Alpha: например, 0.1.1 станет
0.1.2-alpha.
Чтобы выпустить уже указанную в manifests версию без bump, используйте
-ReleaseCurrent -Execute.
Сочетание -ReleaseCurrent -Alpha выпускает текущую стабильную версию как
prerelease: 0.1.1 станет 0.1.1-alpha.
Switch -Beta работает симметрично для beta-версий. После успешного релиза
скрипт обновляет точный dependency pin и lockfile UI Kit, фиксирует gitlink
SHA и пушит отдельный `chore(deps)` commit; восстановление прерванного push
выполняется через `-Resume -Execute`. Полный порядок и ограничения — в
docs/release-process.md.

## Действующие правила

- Стили не размещаются в src/**/*.vue. Единственный источник темы —
  @iam3xtr/ui/styles/theme.scss; guard npm run lint:style это проверяет.
- Иконки интерфейса — MDI. SVG допустимы только для зарегистрированных
  логотипов LLM-вендоров и типов моделей; registry подключается один раз в
  src/main.js через provideIconRegistry.
- Общие компоненты импортируются из @iam3xtr/vue и @iam3xtr/vue/navigation.
  Локальные src/components/common/ содержат только kit-специфичные
  DirtyExitModal и FormErrorSummary.
- Все fixture stores in-memory. Не добавляйте сетевые запросы, ключи,
  производственные URL, RBAC или серверную бизнес-логику.
- Новые визуальные правила документируйте в docs/design-system.md; изменение
  имени иконки или alias — также в docs/agent-migration-guide.md.

## Маршруты и публикация

Kit покрывает dashboard, агентов и каналы, знания, диалоги, workspace,
профиль, auth, операторские каталоги, справочник /kit и /404. Полный реестр
находится в src/router.js.

Тема переключается document.documentElement.dataset.theme значением light или
dark и в примерах сохраняется под ключом trickster-theme.

GitHub Pages собирается из main через .github/workflows/deploy-pages.yml.
Workflow устанавливает точные опубликованные пакеты из GitHub Packages с
`GITHUB_TOKEN` и разрешением `packages: read`; checkout сабмодулей и отдельный
cross-repository secret ему не нужны. Порядок выпуска пакетов, разграничение
токенов и registry gate описаны в docs/release-process.md.

Роутер использует history mode, поэтому адреса на Pages не содержат `#`.
`404.html` сохраняет прямой deep link и возвращает его приложению; это
клиентский fallback статического GitHub Pages, а не server-side rewrite.

Сборка Pages использует отдельную команду `npm run build:pages` (Vite mode
`pages`), которая — и только она — устанавливает `__VUE_PROD_DEVTOOLS__ =
true`. Обычный `npm run build` (production mode) и публикуемые артефакты
`packages/ui`/`packages/vue` этот флаг явно не трогают и остаются с prod
devtools выключенными. Флаг только позволяет [Vue Devtools browser
extension](https://devtools.vuejs.org/) (Chrome/Firefox) подключиться к уже
задеплоенной публичной странице get.3xtr.im demo и увидеть дерево
компонентов, props/events и Pinia stores — сама сборка не добавляет никакого
in-DOM devtools UI, remote/inspector server, open-editor endpoint или secret,
это чистая demo/inspection trade-off публичного reference-стенда, а не
production-функциональность. Ручная проверка: открыть Pages URL с
установленным расширением, убедиться, что вкладка Vue появляется и показывает
компоненты/stores; повторить то же на URL, собранном обычным `npm run build`,
и убедиться, что вкладка Vue их не показывает.

Cтоимость флага в размере артефакта (`main-*.js`, замерено на этом коммите):
обычный `npm run build` — 866.08 kB (gzip 241.94 kB); `npm run build:pages` —
1008.03 kB (gzip 282.53 kB) — на ~142 kB / ~16% больше за счёт кода devtools
hook'а, который прячется под `__VUE_PROD_DEVTOOLS__`. Точные числа сдвигаются
с каждым релевантным изменением зависимостей — при пересмотре сравнивайте
`dist/assets/main-*.js` обеих сборок заново, а не переносите эти цифры как
константу.

## Лицензия

[MIT](LICENSE)
