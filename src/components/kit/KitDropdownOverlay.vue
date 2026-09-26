<template>
  <!--
    Stage 5: рабочие варианты публичного overlay-слоя `useDropdownOverlay`
    из `@iam3xtr/vue`. Оба dropdown используют demo-адаптер
    `OverlayDropdown` (привязка composable к обычному `b-dropdown`), а
    страница напрямую читает `POSITIONS`, `resolveDropdownPlacement` и
    `DROPDOWN_OVERLAY_MARKER` — это их фактический public API.
  -->
  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Overlay composable</h2>
    <p class="tr-muted mb-4">
      <code>useDropdownOverlay</code> добавляет к <code>b-dropdown</code>
      auto-flip у края viewport, пересчёт при scroll/resize и z-index из
      токена <code>--tr-z-dropdown</code>, не трогая Escape, outside-click
      и focus trap Buefy. Прокрутите страницу так, чтобы trigger оказался
      у нижнего края, — меню откроется вверх.
    </p>

    <b-field label="Предпочтительная position" label-for="kit-overlay-position">
      <b-select id="kit-overlay-position" v-model="position" size="is-small">
        <option v-for="value in POSITIONS" :key="value" :value="value">
          {{ value }}
        </option>
      </b-select>
    </b-field>

    <div class="tr-dropdown-overlay-kit__variants">
      <div ref="inlineAnchor" class="tr-dropdown-overlay-kit__variant">
        <p class="tr-muted mb-2">
          Обычный поток — placement
          <code data-testid="placement-inline">{{ placements.inline }}</code>
        </p>
        <OverlayDropdown :position="position" aria-role="list">
          <template #trigger>
            <b-button size="is-small" icon-right="chevron-down">
              Действия
            </b-button>
          </template>
          <b-dropdown-item aria-role="listitem">Редактировать</b-dropdown-item>
          <b-dropdown-item aria-role="listitem">Дублировать</b-dropdown-item>
          <b-dropdown-item aria-role="listitem">Архивировать</b-dropdown-item>
        </OverlayDropdown>
      </div>

      <div class="tr-dropdown-overlay-kit__variant">
        <p class="tr-muted mb-2">
          Внутри clipping-контейнера — placement
          <code data-testid="placement-clipped">{{ placements.clipped }}</code>
        </p>
        <div ref="clippedAnchor" class="tr-dropdown-overlay-kit__clip">
          <OverlayDropdown :position="position" aria-role="list">
            <template #trigger>
              <b-button size="is-small" icon-right="chevron-down">
                Действия в прокрутке
              </b-button>
            </template>
            <b-dropdown-item aria-role="listitem">Редактировать</b-dropdown-item>
            <b-dropdown-item aria-role="listitem">Дублировать</b-dropdown-item>
            <b-dropdown-item aria-role="listitem">Архивировать</b-dropdown-item>
          </OverlayDropdown>
        </div>
      </div>
    </div>

    <h3 class="tr-card__subtitle mt-4">Публичный API</h3>
    <ul class="tr-muted">
      <li>
        Импорт:
        <code>import { useDropdownOverlay, resolveDropdownPlacement, POSITIONS, DROPDOWN_OVERLAY_MARKER } from "@iam3xtr/vue";</code>
      </li>
      <li>
        <code>useDropdownOverlay(options)</code> → <code>{ reapply }</code>.
        Options: <code>triggerRef</code>, <code>menuRef</code>,
        <code>wrapperRef</code>, <code>activeRef</code> (зеркало
        <code>active-change</code>), <code>positionRef</code> (двусторонняя
        привязка к <code>position</code> у <code>b-dropdown</code>),
        опционально <code>appendToBody</code>, <code>fixed</code>,
        <code>edgeGap</code> (по умолчанию 8 px), <code>portalRef</code>.
      </li>
      <li>
        <code>resolveDropdownPlacement(anchor)</code> →
        <code>"inline"</code> | <code>"portal"</code> (clipping-предок →
        <code>append-to-body</code>) | <code>"fixed"</code> (clipping
        внутри modal/drawer → меню закрепляется на месте).
      </li>
      <li>
        <code>POSITIONS</code>: {{ POSITIONS.join(", ") }}; flip меняет
        только вертикаль. <code>DROPDOWN_OVERLAY_MARKER</code> =
        <code>"{{ DROPDOWN_OVERLAY_MARKER }}"</code> — класс меню для темы
        <code>@iam3xtr/ui</code>.
      </li>
      <li>
        Events и slots: нет — composable не рендерит разметку. Keyboard,
        Escape и focus trap остаются за Buefy.
      </li>
      <li>
        Внутри пакета: <code>ToolbarDropdown</code>,
        <code>MobileFilters</code>, <code>ModelSelect</code>
        (см.
        <RouterLink :to="{ name: 'kit-navigation-states' }">
          навигацию и состояния
        </RouterLink>).
      </li>
      <li>
        Места применения в демо (через <code>OverlayDropdown</code>):
        меню пользователя в Navbar на каждой странице,
        <RouterLink :to="{ name: 'agent-settings', params: { id: 1 } }">
          выбор API-ключа в настройках агента
        </RouterLink>,
        <RouterLink :to="{ name: 'knowledge-collection', params: { id: 1 } }">
          действия с файлами коллекции
        </RouterLink>,
        <RouterLink :to="{ name: 'kit-tables' }">
          действия строк таблицы UI Kit
        </RouterLink>.
      </li>
    </ul>
  </section>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref, useTemplateRef } from "vue";

import {
  DROPDOWN_OVERLAY_MARKER,
  POSITIONS,
  resolveDropdownPlacement,
} from "@iam3xtr/vue";

import OverlayDropdown from "../common/OverlayDropdown.vue";

const position = ref("is-bottom-left");
const inlineAnchor = useTemplateRef("inlineAnchor");
const clippedAnchor = useTemplateRef("clippedAnchor");

const placements = reactive({ inline: "…", clipped: "…" });

// Same call `OverlayDropdown` makes once mounted, read here only to show
// which rendering mode each variant resolved to.
onMounted(async () => {
  await nextTick();
  placements.inline = resolveDropdownPlacement(inlineAnchor.value?.querySelector(".dropdown"));
  placements.clipped = resolveDropdownPlacement(clippedAnchor.value?.querySelector(".dropdown"));
});
</script>

<!--
  kit-style-exception: раскладка showcase для `/kit/chat` — две колонки
  вариантов и намеренно обрезающий (`overflow: auto`) контейнер, чтобы
  показать переход в body portal. Меню стилизуется общим
  `.tr-dropdown-overlay` namespace из `@iam3xtr/ui`; эти правила не часть
  публичного contract.
-->
<style scoped>
.tr-dropdown-overlay-kit__variants {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.tr-dropdown-overlay-kit__variant {
  flex: 1 1 16rem;
  min-width: 0;
}

.tr-dropdown-overlay-kit__clip {
  max-height: 4rem;
  overflow: auto;
  padding: 0.5rem;
  border: 1px dashed var(--tr-border);
  border-radius: var(--tr-radius-large);
}
</style>
