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

Kit и внешние приложения подключают только опубликованную exact-пару из
GitHub Packages. Сабмодули `packages/ui` и `packages/vue` нужны для
разработки библиотек и release-скриптов; production-сборка kit не использует
их как file-зависимости.

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

## Лицензия

[MIT](LICENSE)
