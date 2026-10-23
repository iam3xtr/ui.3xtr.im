# Релизный процесс `@iam3xtr/ui` и `@iam3xtr/vue`

Единственное нормативное описание того, как версии `@iam3xtr/ui` и
`@iam3xtr/vue` выпускаются, тестируются и — при необходимости — откатываются.
[`packages/ui/README.md`](../packages/ui/README.md), [`packages/vue/README.md`](../packages/vue/README.md) и
[`packages/consumers/README.md`](../packages/consumers/README.md) ссылаются
сюда, а не дублируют текст; сами workflow-файлы несут только короткие
указатели на этот документ.

Оба пакета — публичные npm-пакеты в GitHub Packages (`npm.pkg.github.com`),
подключённые в этом репозитории как pinned Git submodules `packages/ui` и
`packages/vue` (см. [`REPO.md`](../REPO.md)).
Сам UI Kit публикацией не занимается — он только их первый потребитель.

## Версии и порядок публикации

У каждого пакета собственные версия, immutable tag и changelog. Номера UI и
Vue не обязаны совпадать. `package.version`, UI peer interval Vue,
`.ui-compat-ref` и проверенная consumer-комбинация — разные значения.

Для разработки/build/test/pack нужны Node 24 LTS (последний security patch,
минимум 24.15.0) и npm 11. Эта политика закреплена в `devEngines` корня и
пакетов; library runtime minimum отдельно не повышается до Node 24.

```powershell
# Read-only preview; обе target-версии и peer decision.
npm run release:all

# Независимый совместимый UI patch, Vue остаётся прежним.
npm run release:ui -- -Execute

# Vue использует уже опубликованный UI; версия — пример, не рекомендация.
npm run release:vue -- -UiVersion 0.1.6
npm run release:vue -- -UiVersion 0.1.6 -Execute

# Coordinated release: каждый target вычисляется из своего manifest.
npm run release:all -- -Execute

# Новый обязательный UI-контракт: только после compatibility review.
npm run release:all -- -Bump minor -RaisePeerFloor
npm run release:all -- -Bump minor -RaisePeerFloor -Execute

# Текущие manifest-версии без bump.
npm run release:all -- -ReleaseCurrent -Execute

# Prerelease может потребовать явного нового peer floor после review.
npm run release:all -- -Alpha -RaisePeerFloor
```

`-UiVersion` применим только к Vue; без него выбирается версия из UI
checkout. Она должна быть опубликована и попадать в caret peer interval
Vue. Скрипт проверяет registry version и immutable UI tag/manifest, затем
записывает SHA этого тега в `.ui-compat-ref`. Произвольный checkout HEAD
не используется как provenance.

По умолчанию UI peer minimum сохраняется в Vue-only и coordinated release.
Если новая UI-версия вне диапазона, coordinated release отклоняется до UI
publication. `-RaisePeerFloor` разрешён для `vue` и `all` только при
доказанной зависимости от нового CSS/token/export-контракта; он никогда
не понижает минимум. Prerelease UI не входит в обычный stable caret range.

UI-only не меняет Vue manifest, lockfile, tag, SHA или compatibility ref.
Vue-only может использовать более старый опубликованный UI внутри peer
range. Перед выполнением отдельно проверьте, что root UI exact pin
удовлетворяет peer range нового Vue: Vue-only sync меняет только Vue pin.
При необходимости сначала выполните проверенный UI rollout.

### Автоматическое обновление UI Kit после публикации

Успешная команда с `-Execute` после публикации обновляет **текущий checkout**
UI Kit: выставляет опубликованную точную версию соответствующего пакета в
корневом `package.json` и пересобирает `package-lock.json`. Release-коммиты
пакетов меняют также локальные gitlink SHA `packages/ui`/`packages/vue`.
`release:all` обновляет оба exact pin после успешной публикации обоих пакетов; отдельный
`release:ui` или `release:vue` обновляет только свой pin.

