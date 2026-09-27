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

`npm run test:unit:sources` проверяет demo против тех же package sources до
публикации. Обычный `npm run test:unit` использует опубликованные exact pins.

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
- В стандартной `.table` заголовочные ячейки `thead th` и `tfoot th`
  используют один базовый стиль темы; правило мобильной
  `.tr-table--stack tfoot th` сохраняет свою раскладку. В `/kit/tables`
  показан `b-table` с информационной строкой `tfoot`.
- Таблицы файлов коллекции и запусков переиндексации располагаются вне
  `.tr-card`, чтобы рамка таблицы не дублировалась рамкой панели.
- Текстовый статус `.tr-status-tag` остаётся однострочным и сокращается
  через ellipsis; внутри таблицы его ширина ограничена 10rem. Полное
  значение доступно в `title` и текстовом содержимом.
- `NavbarTabs` использует естественную ширину ссылок. Свободная ширина
  остаётся в полосе прокрутки; стрелки появляются только при переполнении.
- Кнопки в `modal-card-foot` разделены общим отступом. Короткие формы
  показывают ошибки под соответствующими полями без браузерных tooltip.
- Для Buefy `b-tag` kit не задаёт собственных color/background overrides:
  обычные и semantic `type` (`is-primary`, `is-success`, `is-warning`,
  `is-danger`, `is-dark` и другие Bulma types) выглядят ровно как в примерах
  Buefy.
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
- `ToolbarDropdown` и `MobileFilters` используют общий Buefy overlay из
  @iam3xtr/vue. Меню открывается поверх следующего контента, меняет
  направление у края viewport и обновляет положение при scroll/resize.
  В обрезающем контейнере вне modal/drawer работает body portal; внутри
  modal/drawer меню остаётся в его DOM-контексте и при обрезании
  закрепляется через `position: fixed`. Тема @iam3xtr/ui стилизует
  portal wrapper через `.tr-dropdown-overlay-portal`, сохраняя прежние
  ancestor selectors для inline меню и шкалу z-index ниже modal.
- Демо-dropdown с собственной разметкой (`ApiKeySelect`, desktop-меню
  `Navbar`, действия `knowledge/Files` и строк kit-таблицы) подключают тот
  же overlay через демо-адаптер `common/OverlayDropdown.vue`: он передаёт
  атрибуты, `v-model` и слоты в `b-dropdown`, а placement выбирает
  `resolveDropdownPlacement`. Мобильное главное меню `Navbar` и native
  `b-select` остаются без адаптера; Buefy mobile-modal не меняется.
- В src/**/*.vue по умолчанию не допускаются style blocks. Kit-only override
  допустим, если он не является public contract `@iam3xtr/ui`, использует
  ровно один `<style scoped>` и перед ним документирует причину через
  `<!-- kit-style-exception: причина -->`; guard проверяет это правило.
  Все reusable rules добавляются в packages/ui/src/styles/theme.scss.
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
  Sidebar передаёт карточке компактную проекцию активного тарифа: первые три
  доступных лимита в порядке `agents`, `conversations`, `members`, `objects`,
  `collections`, `channels`, `extracted`. Состояния `zero`, `unknown` и `error`
  скрыты; `unlimited` остаётся допустимым. Если доступных лимитов меньше двух,
  показаны только они. Подписи измеренных лимитов сохраняют единицы и статус
  исчерпания без периода, а `progress` и остальные поля берутся из полного
  тарифа. Полные тарифные и usage-представления, как и public API
  `TariffSummaryCard`, не меняются.

- Внизу Sidebar перед `TariffSummaryCard` находится компактный read-only
  provenance `ui <version>` / `vue <version>`. Production и Pages показывают
  exact pins из корневого `package.json`; `npm run dev` дополнительно выводит
  `dev`, потому что Vite исполняет исходники `packages/*/src`, а
  не опубликованные пакеты. Индикатор не является навигацией, контролом
  обновления или заявлением о registry-публикации.

- В полном Navbar действие «Создать агента» по умолчанию скрыто одновременно
  в desktop actions и mobile menu. Переключатель в kit-only Demo panel
  показывает или скрывает оба входа в `agent-wizard`; состояние сохраняется в
  `trickster-demo-state` и сбрасывается вместе с остальными demo-настройками.
  На минимальном Navbar действие и Demo panel отсутствуют. Кнопка открытия
  Demo panel показывает только иконку, сохраняя доступное имя и tooltip;
  она закреплена в 16 px от нижнего и правого краёв viewport поверх экрана.

### Публичные компоненты чата

`ChatHistory` и `MessageComposer` реализованы в package sources
`@iam3xtr/vue` и доступны в `npm run dev` на экранах истории диалога,
песочницы агента, шага Sandbox мастера и `/kit/chat`. Их выпуск и переход
production/Pages сборок на новые exact pins относятся к отдельному этапу.

`ChatHistory` принимает упорядоченные `{ id, text, outgoing }` сообщения.
Текст по умолчанию экранируется; `body`, `metadata`, `status` и `empty` slots
оставляют дополнительную разметку и действия потребителю. `MessageComposer`
держит draft через `v-model` и эмитит только намерение `submit` с trimmed
непустой строкой. Enter отправляет без Shift и вне IME при `!disabled &&
!busy`; Shift+Enter добавляет строку. Отправку, retry, conflict и очистку
draft после успеха выполняет consumer. Placeholder и доступные имена тоже
передаёт consumer.

