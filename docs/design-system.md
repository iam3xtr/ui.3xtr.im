# Дизайн-система Trickster

## Статус и источники истины

Этот документ описывает действующий UI-контракт Trickster. При расхождении
приоритет такой: styles @iam3xtr/ui, затем разметка экранов kit, затем этот
документ и migration guide.

@iam3xtr/ui владеет токенами, темой и общими ассетами. @iam3xtr/vue владеет
переносимыми Vue-компонентами и composables. UI Kit содержит screen composition
и fixture state, но не дублирует эти библиотеки.

### Локальная разработка библиотек

`npm run dev` — единственный режим kit, который берёт `@iam3xtr/ui` и
`@iam3xtr/vue` из `packages/*/src` через Vite aliases. Он предназначен для
немедленной проверки изменений в обоих сабмодулях; Vite module читает SVG
registry непосредственно из `packages/ui/src/assets/icons`, без сборки пакета
или его вложенных node_modules. Vite
dedupe'ит `vue`, `vue-router` и `buefy`, поэтому у компонентов кита и локальной
библиотеки один runtime. Production и Pages-сборки не получают эти
aliases и проверяют опубликованные exact-пакеты из `node_modules` — это
сохраняет реальный downstream-контракт.

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
- Drop-поверхность над интерактивным содержимым (таблица, список) — только
  FileDropTarget из @iam3xtr/vue, не самодельный dropzone-wrapper. Явный выбор
  файла остаётся кнопкой/контролом Buefy (b-upload); оба входа передают
  File[] в один и тот же fixture-only enqueue helper экрана. FileDropTarget не
  знает про upload, progress, retry, cancel или API — accept — только
  клиентская подсказка, не security boundary.
- Единый каркас правой формы — FormDrawer из @iam3xtr/vue, поверх штатного
  b-sidebar (right, overlay, fullheight); пакет не подменяет Escape,
  backdrop и scroll lock самодельным overlay. Header — title и доступная
  close-кнопка, default slot — scrollable form body, footer slot — fixed
  действия; submit эмитится один раз и не эмитится во время busy/disabled.
  FormDrawer не реализует validation, dirty guard, API или draft model —
  это остаётся за конкретным экраном. b-sidebar не реализует focus trap и
  возврат фокуса при закрытии (в отличие от b-modal) — известное
  ограничение Buefy, не компенсируемое собственной реализацией. Theme-
  контракт (`.tr-form-drawer` в theme.scss) владеет только панелью, overlay,
  header/body/footer и layering (общий overlay/z-index scale с modal/dialog);
  на <=768px панель разворачивается на весь viewport вместо фиксированной
  ширины. Правило применения (эталон — `/kit`, раздел «Диалоги и оверлеи»):
  FormDrawer — редактирование в правой панели с длинным body и фиксированным
  footer; прямой `b-sidebar` — неформовая панель (свойства/details), не
  форма; `b-modal` — короткая форма без длинного body и без отдельного
  fixed footer; `b-dialog` — только подтверждение действия, не форма любой
  длины.
- Toolbar (@iam3xtr/vue) рендерит слот filters дважды — inline pills и копию
  в mobile-filters trigger/panel (<=768px) — так что theme скрывает inline
  копию через `.tr-page-toolbar__filters .tr-page-toolbar__filter`, а не
  безусловный `.tr-page-toolbar__filter`; последнее также спрятало бы копию
  внутри `.tr-mobile-filters__content` и оставило бы mobile-панель пустой.
- В src/**/*.vue не допускаются style blocks. Правила добавляются в
  packages/ui/src/styles/theme.scss.