UI Kit может оставаться на рабочей ветке с прежними опубликованными pins до
релиза пакетов. Скрипт не требует для него `main` или синхронизации с
`origin/main` и не коммитит/не пушит изменения UI Kit. Перед выпуском он
проверяет, что `package.json` и `package-lock.json` не содержат локальных
правок: эти файлы будут пересозданы после публикации. Остальные изменения
UI Kit сохраняются. Обычный порядок работы:

1. Закоммитить функциональные изменения в `packages/ui` и `packages/vue`, затем
   перенести их на `main` соответствующих репозиториев и синхронизировать с
   `origin/main`.
2. Оставить UI Kit на рабочей ветке с интеграционными изменениями и прежними
   exact pins. Запустить `release:all` сначала без `-Execute`.
3. После полного pre-release gate запустить `release:all -- -Execute`. Скрипт
   публикует UI, затем Vue и обновляет локальные pins/lockfile/gitlinks UI Kit.
4. Проверить демо на опубликованных exact versions, затем отдельным коммитом
   зафиксировать pins, lockfile и gitlinks в рабочей ветке UI Kit. Пуш и merge
   UI Kit остаются операторскими действиями.

Если UI опубликован, а Vue release упал, coordinated release сохраняет root
pins без изменений до успешного Vue. После успеха обновляет их вместе,
чтобы не оставить root со старым Vue и несовместимым новым UI. При
прерванном sync опубликованные версии и теги не откатываются; используйте
resume с прежними параметрами. Он разрешает только изменения root pins и
связанных записей lockfile, а посторонние dependency edits блокирует.

### Доступ CLI к GitHub Packages

Проверка Vue-релиза читает UI-пакет из npm registry. Один раз создайте
**classic PAT** с `read:packages`, предоставьте его владельцу read-доступ к
пакету и, если организация требует SSO, авторизуйте token для организации.
GitHub Packages для npm требует этот token и для публичного пакета. Не
сохраняйте его в репозитории или проектном `.npmrc`; добавьте в
`%USERPROFILE%\.npmrc` только на рабочей машине:

```ini
@iam3xtr:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_CLASSIC_PAT
```

Проверить настройку без публикации можно так:

```powershell
npm view @iam3xtr/ui@0.1.4 version --registry=https://npm.pkg.github.com
```

