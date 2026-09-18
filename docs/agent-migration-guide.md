# Перенос дизайн-системы Trickster в кабинет

Этот guide описывает действующий контракт для get.3xtr.im. Переносится
анатомия разметки, классы, токены, компоненты и content patterns; API,
fixtures, demo actions и локальная бизнес-логика UI Kit не переносятся.

## Подготовка

1. После публикации проверенной пары установите exact версии @iam3xtr/ui и
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
| Редактирование в правой форме | FormDrawer над штатным b-sidebar (right/overlay/fullheight); header — title и close, default slot — scrollable body, footer slot — fixed действия. Submit не дублируется во время busy/disabled; FormDrawer не переносит validation, dirty guard или API — это остаётся за экраном. Focus trap/return при закрытии не реализован Buefy для b-sidebar (в отличие от b-modal) — известное ограничение, не компенсируется собственным overlay. |
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

Используйте MDI имя из существующего набора. Если MDI-эквивалента нет,
добавьте SVG в @iam3xtr/ui/assets/icons/**, зарегистрируйте его в registry и
обновите этот guide с обоснованием.

## Проверка переноса

Перед merge проверьте, что theme import единственный, peer dependencies
установлены одной согласованной версией, route/keyboard/state/mobile поведение
совпадает с эталоном, а production код не получил fixtures или demo actions.

При изменении потребляемого пакета обновляйте обе exact зависимости и lockfile
одним PR. Полная процедура выпуска и registry validation — в
[release process](release-process.md).