- AuthPage (auth/) — узкий `flat` prop (Issue #9.1): по умолчанию контейнер —
  `.tr-auth__card.tr-card` (background/border/radius/padding/shadow из
  общего card-контракта, theme.scss раздел 8); `flat` убирает только класс
  `.tr-card`, оставляя `.tr-auth__card` — он не декоративный, только задаёт
  центрированную адаптивную колонку. LoginView/SignupView/ForgotView
  передают `flat` и не имеют card-анатомии; InviteView/VerifyView не
  передают его и остаются card-layout без изменений.
- Sidebar (Issue #10.1) — ширина фиксирована canonical токеном `$sidebar-
  width` (232px, `_trickster-tokens.scss`); `.tr-sidebar` резервирует место
  под scrollbar (`scrollbar-gutter: stable`, `@supports`-фолбэк —
  `overflow-y: scroll` для движков без этого свойства), поэтому появление
  scrollbar у высокой tariff card не меняет ширину и не переносит nav
  labels. Длинный label (RU/EN/ES) не переносится на вторую строку и не
  переполняет sidebar по горизонтали — вместо этого обрезается ellipsis
  (`.menu-list a span:not(.icon)`); полный текст остаётся в DOM для AT и
  доступен как `title`-tooltip указателю (`Sidebar.vue`). Правило не
  затрагивает mobile drawer (`.tr-mobile-nav`) — у него отдельная разметка.
  Блок лимитов `TariffSummaryCard` сохраняет utility-класс `tr-stack` для
  column layout, но `.tr-stack.tr-sidebar-tariff__limits` задаёт `gap: 0`
  с большей специфичностью, чтобы generic stack-gap его не переопределял.

## Состояния и доступность

Списки и секции различают ready, loading, empty, error, permission-denied и
partial. Не показывайте неизвестные или ошибочные данные как успешные; рядом
с ошибкой должно быть доступное действие восстановления, если оно возможно.

Интерактивные элементы имеют текстовую подпись или aria-label, видимый focus
и смысл, не выраженный только цветом. Анимации учитывают
prefers-reduced-motion. Loader используется один: Loader из @iam3xtr/vue,
размеры inline, section, screen.

### Dashboard attention queue

`Dashboard.vue`'s "Требует внимания" — session-scoped очередь
(`composables/useDashboardAttentionQueue.js`), не список: показывается не
более одной actionable карточки. Секция не рендерится вовсе, когда причин
нет (`attentionItems.length === 0`); у самой секции нет визуального
заголовка, имя для AT несёт `aria-label`. При более чем одной причине
рядом появляются accessible previous/next (`aria-label`, `aria-live` на
позиции "N из M") — навигация boundary-disabled, а не циклическая: на
границах кнопка недоступна, а не переносит на другой конец списка.

Dismiss скрывает только активную карточку и изолирован комбинацией
`workspace + browser session` (ключ `sessionStorage` на каждое
пространство — сам `sessionStorage` уже ограничен вкладкой/сессией
браузера). После dismiss активной становится карточка на том же месте в
списке ("соседняя"); активный элемент выбирается по стабильному `key`, не
по индексу — обновление источника не сбивает выбор, если ключ ещё
присутствует. Скрытые карточки восстанавливаются кнопкой "Показать" без
перезагрузки страницы; сама причина (`attentionItems`) не меняется —
composable только фильтрует и переключает то, что показано.

## Иконки

UI-иконки — Material Design Icons (b-icon, @mdi/font). Custom SVG допустимы
только для логотипов LLM-вендоров и model-kind иконок, когда MDI не
предоставляет эквивалента. Файлы хранятся в @iam3xtr/ui/assets/icons/** и
регистрируются через provideIconRegistry. Тот же набор публикуется и как
bundler-neutral JS map `name -> raw SVG markup` через
`@iam3xtr/ui/icons` (Issue #8.1) — без import.meta.glob, `?raw`/`?component`
или `@`-алиаса; резолвится в любом окружении, поддерживающем `"exports"` в
package.json (Vite, webpack, plain Node, SSR), и не дублирует MDI.

`@iam3xtr/vue`'s `Icon` (Issue #8.2) — независимый SVG-first адаптер над
этим реестром, а не замена `b-icon`: непустой default slot → реестр
потребителя (`provideIconRegistry`) → default-реестр `@iam3xtr/ui/icons`
(доступен без единого вызова `provideIconRegistry`) → глобально
зарегистрированный `BIcon` как MDI fallback → aria-hidden placeholder. SVG
всегда выигрывает у Buefy fallback при совпадении имени; `name` (legacy) и
`icon` (Buefy-совместимый алиас) — синонимы одного входа, конфликт между
ними или между slot и `name`/`icon` даёт `console.warn`. Обычный `<b-icon>`
где угодно ещё в разметке этим компонентом не затрагивается.

Пять операторских каталогов (Users, Providers, Models, Tariffs, Requests,
Issue #12.1) показывают единый семантический marker рядом с
role/status/protocol-текстом ячейки — decorative-иконка через `Icon`, никогда
не замена текста. Domain-to-icon карта и shared presentation helper лежат в
`src/components/administration/adminMarkers.js` и `AdminMarker.vue`: `role`/
`status` резолвятся в MDI через Buefy fallback (нет совпадения в
`@iam3xtr/ui/icons`), `protocol` — в вендорский логотип из того же
`@iam3xtr/ui/icons`, что уже использует `ModelSelect.vue`. Неизвестное
значение просто не получает иконку — текст остаётся единственным и
достаточным сигналом в обоих режимах `b-table` (desktop и mobile-cards).

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

### Сценарии новых контрактов (Handoff.2)

Downstream-контракты #3–#14 демонстрируются связными сценариями внутри
реальных route-backed экранов, а не отдельным каталогом изолированных
компонентов — каждый сценарий имеет одну user journey и один primary action;
props/events/slots остаются в README пакетов (`packages/vue/README.md`) и
здесь, а не копируются в интерфейс:

| Сценарий | Маршрут(ы) | Контракты |
| --- | --- | --- |
| Materials collection (upload/edit) | `/knowledge/:id` (`Files.vue`) | `FileDropTarget` + явный `b-upload`, одна demo-очередь, `ListAsyncState`/`Loader`, partial-banner (#3–#6) |
| Редактирование в контексте страницы | `/kit/tables` (раздел «Редактирование в контексте страницы») | `FormDrawer` открыт построчным действием, required-валидация, pending submit, dirty-exit boundary через общий `DirtyExitModal` (#4) |
| Application shell | `/kit/application-shell` | `trVue` install order (текстовый `main.js`-фрагмент, не исполняется этим китом — см. ниже), sidebar с clickable `TariffSummaryCard`, `Icon` precedence (#7, #8, #11/#12) |
| Operator catalog | `/users`, `/providers`, `/models`, `/tariffs`, `/requests` | Общая карта domain → icon (`administration/adminMarkers.js`), текстовые labels, sorting/filtering, mobile cards (#12) |
| Dashboard attention | `/` (`Dashboard.vue`) | Единая attention-card, dismiss/restore, keyboard/live semantics (#13) |
| Auth reference | `/auth/**` | Завершённый flat-контракт форм (#9) |
| Pages Devtools | deploy-инструкции (`docs/design-system.md`, `.github/workflows/deploy-pages.yml`) | Документируется рядом с деплоем, не как UI-компонент (#14) |

`DialogsOverlays.vue` (`/kit/dialogs-overlays`) остаётся отдельным
prop-level справочником `FormDrawer`/`b-modal`/`b-sidebar`/`b-dialog` — не
подменяет связный сценарий выше, только документирует контракт компонента
в изоляции.

**Release-gated ограничение.** `Release.1` был dry run: `@iam3xtr/ui` и
`@iam3xtr/vue` не опубликованы реально, установленная зависимость
(`node_modules/@iam3xtr/vue@0.1.1-alpha`) — более ранний снимок, без
`trVue`-плагина (`@iam3xtr/vue/plugin` не входит в `package.json#exports`)
и без расширенной `Icon`-цепочки резолюции (`icon`-алиас, default slot,
default-реестр `@iam3xtr/ui/icons`, Buefy MDI fallback — Issue #8.2). Application
shell сценарий поэтому живьём резолвит только текущий установленный
контракт `Icon` (`name`, обязательный, без fallback/slot) и показывает
расширенную цепочку и `trVue` только как код (`CopyPre`), явно
подписанный как неисполняемый/неопубликованный — см. компонент
`src/components/kit/ApplicationShell.vue` и `.todo`, Handoff.2.

## Проверка изменений

    npm run lint:style
    npm run test:unit
    npm run build
    git diff --check

Для изменения пакетов дополнительно используйте их собственные test/pack
проверки и consumer matrix. Поставка и точные registry pins описаны в
[release process](release-process.md).
