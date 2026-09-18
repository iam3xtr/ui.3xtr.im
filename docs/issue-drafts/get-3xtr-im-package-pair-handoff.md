# Черновик: get.3xtr.im issue — обновление package-пары @iam3xtr/ui / @iam3xtr/vue

Статус черновика: **не опубликован**. Публикация в `iam3xtr/get.3xtr.im`
отложена до тех пор, пока `@iam3xtr/ui` и `@iam3xtr/vue` не опубликованы как
immutable exact-версии в `npm.pkg.github.com`. Текущий прогон (`Release.1`)
был **dry run** релизных скриптов (`release:all` без `-Execute` либо без
подтверждённой реальной публикации) — реальный `npm publish` не выполнялся,
поэтому версии из таблицы ниже — placeholder, а не резолвящиеся registry-теги.

Причина отложенной публикации подробно описана в
[`docs/release-process.md`](../release-process.md#версии-и-порядок-публикации):
issue в `get.3xtr.im`, ссылающийся на несуществующие версии/теги/release notes,
создал бы недостижимую задачу и потенциальный дубликат при повторной попытке
после реального релиза. Как только пара опубликована и прошла ручную
registry-проверку из
[`docs/release-process.md`](../release-process.md#перед-продвижением-рекомендуемого-пина-проверка-на-реальном-registry-вручную),
этот файл нужно:

1. Заполнить placeholder-версии, теги и release-note ссылки реальными
   значениями.
2. Опубликовать issue в `iam3xtr/get.3xtr.im` через `gh issue create` (или
   REST) с заголовком и телом ниже.
3. Отметить задачу `Handoff.1` в `.todo` как `review`/`done` и записать
   номер и URL созданного issue.

Ниже — готовые заголовок и тело issue, а также отметка, какие критерии
приёмки из `.todo` (Handoff.1, строки 665–707 на момент постановки задачи)
не могут быть выполнены в этом прогоне.

---

## Заголовок issue

```
Обновить @iam3xtr/ui / @iam3xtr/vue до <UI_VERSION> / <VUE_VERSION> и перенести новые public contracts
```

## Тело issue

```markdown
## Summary

Обновить закреплённую пару пакетов Trickster UI Kit до опубликованных exact
версий и перенести в кабинет только применимые новые public contracts:
FileDropTarget, FormDrawer, `trVue` плагин, Icon/SVG registry, toolbar/mobile
fix, локализованный AsyncState loading label, tariff-card navigation, sidebar
sizing и admin markers.

Источник: `iam3xtr/ui-kit` (trickster-ui-kit) issues ui.3xtr.im #3–#14.
Дубликат среди открытых issues get.3xtr.im проверен на 2026-09-18 — не
найден.

## Package names, versions, compatible peers

| Пакет | Текущая версия у потребителя | Новая версия | Registry |
| --- | --- | --- | --- |
| `@iam3xtr/ui` | `<CURRENT_UI_VERSION>` | `<UI_VERSION>` | `npm.pkg.github.com` |
| `@iam3xtr/vue` | `<CURRENT_VUE_VERSION>` | `<VUE_VERSION>` | `npm.pkg.github.com` |

Compatible peers (см. `packages/vue/package.json`'s `peerDependencies`):

- `vue`: `<VUE_RUNTIME_PEER_RANGE>`
- `vue-router`: `<VUE_ROUTER_PEER_RANGE>` (только если используется
  `@iam3xtr/vue/navigation` или `@iam3xtr/vue/plugin`)
- `buefy`: `<BUEFY_PEER_RANGE>`
- `@iam3xtr/vue`'s `peerDependencies["@iam3xtr/ui"]`: `<VUE_UI_PEER_RANGE>`
  (должен покрывать `<UI_VERSION>`)

Только exact pin в `package.json` get.3xtr.im — никаких диапазонов и
`latest` (см. [release process](../release-process.md#только-точные-версии)).

## Release links

- `@iam3xtr/ui@<UI_VERSION>`: `<UI_RELEASE_URL>` (тег `v<UI_VERSION>` в
  `iam3xtr/ui`)
- `@iam3xtr/vue@<VUE_VERSION>`: `<VUE_RELEASE_URL>` (тег `v<VUE_VERSION>` в
  `iam3xtr/vue`)
- Compatibility table и rollback policy: [docs/release-process.md](../release-process.md#совместимость-и-рекомендуемая-пара)

## Rollback pair

Если после обновления обнаружится несовместимость, откат — это **новая
опубликованная версия**, никогда unpublish уже зарезолвленной (см.
[release process, п.5](../release-process.md#версии-и-порядок-публикации)):

- Известная рабочая пара до этого обновления: `@iam3xtr/ui@<PREVIOUS_UI_VERSION>`
  / `@iam3xtr/vue@<PREVIOUS_VUE_VERSION>`.
- При регрессии зафиксировать в `package.json`/lockfile get.3xtr.im именно
  эту пару одним PR, вместо попытки удалить/переопубликовать новую версию.

## Required downstream work

- [ ] Обновить `package.json` и lockfile на exact `<UI_VERSION>` /
      `<VUE_VERSION>` одним PR.
- [ ] Подключить один theme entrypoint — `@iam3xtr/ui/styles/theme.scss` или
      `theme.css` — и убедиться, что `buefy/dist/css/buefy.css` не
      подключается второй раз.
- [ ] Если используется `./navigation` или `./plugin` — соблюсти порядок
      установки `Router -> Buefy -> trVue` (см. "Migration steps" ниже).
- [ ] Заменить любые временные обходные решения, введённые под отсутствие
      `FileDropTarget`/`FormDrawer` (см. ui.3xtr.im #5/#6) на компоненты
      пакета.
- [ ] Проверить, что Icon/SVG registry precedence не даёт визуальных
      регрессий там, где кабинет уже использовал MDI-имена, совпадающие с
      именами из `@iam3xtr/ui/icons`.
- [ ] Перенести локализованный loading label для `AsyncState`/`ListAsyncState`
      (компонент не содержит собственной locale — см. "Migration steps").
- [ ] Обновить навигацию tariff-card на `TariffSummaryCard` из
      `@iam3xtr/vue/navigation` с проп `to`, указывающим на реальный route
      кабинета (не хардкод из старой копии).
- [ ] Сверить sidebar sizing (232px, ellipsis для длинных label, `title`
      tooltip) с текущей реализацией sidebar в get.3xtr.im.
- [ ] Если в get.3xtr.im есть операторские каталоги с тем же role/status/
      protocol контрактом — перенести admin markers (`AdminMarker`-подобный
      helper) как decorative-иконку, не замену текста.

## Optional adoption

- `trVue` plugin как единая точка регистрации всех `tr-*` глобалов —
  альтернатива именованным импортам; используйте, только если bundle-size
  по отдельным компонентам не критичен для этого экрана/чанка.
- `useFocusTrap` для оверлеев, где принимающий Buefy-компонент (например,
  `b-sidebar`, использующийся внутри `FormDrawer`) не возвращает фокус на
  triggering элемент при закрытии.
- Расширение реестра иконок через `provideIconRegistry` только для
  собственных иконок get.3xtr.im или переопределения конкретной
  default-записи — не обязательный шаг сам по себе.

## Non-goals

- Kit-only auth `flat` prop, dashboard attention queue и GitHub Pages
  devtools mode — приведены как reference evidence (см. ui.3xtr.im #9, #13,
  #14) и **не переносятся** как обязательный scope.
- Никакой API-клиент, реальная авторизация, persistence, секреты, RBAC или
  бизнес-правила не переносятся из UI Kit — он остаётся reference
  implementation.
- Fixture/demo state, in-memory Pinia stores и kit-only маршруты не
  переносятся.
- Изменение поведения API get.3xtr.im не входит в эту задачу.

## Package-to-screen mapping

| Public contract | Источник (ui.3xtr.im) | Экран(ы) get.3xtr.im, где применимо |
| --- | --- | --- |
| `FileDropTarget` | #5 | Экраны с загрузкой файлов над таблицей/списком (`<TARGET_SCREEN_UPLOAD>`) |
| `FormDrawer` | #6 | Экраны редактирования в правой панели (`<TARGET_SCREEN_EDIT_DRAWER>`) |
| `trVue` plugin | #7 | Application shell / bootstrap (`<TARGET_ENTRYPOINT>`), опционально |
| Icon / SVG registry (`@iam3xtr/ui/icons`, `Icon`) | #8 | Везде, где сейчас используется `b-icon` с MDI-именами, пересекающимися с default-реестром |
| Toolbar/mobile filters fix | #? (toolbar/mobile fix из ui.3xtr.im) | Экраны со списком + `Toolbar`/`MobileFilters` (`<TARGET_SCREEN_TOOLBAR>`) |
| Локализованный AsyncState loading label | связано с #4/#11 | Любой экран, использующий `AsyncState`/`ListAsyncState` с `variant="loading"` |
| Tariff-card navigation (`TariffSummaryCard`) | связано с navigation entrypoint | Sidebar / dashboard tariff summary (`<TARGET_SCREEN_TARIFF>`) |
| Sidebar sizing | #10 | Общий application shell sidebar |
| Admin markers | #12 | Операторские каталоги, если они существуют в get.3xtr.im (`<TARGET_SCREEN_ADMIN_CATALOGS>`) |

`<TARGET_SCREEN_*>` — заполнить конкретными путями/route-именами
get.3xtr.im при заполнении черновика перед публикацией; это единственная
причина, требующая доступа к репозиторию get.3xtr.im, а не к UI Kit.

## Migration steps

1. **Один theme import.** Подключить `@iam3xtr/ui/styles/theme.scss` (или
   `theme.css`) один раз в точке входа приложения; удалить любую локальную
   копию темы/токенов, если она была временно скопирована для инспекции.
2. **Порядок Router → Buefy → trVue**, если используется `trVue`:
   ```js
   app.use(router); // до trVue — trVue регистрирует PageHeader/NavbarTabs/TariffSummaryCard
   app.use(Buefy);   // до trVue — пакет сам Buefy не регистрирует
   app.use(trVue);   // порядок обязателен
   ```
   Альтернатива — **named imports** без `trVue`: `import { FileDropTarget, FormDrawer, ... } from "@iam3xtr/vue"`
   и `import { PageHeader, NavbarTabs, TariffSummaryCard } from "@iam3xtr/vue/navigation"`
   там, где важен bundle-контроль по отдельным компонентам; `./navigation`
   требует установленный Vue Router, core-вход (`.`) — нет.
3. **Правила SVG registry / Buefy fallback.** Порядок резолва `Icon`:
   непустой default slot → `provideIconRegistry`-реестр потребителя →
   default-реестр `@iam3xtr/ui/icons` → глобальный `BIcon` (MDI fallback,
   только если `app.use(Buefy)` вызван) → aria-hidden placeholder. Вызывать
   `provideIconRegistry` только для собственных иконок get.3xtr.im или
   переопределения конкретной default-записи — не обязательный шаг.
4. **Component props/slots/events**, которые нужно учесть при переносе
   разметки (полные таблицы — в
   [`packages/vue/README.md`](https://github.com/iam3xtr/vue/blob/main/README.md#компоненты-core)
   опубликованного пакета, версия `<VUE_VERSION>`):
   - `FileDropTarget`: `disabled`, `multiple` (default `true`), `accept`
     (client-only hint), `overlayLabel`; событие `files` (`File[]`, только
     на реальном drop). Не переносит upload/progress/retry/cancel/API —
     оба входа (drop и явный `b-upload` picker) должны продолжать
     передавать `File[]` в один и тот же enqueue-путь экрана.
   - `FormDrawer`: `v-model` (обязателен), `title`, `busy`, `disabled`,
     `closeAriaLabel`; события `update:modelValue`, `submit` (не эмитится
     во время `busy`/`disabled`); слоты default (form body, scoped
     `{ busy, disabled }`) и `footer` (actions, тот же scope). Валидация,
     dirty guard, API и draft model остаются за экраном — компонент их не
     реализует.
   - `TariffSummaryCard`: `tariff` (обязателен), `label` (default
     `"Тариф"`), `to` (опционально — без него рендерится `div`, с ним —
     `RouterLink`); указать реальный route get.3xtr.im через `to`, не
     хардкодить внутри компонента.
   - `Icon`: `name`/`icon` (синонимы, `name` побеждает при конфликте),
     `size` (default `24`); непустой default slot — full escape hatch.
5. **Удаление временных workaround.** Убрать любые самодельные dropzone-
   wrapper'ы или ad hoc right-панели, введённые в get.3xtr.im до появления
   `FileDropTarget`/`FormDrawer` (ui.3xtr.im #5/#6), и заменить их
   компонентами пакета без изменения enqueue/API-контракта экрана.
6. **Buefy fallback.** Убедиться, что `app.use(Buefy)` вызывается один раз
   до `trVue` (если используется) — без него `Icon` просто пропускает шаг
   MDI fallback, что допустимо, но должно быть осознанным решением, а не
   случайным пропуском.
7. **Локализованный AsyncState loading label.** `AsyncState`/`Loader` не
   несут собственной locale — передавайте `title`/`message`
   (для `variant="loading"` они становятся accessible `label` внутреннего
   `Loader`, `title` в приоритете) переведёнными строками из существующих
   locale-словарей get.3xtr.im.

## Acceptance matrix

| Область | Критерий |
| --- | --- |
| Install/build | `npm install` резолвит ровно exact `<UI_VERSION>`/`<VUE_VERSION>` без диапазонов; `npm run build` (или эквивалент get.3xtr.im) проходит без warnings о дублирующемся Vue/Buefy runtime. |
| Routes | `TariffSummaryCard`/`PageHeader`/`NavbarTabs` продолжают вести на существующие route get.3xtr.im; ни один захардкоженный kit-only route не появился. |
| Keyboard/a11y | `FormDrawer` open/close по Escape и backdrop-click работают через `b-sidebar`; фокус после close возвращается через `useFocusTrap`, если экран требует focus trap. `Icon` fallback-placeholder — `aria-hidden`. `AsyncState` loading label — accessible name у `Loader`, не декоративный текст. |
| Mobile/theme | `Toolbar`/`MobileFilters` не дублируют inline filters видимо на <=768px; тема переключается `data-theme=light/dark` без второй копии CSS. |
| Icon fallback | Совпадение имени между `@iam3xtr/ui/icons` и MDI не даёt визуальной регрессии — SVG всегда выигрывает; конфликт `name`/`icon`/slot логируется `console.warn`, не ломает рендер. |
| Rollback | Обратный переход на `<PREVIOUS_UI_VERSION>`/`<PREVIOUS_VUE_VERSION>` одним PR восстанавливает предыдущее поведение без unpublish. |

## Explicitly excluded (kit-only)

- ui.3xtr.im #9 (AuthPage `flat` prop) — kit-only reference evidence.
- ui.3xtr.im #13 (Dashboard attention queue) — kit-only reference evidence.
- ui.3xtr.im #14 (GitHub Pages Vue Devtools mode) — kit-only, не влияет на
  production build ни кита, ни get.3xtr.im.
- Любые изменения API-поведения, fixtures или demo state UI Kit.

## Links

- ui.3xtr.im #3–#14 (полный список источников этого обновления)
- [docs/release-process.md](../release-process.md) — release/rollback policy
- [docs/design-system.md](../design-system.md) — визуальный контракт
- [docs/agent-migration-guide.md](../agent-migration-guide.md) — перенос
  анатомии экрана
```

---

## Критерии приёмки Handoff.1 — что выполнимо в этом прогоне

Из `.todo` (Handoff.1, критерии приёмки):

- ✅ **Выполнимо без реальной публикации**: подготовлен полный черновик
  заголовка и тела issue со всеми требуемыми разделами — package names,
  versions-placeholder, compatible peers, release links (placeholder),
  rollback pair, required/optional/non-goals, package-to-screen mapping,
  migration steps, acceptance matrix, explicit exclusion #9/#13/#14.
- ❌ **Невыполнимо в этом прогоне** (требует реальной публикации пары в
  npm registry, которой не было — `Release.1` был только dry run):
  - «В get создан один non-duplicate issue с точными released versions...» —
    issue не создавался; версии в черновике — placeholder, не резолвящиеся
    номера.
  - Release links, ведущие на реальные GitHub Releases/теги `iam3xtr/ui` и
    `iam3xtr/vue` — такие теги/релизы ещё не существуют.
  - Acceptance criteria, зависящие от установки пакета из реального
    registry (install/build проверка из acceptance matrix) — не
    прогонялись против реального `npm.pkg.github.com`, только
    задокументированы как то, что нужно проверить после публикации.

Дальнейшее действие: как только `Release.1` (или последующий релизный
прогон) завершится реальной публикацией exact-пары и пройдёт ручную
registry-проверку из `docs/release-process.md`, заполнить placeholder-поля
в этом файле реальными версиями/ссылками/route-путями get.3xtr.im и
опубликовать issue текстом из раздела «Тело issue» выше через
`gh issue create --repo iam3xtr/get.3xtr.im`.
