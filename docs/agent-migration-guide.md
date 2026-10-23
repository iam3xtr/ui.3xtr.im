# Перенос дизайн-системы Trickster в кабинет

Этот guide описывает действующий контракт для get.3xtr.im. Переносится
анатомия разметки, классы, токены, компоненты и content patterns; API,
fixtures, demo actions и локальная бизнес-логика UI Kit не переносятся.

Кандидат нового copy API и migration/semver gate описаны в
[design-system](design-system.md#consumer-owned-copy-source-candidate-unpublished).
При обновлении проверьте omitted copy props, Toolbar mobile trigger и
ListAsyncState loading name; опубликованные `0.1.4` ещё не изменены.

## Подготовка

1. После публикации проверенной комбинации установите exact версии @iam3xtr/ui и
   @iam3xtr/vue из GitHub Packages согласно
   [release process](release-process.md).
2. Подключите только @iam3xtr/ui/styles/theme.scss или theme.css; не
   используйте локальную копию темы и не подключайте Buefy CSS второй раз.
3. Зарегистрируйте Buefy плагином. `@iam3xtr/vue`'s `Icon` (Issue #8.2) уже
   несёт default-реестр `@iam3xtr/ui/icons` без единого вызова
   `provideIconRegistry` — вызывайте его только чтобы добавить свою иконку
   или переопределить одну из default-записей (например, собственными
   импортами `@iam3xtr/ui/assets/icons/*.svg` через asset-пайплайн
   приложения, например `vite-svg-loader`).
4. Выберите в kit экран с той же ролью и переносите его разметку
   поэлементно, сохраняя имена классов.

Vite aliases из самого UI Kit не являются частью downstream-контракта:
локальный `npm run dev` направляет их на исходники сабмодулей только для
разработки библиотек. В get.3xtr.im и других потребителях импортируйте
опубликованные exact-пакеты `@iam3xtr/ui` и `@iam3xtr/vue` без aliases на
`packages/*`.

## Базовые правила

- Одинаковый визуальный контейнер получает одинаковый tr-* class.
- Сначала используйте Buefy для controls, таблиц, overlays, pagination,
  upload и loading; не создавайте HTML-замены штатным компонентам.
- Не добавляйте component-scoped CSS. Новое общее правило принадлежит
  @iam3xtr/ui и документируется в design-system.
- Не переносите demo stores, simulated delays, fixture records или
  kit-only маршруты.
- При переименовании сохраняйте documented deprecated alias, пока все
  потребители не перейдут на новое имя.

## Паттерны экрана

| Сценарий | Контракт |
| --- | --- |
| Каталог карточек | tr-catalog-grid и единая карточка, ссылка ведёт на detail route. |
| Табличные данные | b-table с явными empty/loading/error состояниями. |
| Загрузка файлов | Явный b-upload picker и FileDropTarget над таблицей/готовой поверхностью как два равноправных входа в один enqueue-путь; FileDropTarget не переносит upload/transport логику. |
| Редактирование в правой форме | FormDrawer: async beforeClose для пользовательского закрытия, встроенный focus entry/trap/return, shell для одной consumer-owned vee-validate Form и width для размера панели. Прямой modelValue не guarded. Busy/disabled блокируют native submit; shell validation/submit и upload close denial принадлежат экрану. Общий host координирует scroll lock вложенного confirmation. |
| Границы оверлеев (эталон — kit `/kit/dialogs-overlays`) | FormDrawer — только редактирование в правой панели с длинным body и fixed footer, не general-purpose панель. Прямой b-sidebar — неформовые панели без формы (свойства, details). b-modal — короткая форма без длинного body и без выделенного fixed footer. b-dialog — только подтверждение действия; не подменяет форму любой длины. |
| Поиск и фильтры | Toolbar family над списком; фильтры не дублируют navigation. |
| Master-detail | Список и detail сохраняют общий workbench; на узком экране есть путь назад. |
| Настройки | tr-settings-panel, явное сохранение и dirty-exit guard. |
| Асинхронные данные | AsyncState или ListAsyncState; partial не маскируется под ready. |
| Подтверждения | b-dialog ясно называет действие и затронутые сущности; не b-modal — модальное окно в этом контракте зарезервировано под короткие формы. |

## Формы, данные и иконки

Ошибки не очищают введённые значения. Первое невалидное поле достижимо
клавиатурой. Pending submit блокирует только повтор этой же операции. Секреты
отображаются маскированно и не записываются в состояние, логи или разметку.

Модель и BYOK выбираются через общий contract: ключ хранится по reference,
не как текст внутри агента. Статусы, квоты, delivery и handoff показывают
причину, последствия и доступное действие, а не только цветной label.

Выбор модели из каталога переносите через публичный `ModelSelect` из
`@iam3xtr/vue` (режимы `model`, `byok`, `both`), а не копированием demo
`src/components/agents/ModelSelect.vue`. Contract режимов (данные и их
подмена по scope, четыре `v-model` связки, free-form BYOK id с
placeholder `{id}` и принятием по Enter, `update:query`,
loading/error/empty copy, slot `byok-key`, a11y) и адаптация
production-формы и текущего demo/production BYOK описаны в README пакета
(`packages/vue/README.md`, раздел «`ModelSelect`: режимы `model`,
`byok`, `both`»): `returnObject`, hidden `name`, auto-select, OpenRouter
filter, permission и хранение ключа компонент не выполняет — их явно
реализует consumer.

Demo selector остаётся UI Kit fixture/reference и не является production
API. Внедрение в `get.3xtr.im` — отдельная задача consumer
`get.3xtr.im#19`, выполняемая после `api.3xtr.im#112`.

Используйте MDI имя из существующего набора. Если MDI-эквивалента нет,
добавьте SVG в @iam3xtr/ui/assets/icons/**, зарегистрируйте его в registry и
обновите этот guide с обоснованием.

## Проверка переноса

Перед merge проверьте, что theme import единственный, peer dependencies
установлены одной согласованной версией, route/keyboard/state/mobile поведение
совпадает с эталоном, а production код не получил fixtures или demo actions.

Пакеты имеют независимые версии. При совместимом style-only patch обновляйте
только UI exact pin и lockfile; Vue pin сохраняйте. При обновлении Vue
проверяйте выбранный UI по его peer range и registry gate. Номера пакетов
не обязаны совпадать. В исходниках Vue navigation поддерживает Router
`^4.6.0 || ^5.0.0`; опубликованный `@iam3xtr/vue@0.1.4` требует Router 4.
Для Router 5 сначала нужен выпуск обновлённого Vue-пакета; overrides не
доказывают совместимость и не заменяют этот выпуск. Полная процедура выпуска и registry validation — в
[release process](release-process.md).

### FormDrawer: guard, фокус и внешняя форма

Контракт ниже доступен в опубликованной паре 0.1.4. Registry-потребитель должен обновить оба пакета до этих точных версий.

Панель использует Buefy Sidebar для поверхности и scroll lock. Каждый пользовательский запрос закрытия — Escape, собственный backdrop, header close или публичный `requestClose(reason?)` через ref/scoped slot — проходит `beforeClose(reason)`. Причины: `escape`, `backdrop`, `close-button`, `programmatic`. Callback может вернуть boolean/Promise; только false, throw или rejection отклоняют запрос. Пока callback ожидается, повторные запросы объединяются; draft и видимость сохраняются. Изменение `modelValue` родителем не проходит guard; устаревший результат после close/reopen/unmount игнорируется. `busy` и `disabled` блокируют native submit, но не закрытие: запрет при загрузке задаёт consumer в guard.

Фокус входит в панель при открытии, Tab/Shift+Tab удерживаются внутри, после фактического закрытия фокус возвращается к существующему trigger. Внешний overlay с `.modal`, `dialog[open]`, `role="dialog"`/`role="alertdialog"` или `aria-modal="true"`, получивший фокус вне drawer, обслуживает собственный Tab. Escape drawer пропускает для событий из `.modal`; произвольные sidebar/dropdown не получают автоматической координации. `useFocusTrap` поддерживает opt-in `immediate` и `contain`; прежние значения по умолчанию сохранены. Вложенные Buefy overlays независимо снимают scroll lock: общий host должен сохранять его, пока нижняя панель открыта. Рабочий пример в UI Kit восстанавливает `html.is-clipped` после закрытия dirty confirmation; это не глобальный lock manager пакета.

Native режим по умолчанию сохраняет один HTML form и событие `submit`, подавляемое при busy/disabled. `shell` включает оболочку для consumer-owned формы (например, vee-validate): package form отсутствует, событие submit пакета не эмитится. Slot `shell` получает `content` — компонент body/footer — и `busy`, `disabled`, `requestClose`. Default/footer slots сохраняются и получают тот же scope. Внешняя форма должна быть прямым ребёнком shell slot; дополнительная обёртка нарушит flex/scroll layout. Validation, блокировка submit в shell, dirty state и API принадлежат consumer. Пакет не зависит от vee-validate.

`width` — CSS length, например `42rem`, передаваемый через `--tr-form-drawer-width`. По умолчанию 420px; тема ограничивает ширину viewport и сохраняет mobile fullscreen. Body прокручивается отдельно от header/footer. Передавайте локализованный `closeAriaLabel`; в source candidate default удалён; опубликованная `0.1.4` сохраняет прежнее поведение.

Пример шаблона (`Form` импортируется consumer из vee-validate, `FormDrawer` — из `@iam3xtr/vue`):

```vue
<FormDrawer v-model="open" shell width="42rem" :before-close="beforeClose"
  :close-aria-label="copy.close">
  <template #shell="{ content }">
    <Form @submit="save"><component :is="content" /></Form>
  </template>
  <Field name="name" :rules="required" />
  <template #footer="{ requestClose }">
    <button type="button" @click="requestClose()">{{ copy.cancel }}</button>
    <button type="submit">{{ copy.save }}</button>
  </template>
</FormDrawer>
```

### Общие стили форм и сообщений

В package sources полной темы добавлены `tr-field__required` и `tr-field__error` (danger token, компактная ошибка), `table.is-borderless` (без рамок, vertical-align middle) и `tr-message-markdown` для consumer-rendered Markdown в body slot ChatHistory. Последний задаёт spacing блоков/списков, перенос длинного текста и горизонтальную прокрутку pre; parsing и sanitization остаются у consumer.

Document overflow по умолчанию `auto`: короткая страница не требует scrollbar, длинная доступна для прокрутки. Overlay lock действует через Buefy/Bulma `is-clipped`/`is-noscroll`; тема не координирует lifecycles нескольких overlays. Sidebar scrollbar gutter сохраняется.

До удаления consumer compat правил подтвердите покрытие установленной новой registry-версией. `tr-table--stack` уже входит в тему; growing composer следует заменить публичным MessageComposer, который управляет высотой сам. `has-border-danger-light` имеет публичный путь через `tr-destructive-zone`. Product-specific provider/Knowledge toolbar/menu selectors, secret toggle и max-w-sm не стали shared contract автоматически; marker `--tr-compat-contract` не является визуальным покрытием. Их решение остаётся у потребителя.

После публикации FilterSelect используйте public core export и styles из
совместимой опубликованной версии UI. Контракт single/multi, copy и keyboard
описан в [design-system](design-system.md#filterselect-implemented-in-sources-unpublished).
Поиск и custom entry включаются отдельно через `searchable` и `allowCustom`.
Передайте search/custom copy, включая accessible name input; query не меняет
selection до явного commit. Unknown selected IDs сохраняются при смене каталога.
До registry acceptance используйте только development reference, не deep imports
и не копирование исходников/CSS. При обновлении также заполните copy props,
перечисленные в Consumer copy contract README Vue: снятие defaults несовместимо
и требует отдельного release/semver решения.
Не заменяйте scalar model_id/provider на arrays без отдельного API-согласования.

## Новые foundations: миграция после публикации

Следующие стили и `ChannelTypeIcon` реализованы в исходниках, но не входят
в опубликованные pins `0.1.4`. Перед переносом дождитесь совместимого релиза,
проверьте registry exact install и production/Pages без source aliases.
Не переносите kit fixtures, lifecycle adapters и in-memory save orchestration.
Публичная anatomy описана в [design-system](design-system.md).

- Settings: используйте `tr-settings__section*` и `tr-property*` внутри текущего
  host без дополнительного frame. Workspace/Profile/Security/Agent/Channel/
  Knowledge/Model/Provider/Tariff сохраняют собственные save boundaries;
  User/AdminWorkspace в kit являются ограниченными references. Реальные
  Settings screens мигрируются отдельно после активации опубликованных стилей.
- Telegram modal: замените whole-panel `overflow:auto` на существующий FormDrawer
  с отдельным scroll body и нескроллируемыми header/footer. Перенесите общие
  Save/Cancel в footer slot. Уберите внутренний Save вложенных Telegram settings
  только если они входят в один draft; независимые PATCH оформляйте отдельными
  ресурсами. Не обещайте их атомарность. Для vee-validate используйте shell без
  вложенного form. Сохраните dirty discard, token write-only, nested-overlay lock,
  errors/retry и focus return. Проверьте 320/360/768/desktop и экранную клавиатуру.
- Actions: primary для Save/Create/Apply, neutral для Edit/Cancel/Close/Back,
  danger для необратимых действий. Примените обычную рамку destructive panel;
  danger title/control и существующие confirmation/permissions сохраняются.
- Dashboard: используйте пары container/`__items` для metric 3/2/1 и recent 2/1.
  Удаляйте consumer `tr-dashboard-recent` и viewport overrides только после
  проверки computed columns по внутренней ширине с sidebar и zoom. Сохраните
  attention queue, отдельные row links и header actions, zero/unknown semantics.
- Summary: переносите `tr-stat*`/`tr-stats*` для read-only LLM/RAG и breakdowns;
  API fetching, aggregation, форматирование, microcredits и RBAC остаются у Get.
- Navbar: замените локальные flex overrides общими стилями, затем проверьте
  Dashboard без tabs, Workspace/Agent tabs, 0/1/N ресурсов и mobile/minimal shell.
- Channel identity: используйте public `ChannelTypeIcon`, consumer label/title и
  opt-in avatars без пустого placeholder. `web`/`widget` — origins одной Web
  публикации; не добавляйте widget provider или неподтверждённый `mail` alias.
  Email/WhatsApp/MAX в kit не означают наличие connector/API enum. MAX использует
  согласованный нейтральный символ, не официальный logo. Проверьте unknown text,
  экземпляр канала, agent/runtime и длинные имена в list/header/context.
- Catalog lifecycle: article + отдельная ссылка и Buefy switch; toggle не должен
  открывать detail. Agent active, Telegram authoritative enabled и Web enabled
  отделены от runtime. Сохраняйте production grants/revisions/readiness,
  confirmation, takeover, public/copy/config actions и stale/retry recovery.
  Разрешённое выключение не блокируется только из-за failed activation readiness.

Уберите development gates кита только после публикации новых exports/styles и
проверки root tests/build/Pages на новых exact pins. Перед удалением consumer
compat CSS подтвердите покрытие установленным package artifact; source build не
является положительной registry-проверкой.