`E401` означает, что PAT отсутствует, истёк или не имеет требуемых package
permissions. `E403` при `npm login` не подтверждает вход: не используйте этот
endpoint как способ настройки. GitHub Packages для npm требует classic PAT;
`gh auth login` сам по себе npm не аутентифицирует. Подробности — в [документации GitHub Packages для npm](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

По умолчанию команды используют patch; для minor или major укажите
-Bump minor либо -Bump major. Каждая команда требует чистый и синхронный main
у выпускаемых submodules, неизменённые root `package.json` и
`package-lock.json`, GitHub CLI с авторизацией и настроенный environment
release. `release:all` выпускает UI первым; перед Vue обновляет
его закреплённый UI SHA; peer range меняется только с `-RaisePeerFloor`. После UI publish не выполняется
автоматический rollback: если Vue release не завершился, UI версия остаётся
неизменяемым релизом.

Switch -ReleaseCurrent не меняет номер и предназначен для выпуска уже
подготовленной версии, например первой пары 0.1.1. Вместе с -Alpha он
превращает текущую стабильную версию в prerelease с суффиксом -alpha.

Switch -Alpha поддерживается только вместе с patch и добавляет к следующей
patch-версии prerelease suffix -alpha. Каждый пакет получает собственную
версию и тег вида vX.Y.Z-alpha; равенство номеров не требуется.

Switch `-Beta` работает симметрично `-Alpha`: с `-ReleaseCurrent` добавляет
к текущей стабильной версии суффикс `-beta`, без него — к следующей patch
версии. `-Alpha` и `-Beta` взаимоисключающие; оба поддерживаются только с
patch bump.

Prerelease публикуется с npm dist-tag из первого идентификатора суффикса:
версии X.Y.Z-alpha и X.Y.Z-alpha.1 получают tag alpha. Стабильный релиз
публикуется без явного dist-tag и сохраняет обычную registry-политику.

### Чистый main, атомарный push и восстановление

Требование «чистый и синхронный `main`» относится только к выпускаемым
пакетам и действует как **preflight** перед созданием release-коммита. После успешного
preflight скрипт меняет `package.json`/lockfile, создаёт отдельный
`chore(release): vX.Y.Z` commit и annotated tag. Это штатная короткая фаза,
когда локальный `main` опережает `origin/main` до push.

Для нового релиза скрипт отправляет `main` и tag через
`git push --atomic`: GitHub либо принимает оба ref, либо не принимает ни
один. Это исключает обычное удалённое состояние «release-коммит без тега».
Пара пакетов всё равно не является атомарной между репозиториями: сначала
публикуется UI, затем Vue.

Если процесс прервался после локального release-коммита/tag или во время
push, **не запускайте новый bump** и не удаляйте/recreate tag. После проверки
ошибки сети, branch policy или environment approval используйте resume для
того же пакета:

```powershell
npm run release:ui -- -Resume -Execute
# либо, если Vue release-commit/tag уже были созданы:
npm run release:vue -- -Resume -Execute
```

`-Resume` не вычисляет новую версию и не меняет файлы уже начатого
package-релиза. Нужны clean `main`, локальный annotated tag
`v<package.json.version>` ровно на `HEAD`, отсутствие новых commits на
`origin/main` и отсутствие одноимённого remote tag на другом commit.
Скрипт допушивает недостающий ref и проверяет workflow. Неизменяемые теги
не удаляются, не пересоздаются и не force-push'ятся.

Для Vue повторяйте выбранный `-UiVersion`; committed peer range и
`.ui-compat-ref` должны соответствовать этому UI tag. Для coordinated
release повторяйте исходные bump/prerelease/`-RaisePeerFloor` flags:

```powershell
npm run release:all -- -Resume -Execute
# Для исходного minor release с новым UI-контрактом:
npm run release:all -- -Bump minor -RaisePeerFloor -Resume -Execute
```

Если Vue tag на HEAD и compatibility ref относятся к UI этого выпуска,
resume продолжает именно эту Vue-версию. Если Vue ещё не начинался,
после UI verification запускается Vue release с собственным target,
вычисленным по исходным flags. Отсутствие тега при уже созданном локальном
release-коммите требует ручного восстановления: clean/sync guard остановит
запуск, не создавая ещё один bump.

Нет атомарной multi-package registry-транзакции — каждый `npm publish`
независим. Безопасный порядок:

1. **Сначала публикуется `@iam3xtr/ui`.** Прогнать полный набор тестов
   (`npm test`), убедиться в корректном version bump, затем `npm publish`.
2. **Только затем публикуется `@iam3xtr/vue`** — его
   `peerDependencies["@iam3xtr/ui"]` должен уже покрывать версию,
   опубликованную на шаге 1.
3. **Если шаг 1 прошёл, а шаг 2 упал или отложен** (упавший CI, ревьюер
   держит PR `@iam3xtr/vue`, истекли креды в середине релиза): только что
   опубликованная версия `@iam3xtr/ui` не откатывается — это валидный,
   самостоятельный релиз (`@iam3xtr/ui` не зависит от `@iam3xtr/vue`).
   Рекомендация новой комбинации продвигается только после её registry и
   compatibility gate. Для совместимого style-only UI patch этот gate
   проверяет новый UI с прежним Vue: новая публикация Vue не нужна.
   Для coordinated release не объявляйте непроверенный частичный результат
   готовой комбинацией. Старые exact pins потребителей остаются прежними.
4. **Если `@iam3xtr/vue` опубликован, но позже оказался несовместим** с той
   версией `@iam3xtr/ui`, для которой он выпущен: публикуется новая
   patch/minor версия `@iam3xtr/vue` с исправлением — никогда не
   перезаписывать и не unpublish'ить уже опубликованную версию (registry и
   так откажет в повторной публикации той же версии). Таблицу рекомендуемой
   пары обновить на исправленную версию. Потребители на сломанной версии
   откатываются, закрепив в своём lockfile предыдущую известную рабочую
   версию `@iam3xtr/vue` — это обычный даунгрейд зависимости, а не действие
   на стороне registry.
