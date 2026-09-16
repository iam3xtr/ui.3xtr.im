# Дизайн-система Trickster

## Статус и источники истины

Этот документ описывает действующий UI-контракт Trickster. При расхождении
приоритет такой: styles @iam3xtr/ui, затем разметка экранов kit, затем этот
документ и migration guide.

@iam3xtr/ui владеет токенами, темой и общими ассетами. @iam3xtr/vue владеет
переносимыми Vue-компонентами и composables. UI Kit содержит screen composition
и fixture state, но не дублирует эти библиотеки.

## Тема и токены

Подключайте один entrypoint: @iam3xtr/ui/styles/theme.scss или theme.css.
tokens.scss и tokens.css дают только дизайн-токены и не подключают Bulma,
Buefy или Vue runtime. theme.scss и theme.css — полная тема Bulma и Buefy.
Не подключайте одновременно buefy/dist/css/buefy.css.

Тема переключается data-theme=light или dark на html. Используйте CSS variables
контракта (--c-* для поверхностей и текста, --tr-* для брендовых и
компонентных значений), а не literal background, color или radius в
Vue-компоненте.

Базовые правила: шаг отступов 4px, базовый radius 6px, карточки 8px,
sidebar 232px, topbar 64px. Brand colour — #8E64CE; success/warning/danger
остаются семантическими цветами.

## Разметка и компоненты

- Все project CSS classes используют префикс tr-; штатные классы Bulma/Buefy
  не переименяются.
- Одинаковая роль на разных экранах использует одинаковый контейнер и имя
  класса: каталог — tr-catalog-grid, toolbar — tr-toolbar, состояние —
  tr-async-state, настройки — tr-settings-panel.
- Для таблиц, полей, загрузки, pagination, tabs, modal, dialog, toast,
  loading и skeleton используйте Buefy.
- Общие компоненты импортируются из @iam3xtr/vue; route-aware PageHeader,
  NavbarTabs и TariffSummaryCard — из @iam3xtr/vue/navigation.
- В src/**/*.vue не допускаются style blocks. Правила добавляются в
  packages/ui/src/styles/theme.scss.

## Состояния и доступность

Списки и секции различают ready, loading, empty, error, permission-denied и
partial. Не показывайте неизвестные или ошибочные данные как успешные; рядом
с ошибкой должно быть доступное действие восстановления, если оно возможно.

Интерактивные элементы имеют текстовую подпись или aria-label, видимый focus
и смысл, не выраженный только цветом. Анимации учитывают
prefers-reduced-motion. Loader используется один: Loader из @iam3xtr/vue,
размеры inline, section, screen.

## Иконки

UI-иконки — Material Design Icons (b-icon, @mdi/font). Custom SVG допустимы
только для логотипов LLM-вендоров и model-kind иконок, когда MDI не
предоставляет эквивалента. Они хранятся в @iam3xtr/ui/assets/icons/** и
регистрируются через provideIconRegistry.

## Экранный контракт

Kit охватывает dashboard, agents, knowledge, conversations, workspace,
profile, auth, operator catalogs и /kit. Маршруты повторяют кабинет, но
данные всегда fixture-only. Мастер агента ведёт от задачи и контекста к
правилам, знаниям, sandbox-проверке, подключению канала и запуску; технические
параметры остаются дополнительным уровнем.

Savable forms используют явные состояния draft/pending/success/error и
dirty-exit выбор «сохранить / выйти без сохранения / остаться». Мгновенные
операции не смешиваются с сохранением формы. In-memory поведение кита не
является production API-контрактом.

## Проверка изменений

    npm run lint:style
    npm run test:unit
    npm run build
    git diff --check

Для изменения пакетов дополнительно используйте их собственные test/pack
проверки и consumer matrix. Поставка и точные registry pins описаны в
[release process](release-process.md).