Тема `@iam3xtr/ui` владеет новыми `tr-chat-history*` и
`tr-message-composer*` selectors. В bounded flex-column history получает
оставшееся место и собственную прокрутку, composer остаётся снизу;
textarea начинается с высоты кнопки, растёт до 100 px и затем прокручивается
внутри. Прежние `tr-conversation-*` и `tr-chat-message` selectors сохраняют
действующий контракт для старых потребителей.

### ModelSelect — жизненный цикл выбора

Демо настроек агента и мастера использует публичный `ModelSelect` из
`@iam3xtr/vue` через consumer-owned adapters каталога. Закрытый trigger
имеет рамку в обычном и BYOK-режиме. Popup начинается у левого края
контрола, перекрывает следующий контент и меняет направление у края
viewport. Поиск и результаты находятся в одном popup; `b-autocomplete`
сохраняет keyboard navigation и выбор. Режимы `model`/`byok`/`both`,
controlled values и consumer-owned copy описаны в `packages/vue/README.md`.
Root build использует опубликованные exact pins из `package.json`;
`npm run dev` подключает исходники пакетов.

Выбранный пункт в открытом списке помечается классом
`tr-model-select__option--selected` и `aria-current="true"` (через
`.tr-model-select__option-marker` справа от названия — текстовый «✓», не
только цвет). Иконки моделей остаются в одном левом столбце.
Marker определяется по canonical `model.id`, а не по display name: имя
BYOK-источника (`provider_model_id`) не устойчиво как ключ, два источника
(`byok_model`/`provider_model_id`) делают выбор mutually exclusive.
Free-form id никогда не получает marker — это не catalog choice.
Buefy-овский dropdown chrome, keyboard navigation, hover, scroll и
`is-hovered` состояние остаются.

Направление и вынос в body portal при обрезающем контейнере определяет
общий overlay (см. раздел о dropdown выше).

Theme rules для marker и option layout живут в `packages/ui/src/styles/
theme.scss` и публикуются вместе с `@iam3xtr/ui`. Component-local
`<style>` блоки запрещены (`npm run guard:no-component-styles`).

### AgentSettings — обратимое очищение BYOK-модели

В форме модели/BYOK-черновика доступно действие «Очистить» рядом с label
BYOK-поля. Оно появляется только при выбранной BYOK-модели в draft —
catalog `byokModel` или свободный `providerModelId` — и снимает только эти
два значения. Обычная `model`, `useOwnApiKey`, `apiKeyId`, сохранённый
агент и key reference не меняются. После очистки `validateModelDraft`
показывает существующую ошибку и блокирует «Сохранить модель и ключ»,
пока BYOK снова не получит модель или пользователь не выключит BYOK.

`Очистить` — отдельный keyboard-reachable `<button>` с собственным
accessible name (текст сам по себе), реализованный как соседний label/action
элемент на header-row над полем, а не внутри `b-field`'s `#label` slot
(Buefy рендерит содержимое этого slot внутри `<label>`, что сломало бы
связь `for=input` и сделало бы button частью label-обёртки). Label
остаётся нативным `<label for="model">`, а `ModelSelect` выставляет
`id="model"` на focusable trigger. `FormErrorSummary` переводит focus на
этот trigger; открытие списка затем переводит его на строку поиска.

`ModelSelect` остаётся обёрнут в `<b-field>` (без `label`-prop) — нужен
исключительно для provide/inject `newType`, чтобы Buefy пропагировал
`is-danger` внутрь `b-autocomplete`'s input так же, как в обычной модели
выше; текст ошибки рендерится через `b-field`'s `:message` slot, поэтому
используется стандартный buefy `.help.is-danger`, а не отдельный
`<p class="help is-danger">`. Только label и clear action вынесены из
`b-field` — сам `b-field` остаётся, чтобы не потерять error-state
propagation.

Строка поиска `b-autocomplete` скрыта, пока список закрыт, поэтому видимый
danger-state несёт сам trigger: `AgentSettings` передаёт в `ModelSelect`
`invalid` (`Boolean(fieldErrors.model)`), и trigger получает `is-danger` и
`aria-invalid="true"`. Theme rule `.tr-model-select__trigger.button.is-danger`
в `@iam3xtr/ui` оставляет нейтральную поверхность кнопки и меняет только
рамку на `--tr-danger`.

Theme rules для новой BYOK-field структуры (`.tr-agent-settings__byok-field`
/ `__byok-field-header` / `__byok-clear` / `__byok-bfield`) живут в
`packages/ui/src/styles/theme.scss` и публикуются вместе с
`@iam3xtr/ui`. Component-local `<style>` блоки запрещены.

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

В операторских каталогах статусы внутри `b-tag` показывают только текст.
Для роли в Users и протокола в Providers сохраняется семантический marker
рядом с текстом: `AdminMarker.vue` использует карту
`src/components/administration/adminMarkers.js`. Неизвестное значение
просто не получает иконку; текст остаётся доступен на desktop и в
`mobile-cards`.

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

`/kit/application-shell` использует опубликованный `Icon` из exact pin
`@iam3xtr/vue`: живые примеры показывают SVG-реестр, Buefy MDI fallback и
placeholder. Полная цепочка slot → реестр потребителя → default-реестр
`@iam3xtr/ui/icons` → Buefy MDI → placeholder приведена рядом как копируемый
код. Установка `trVue` через `@iam3xtr/vue/plugin` показана отдельным
`main.js`-фрагментом; сам UI Kit использует именованные импорты.

## Проверка изменений

    npm run lint:style
    npm run test:unit
    npm run build
    git diff --check

Для изменения пакетов дополнительно используйте их собственные test/pack
проверки и consumer matrix. Поставка и точные registry pins описаны в
[release process](release-process.md).