5. **Откат никогда не означает unpublish.** Опубликованная версия считается
   постоянной, как только её мог установить реальный потребитель. «Откат»
   всегда означает: опубликовать новую исправленную версию и сдвинуть
   рекомендацию (эта таблица + downstream lockfile'ы) вперёд или назад на
   другую точную версию — никогда не удалять версию из-под того, кто её уже
   зарезолвил.

## Совместимость и проверенные комбинации

Текущие опубликованные exact pins UI Kit: `@iam3xtr/ui@0.1.4` и
`@iam3xtr/vue@0.1.4`. Обновлённые source peers/toolchain не означают новый
registry-релиз или рекомендацию новых consumer pins.

| UI | Vue | Контракт |
| --- | --- | --- |
| `0.1.4` | `0.1.4` | Текущие опубликованные pins демо. |
| `>=0.1.4 <0.2.0` | конкретный Vue с UI peer `^0.1.4` | Допустимый UI peer interval; каждую рекомендуемую exact комбинацию проверяют отдельно. |
| `<0.1.4` или `>=0.2.0` | Vue с UI peer `^0.1.4` | Вне peer interval; не устанавливать с force/overrides. |

Peer interval берётся из конкретной версии Vue; он не выводится из номера
Vue и не является consumer dependency spec. Совместимый UI patch не требует
поднять Vue minimum. Несовместимое изменение CSS/DOM/tokens/assets или
смена UI minor line на `0.x` требует отдельного semver/compatibility review.

Source Vue navigation допускает Router `^4.6.0 || ^5.0.0`; опубликованный
Vue `0.1.4` допускает только Router 4. Поэтому root пока использует Router 4,
а Router 5 проверяется через candidate tarballs. После публикации обновлённого
Vue нужен отдельный exact-pin rollout; Get/Chat меняются в своих репозиториях.

## Перед продвижением «Рекомендуемого пина»: проверка на реальном registry (вручную)

Всё, что доказывает `packages/consumers/scripts/run-matrix.mjs` (см.
[`packages/consumers/README.md`](../packages/consumers/README.md#фикстуры--сценарии)),
проверяется против локально собранных или явно переданных `npm pack`-тарболов, а не
против реальной опубликованной registry-комбинации — это осознанное ограничение: в
окружении, где выполняется эта матрица, нет write-кредов, поэтому и
реальной публикации нет. Поведение тарбола и поведение registry-инсталляции
могут различаться так, как проверка только тарбола не поймает
(рассинхронизация `.npmignore`/`files` между тем, что упаковано в CI, и тем,
что реально резолвит потребитель; неверный `publishConfig`/scope; registry
отдаёт закэшированную предыдущую версию). Поэтому матрица тарболов —
необходимое, но не достаточное условие: **прежде чем переносить строку
«Рекомендуемый пин» выше на новую опубликованную пару, тот, у кого есть
реальные `packages:read`-креды на `@iam3xtr/ui`/`@iam3xtr/vue`, обязан
вручную один раз прогнать этот чек-лист против настоящего registry:**

1. В отдельной директории вне любого checkout этого репозитория и
   сабмодулей библиотек (чтобы не было `file:`/workspace fallback, который
   маскирует реальный сбой резолва):
   ```bash
   mkdir /tmp/registry-pair-check && cd /tmp/registry-pair-check
   npm init -y
   npm install "@iam3xtr/ui@<точная-версия-ui>" "@iam3xtr/vue@<точная-версия-vue>" \
     --registry https://npm.pkg.github.com
   ```
   Использовать именно те *точные* версии, которые предлагаются в качестве
   нового «Рекомендуемого пина», — никогда диапазон или `latest`. Уже этот
   шаг доказывает, что пара чисто устанавливается из registry при реальном
   доступе `packages:read` — без git clone, без пути к тарболу, без
   локального sibling-checkout.
2. Вручную повторить проверку `fixtures/spa`: установить `vue`/`vue-router`/
   `buefy` версий из `package.json` этой фикстуры, импортировать core- и
   `./navigation`-входные точки обоих пакетов, смонтировать тривиальное
   приложение и убедиться, что сборка включает ровно один рантайм Vue (то же
   утверждение, что делает `verifySpa()` для установки из тарбола).
3. Вручную повторить проверку `fixtures/ssr-hydration`: server-render того
   же тривиального приложения через `@vue/server-renderer` (без обращения к
   `window`/`document`), затем гидратировать полученную разметку в `jsdom` и
   убедиться, что предупреждение о hydration mismatch не появляется.
4. Повторить Chat SPA/iframe browser smoke: initial/light/dark/auto themes,
   смена системной темы, независимая тема host, 320/360 и desktop/tablet,
   длинная история с видимым composer, Tab/Enter и assets. Generic SSR
   остаётся отдельным library gate, не проверкой Nuxt Chat.
5. После успешных проверок зафиксировать проверенную exact комбинацию и
   обновить только необходимые consumer pins вместе с lockfile. Peer minimum
   Vue не менять ради рекомендации: он меняется в release только при новом
   обязательном UI-контракте. Style-only rollout может оставить Vue pin прежним.

Этот шаг сейчас ручной и не выполняется в CI. Если/когда это станет
повторяемым, автоматизируемым шагом (появятся реальные релизы и
credentialed CI runner) — автоматизируйте этот gate, а не пропускайте его.

## CI и release workflow

Каждый библиотечный репозиторий (`iam3xtr/ui`, `iam3xtr/vue`) несёт два
GitHub Actions workflow, а собственный `deploy-pages.yml` UI Kit'а расширен
соответственно.

- **`ci.yml`** (оба библиотечных репозитория): запускается на каждый push в
  `main` и на каждый pull request. Только `permissions: contents: read` — он
  никогда не запрашивает `packages:write`. Шаги: `npm ci` → lint (только ui)
  → build (только ui) → `npm test` → `npm pack --dry-run`. Перед установкой
  Vue его workflow отдельно выполняет `npm ci` и `npm run build` в pinned UI:
  экспорт `@iam3xtr/ui/icons` указывает на генерируемый `dist/icons.js`,
  которого нет в чистом git checkout. `package.json`
  пакета `iam3xtr/vue` объявляет `"@iam3xtr/ui": "file:../ui"` как
  devDependency (та же submodule-sibling раскладка, что использует этот kit
  под `packages/`); у самостоятельного клона `iam3xtr/vue` такого соседа
  нет, поэтому `ci.yml`/`release.yml` там сначала выкачивают `iam3xtr/ui` в
  соседнюю директорию `ui/` — закреплённый на SHA-коммите, записанном в
  `packages/vue/.ui-compat-ref` (однострочный закоммиченный файл), а не на
  движущейся default-ветке `iam3xtr/ui`. Благодаря этому повторный прогон
  проверок того же коммита `vue` всегда тестирует ровно ту пару, против
  которой он был верифицирован. `.ui-compat-ref` записывает проверенный immutable UI commit
  независимо от peer minimum; обновление ref не требует повышения minimum. Когда появятся реальные
  registry-релизы, предпочтительно указывать эту devDependency на
  опубликованную версию вместо sibling-checkout вовсе — это отслеживается
  как follow-up, не требуется для текущего контракта.
- **`release.yml`** (оба библиотечных репозитория): срабатывает только на
  запушенный тег `vX.Y.Z` (либо на явный `workflow_dispatch` для повторного
  прогона существующего тега) — push в `main` сам по себе никогда не
  публикует, и никакой другой ref не доходит до шага публикации. Джоба
  `release` выполняется под GitHub `environment: release` (настроить в
  Settings → Environments каждого репозитория required reviewers, чтобы
  каждую публикацию в registry подтверждал человек) и это единственное
  место, где любой из workflow запрашивает `permissions: packages: write` —
  любая другая джоба/workflow остаётся на `contents: read`. Джоба
  перезапускает полный набор тестов, затем — два guard'а перед
  `npm publish`:
  1. **Тег ≡ версия** — запушенный тег должен точно равняться `v` +
     `version` из `package.json`, иначе джоба падает с понятной
     диагностикой. Это политика неизменности версии: релиз идентифицируется
     тегом, который может описывать только одно конкретное, уже
     протестированное состояние `package.json`.
  2. **Guard «уже опубликовано»** — `npm view <name>@<version>` против
     `npm.pkg.github.com`; если эта версия уже резолвится, джоба падает до
     попытки `npm publish` (registry и так откажет в повторной публикации
     той же версии, но так ошибка явная и actionable, а не непрозрачный сбой
     публикации). Исправление плохого релиза всегда означает bump на новую
     версию и новый тег — см. «Версии и порядок публикации» выше; никогда —
     удаление тега и повторную публикацию того же номера версии.

## Разграничение доступа по кредам

Два разных секрета, ни один из которых никогда не попадает в
`.gitmodules`, `.npmrc`, лог workflow или артефакт сборки:

- **`GITHUB_TOKEN`** (встроенный токен на запуск) — используется только
  внутри джобы `release` из `release.yml`, подключается в одноразовый
  `.npmrc` через input `registry-url` у `actions/setup-node` посредством
  переменной окружения `NODE_AUTH_TOKEN`, ограничен пакетом только этого
  репозитория. `ci.yml` никогда не задаёт `registry-url` и не трогает этот
  токен.
- **Публичный UI checkout** — `iam3xtr/ui` доступен публично, поэтому
  sibling-checkout в `iam3xtr/vue` не использует отдельный Actions secret:
  ни `ci.yml`, ни `release.yml` не требуют `CROSS_REPO_READ_TOKEN`. Они всё
  ещё checkout'ят точный SHA из `.ui-compat-ref`, а не движущуюся ветку.
  Если UI-репозиторий когда-либо станет приватным, верните отдельный
  read-only token с доступом только к `iam3xtr/ui`; не расширяйте для этого
  `GITHUB_TOKEN` или `packages:write`.
- **Потребители** (`get.3xtr.im` и любой другой downstream-проект) получают
  `packages:read`, выданный явно, по каждому из двух опубликованных
  пакетов отдельно — никогда не blanket org-wide грант и никогда не
  `packages:write` — этот scope зарезервирован только за двумя релизными
  джобами выше. Настройка этого потребительского доступа выполняется в
  репозитории каждого потребителя.

**Диагностика отказа доступа.** Недостаточно scoped грант `packages:write` у
`GITHUB_TOKEN` роняет `npm publish` с
`403 Forbidden` от registry. Оба сценария отказа реально воспроизводятся —
без нужды в настоящих write-кредах — через `fixtures/peer-mismatch` и два
script-only registry-сценария (реальный registry отклоняет плохую
версию/недоступный пакет так же, как это сделал бы недостаточно scoped
токен); воспроизвести именно 403 от `packages:write` нужно реальным
прогоном workflow с намеренно urezanным токеном — это операционная проверка
для того, кто администрирует секреты этих репозиториев, а не то, что этот
набор фикстур может сделать без write-кредов.

**Чего этот процесс не делает.** Ни один workflow здесь не выполняет
реальную публикацию в registry в рамках CI/тестов (то же ограничение, что и
у остального содержимого `packages/consumers/`). Настройка
required reviewers у окружения `release` и потребительских грантов
`packages:read` — разовые административные действия
в настройках репозиториев и организации github.com/iam3xtr; они
задокументированы здесь для того, у кого есть admin-доступ, а не выполняются
этим кодом. Передача пакетов вниз по цепочке в `get.3xtr.im` происходит в
  после того, как реальная пара опубликована; переход каждого потребителя
  выполняется отдельным согласованным изменением.

## Только точные версии

Потребители закрепляют **точные версии** обоих пакетов (сейчас
`"@iam3xtr/ui": "0.1.4"`, не `"^0.1.4"` и не `"latest"`) и коммитят
получившийся lockfile вместе с изменёнными pins. Совместимый style-only
patch меняет только UI pin; Vue upgrade меняет Vue pin и лишь необходимые
совместимые peers. Оба pins остаются exact, их номера могут различаться.
`latest`, ссылка на ветку или submodule-checkout — не валидные спецификации
зависимости для потребителя. Сабмодули `packages/*` служат разработке
библиотек и release-скриптам, но не устанавливаются как runtime-зависимости.
