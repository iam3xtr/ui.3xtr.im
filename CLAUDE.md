# CLAUDE.md

Сначала прочитайте [AGENTS.md](AGENTS.md). Этот файл описывает локальные
правила trickster-ui-kit.

## Команды

    npm run dev
    npm run build
    npm run build:pages
    npm run preview
    npm run lint:style
    npm run guard:no-component-styles
    npm run test:unit
    node packages/consumers/scripts/run-matrix.mjs
    npm run release:ui
    npm run release:vue
    npm run release:all

test:unit запускает только tests/unit/**. Для матрицы потребителей нужны
временные node_modules в обоих submodules; после запуска их удаляют, иначе
file-зависимости могут использовать второй экземпляр peer-пакета.

release:ui, release:vue и release:all выполняют dry run patch bump без
-Execute. При явном -Execute они создают commits и annotated tags в выбранных
submodules; release:all ожидает успешный UI release перед Vue, а release:vue
проверяет, что точная версия UI уже опубликована в npm registry. minor и major
задаются через -Bump. Switch -Alpha выпускает следующую patch-версию с
суффиксом -alpha.
Switch -ReleaseCurrent выпускает уже указанную в manifests версию без bump.
Вместе с -Alpha он добавляет суффикс -alpha к текущей стабильной версии.

## Репозиторий и границы

Это UI/UX reference implementation кабинета get.3xtr.im, не production
приложение. Здесь нет API-клиентов, реальной авторизации, persistence,
секретов, RBAC и бизнес-правил. Компоненты, stores и fixtures существуют для
демонстрации текущего контракта экранов.

Визуальная основа находится в packages/ui (@iam3xtr/ui), переносимые
компоненты — в packages/vue (@iam3xtr/vue). `npm run dev` намеренно резолвит
их исходники из сабмодулей через Vite aliases, чтобы изменения библиотек были
видны без публикации; SVG registry собирается Vite напрямую из
`packages/ui/src/assets/icons`. Обычные production-сборки
(`npm run build`, `npm run build:pages`) и внешние приложения используют
опубликованные exact версии из node_modules; file:packages/* не является
допустимой зависимостью runtime-сборки.

## Стили, иконки и компоненты

- В src/**/*.vue запрещены style blocks; проверка — npm run lint:style.
- Единственный источник токенов и темы —
  @iam3xtr/ui/styles/tokens и @iam3xtr/ui/styles/theme. Не создавайте
  локальную копию темы.
- Для интерфейса используйте MDI. Пользовательские SVG разрешены только из
  документированного registry @iam3xtr/ui/assets/icons/**.
- Общие компоненты импортируются из @iam3xtr/vue; route-aware PageHeader,
  NavbarTabs и TariffSummaryCard — из @iam3xtr/vue/navigation.
- Buefy регистрируется плагином. Для готовых control, overlay, table и
  pagination используйте Buefy вместо самодельных аналогов.

## Структура

    src/components/       route-backed экраны и kit-specific primitives
    src/components/agents деталь агента и мастер создания
    src/components/knowledge коллекции и материалы
    src/components/conversations история и настройки диалога
    src/components/workspace usage, members, billing, audit
    src/components/profile профиль, security, notifications, help
    src/components/kit   интерактивный справочник дизайн-системы
    src/stores/           in-memory Pinia fixtures
    src/locales/          scoped RU/EN/ES dictionaries
    packages/ui/          @iam3xtr/ui submodule
    packages/vue/         @iam3xtr/vue submodule
    packages/consumers/   tarball consumer fixtures

## Проверки и документация

Для изменения контракта запускайте наиболее узкие проверки; обычно это
lint:style, test:unit, build и git diff --check. Визуальная проверка полезна,
но не блокирует работу в среде без браузерной автоматизации.

Обновляйте docs/design-system.md после изменения визуального контракта.
Изменение иконок или aliases также отражайте в docs/agent-migration-guide.md.
Пакетные версии, release workflows и credentials описаны только в
docs/release-process.md.

## Deployment и downstream

GitHub Pages workflow устанавливает exact package-пару из registry с
`GITHUB_TOKEN` и `packages: read`; он не checkout'ит сабмодули и не требует
cross-repository secret. `GITHUB_TOKEN` с правом публикации используется
только в release workflow самих библиотек; секреты не хранятся в
.gitmodules, .npmrc, артефактах или логах.

deploy-pages.yml собирает demo через `npm run build:pages` (Vite mode
`pages`) — единственная команда, включающая `__VUE_PROD_DEVTOOLS__` для
inspection публичного demo через Vue Devtools browser extension. `npm run
build` (обычный production mode) и публикуемые artifacts packages/ui и
packages/vue этот флаг не трогают и остаются с prod devtools выключенными;
никакого in-DOM devtools UI, remote server, open-editor endpoint или secret
это не добавляет.

Исторический sync кабинета обслуживает только потребителей, которые ещё не
перешли на пакеты. Не восстанавливайте в kit удалённые локальные stylesheet
копии и не меняйте соседний репозиторий из этого workspace.
