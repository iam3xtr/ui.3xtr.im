# Проверка поставки пакетов

Изолированные consumer fixtures проверяют публичные npm-shaped артефакты
`@iam3xtr/ui` и `@iam3xtr/vue`. Независимые номера версий допустимы, если
UI удовлетворяет peer interval выбранного Vue. Нормативные правила
публикации, exact pins, immutable tags и registry gate находятся в
[release process](../../docs/release-process.md).

## Запуск матрицы

Нужны Node 24 LTS (последний security patch, минимум 24.15.0), npm 11 и
инициализированные submodules. Команды выполняются из корня UI Kit:

```powershell
npm --prefix packages/ui ci
npm --prefix packages/vue ci
node packages/consumers/scripts/run-matrix.mjs
```

После проверки удалите только созданные временно
`packages/ui/node_modules` и `packages/vue/node_modules`: dev/source aliases
обращаются к этим checkout, поэтому вложенные peers могут создать второй
runtime. Обычные root unit/build/Pages используют опубликованные exact pins
из `node_modules`; runtime-зависимостей `file:packages/*` у демо нет.

Runner собирает и упаковывает пакеты с их штатными prepack hooks. Для
проверки уже подготовленных артефактов можно передать абсолютные `.tgz` paths:

```powershell
$env:MATRIX_UI_TARBALL = 'C:/artifacts/iam3xtr-ui-0.1.5.tgz'
$env:MATRIX_VUE_TARBALL = 'C:/artifacts/iam3xtr-vue-0.1.4.tgz'
node packages/consumers/scripts/run-matrix.mjs
Remove-Item Env:MATRIX_UI_TARBALL, Env:MATRIX_VUE_TARBALL
```

Версии в примере условны. Переданные artifacts используются без изменения.
Установки выполняются под OS temp root, вне checkout; каждый сценарий
получает собственный extracted tarball install. Runner проверяет отсутствие
symlinks, exact package versions и физические копии runtime в install tree.
Force/legacy-peer masking отключён. Temp root удаляется при завершении,
включая SIGINT/SIGTERM; при ошибке сценария exit code ненулевой.

## Фикстуры / сценарии

| Fixture / scenario | Проверяемый контракт |
| --- | --- |
| `spa` | Vite SPA с core/navigation, ModelSelect inline/body portal и единым runtime. FilterSelect проверяется в single/multi/search/custom/unknown/reset режимах с EN/ES copy, общим state двух Toolbar instances, clipping/modal/FormDrawer hosts и Escape/focus return. Buefy 3.0.8/3.0.11/3.1.0; отдельно Router 4.6.0/5.0.0/5.4.0. Router 5 использует совместимый Vite 8. |
| `chat-spa` | Один Vite app для standalone и iframe, без Router/Nuxt/API. Public SFC/theme/icon imports, Buefy/MDI, client mount, long text, Enter submit и consumer-owned light/dark/auto resolver. Buefy 3.0.8/3.0.11/3.1.0. |
| `ssr-hydration` | Самостоятельный library SSR/hydration contract: import без browser globals, server render и jsdom hydration без mismatch; Router не установлен. Это не Nuxt Chat smoke. |
| `tokens-only` | Tokens/icons exports в plain Node; Vue/Bulma/Buefy/Router не устанавливаются транзитивно. |
| `peer-mismatch` | Несовместимый Vue peer отклоняется с ERESOLVE; auth/network error не считается peer rejection. |
| Mixed UI/Vue | UI-newer/Vue-older и разрешённая обратная комбинация; metadata-only synthetic repacks подписаны как dependency-resolution tests, а не historical/registry evidence. |
| `ui-peer-mismatch` | Synthetic UI выше/ниже Vue UI peer interval отклоняется с ERESOLVE. |
| Peer floor ledger | Объявленные caret floors сверяются с матрицей либо named known gaps. Vue 3.5.0 и Buefy 3.0.0 пока не закреплены как reusable matrix axes; ledger явно сохраняет эти пробелы. |
| Registry negatives | Публичный npm возвращает 404 для отсутствующей версии; GitHub Packages с пустыми user/global config возвращает E401/404 без package data. Это не positive authenticated install gate. |

`__UI_TARBALL__`/`__VUE_TARBALL__` в fixture manifests — placeholders,
которые runner заменяет абсолютными tarball specs только во временных копиях.
Synthetic mixed-version cases используют неизменённый код с тестовой версией
в копии manifest. Их arithmetic рассчитана на текущий stable `^0.x.y` UI
peer; иной диапазон требует пересмотра сценариев и выдаёт явный FAIL.

## Browser smoke Chat SPA

Для browser-проверки используйте отдельную копию `chat-spa`, замените
placeholders конкретными tarballs, выполните `npm install`, затем
`npx vite --host 127.0.0.1`. Runner удаляет свои временные установки, поэтому
они не являются постоянным preview environment.

Проверьте `/index.html?theme=light`, `?theme=dark`, `?theme=auto` и
`/host.html?theme=dark&host=light` (также обратные темы):

- Desktop/tablet и 320/360 px; нет горизонтального overflow.
- После множества сообщений прокручивается history, composer остаётся виден
  в пределах standalone/iframe viewport; длинный текст переносится.
- Initial theme установлена до первого видимого paint; forced modes не
  меняются от OS preference, auto реагирует на системную тему.
- Тема host независима от iframe; Tab/Shift+Tab, Enter и textarea работают.
- Public icon registry и MDI assets загружаются без source aliases.

jsdom tests не доказывают geometry, focus или first paint. Browser evidence
фиксируется отдельно; CSP/cookies/session/Go hosting и настоящий widget
loader проверяются в Chat, не этим fixture.

## Ограничения

Матрица не публикует пакеты и не подтверждает доступность положительной
registry-установки. Перед рекомендацией новых exact pins нужен отдельный
[authenticated registry gate](../../docs/release-process.md#перед-продвижением-рекомендуемого-пина-проверка-на-реальном-registry-вручную)
для фактически выбранных независимых версий. Реальные partial publish и
workflow/environment reviews остаются операционными действиями; release
regressions используют изолированные Git repos и mock npm/gh.

Целевой Chat consumer — Vue 3/Vite SPA для standalone/iframe, раздаваемая
Go. Nuxt и Node production server не требуются этой matrix. Generic library
SSR сохраняется независимо от архитектуры Chat.
