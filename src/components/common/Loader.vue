<template>
  <div
    class="tr-loader"
    :class="`tr-loader--${size}`"
    role="status"
    aria-live="polite"
    :aria-label="label"
  >
    <component :is="mark" class="tr-loader__mark" aria-hidden="true" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import LoaderMark from "@/assets/loader-mono.svg";
import LoaderMarkStatic from "@/assets/loader-mono-static.svg";

// Единый загрузчик кита — заменяет четыре несвязанных механизма кабинета
// (пустой .app-loader, инлайновую иконку bars-scale-fade, CSS-спиннер
// async-state и скелетоны) одним компонентом. Правила — в
// trickster-buefy.scss, секция "Loader" (см. docs/design-system.md).
defineProps({
  // inline  — внутри кнопки/строки, по высоте текста, не блокирует layout;
  // section — внутри карточки/панели/области списка, центр по родителю;
  // screen  — полноэкранное состояние приложения (100dvh).
  size: {
    type: String,
    default: "section",
    validator: (value) => ["inline", "section", "screen"].includes(value),
  },
  label: {
    type: String,
    default: "Загрузка",
  },
});

// SMIL <animate> внутри loader-mono.svg не отключается CSS-медиазапросом
// prefers-reduced-motion, поэтому при reduced motion подставляется
// статичный вариант логотипа без <animate>-элементов.
const prefersReducedMotion = ref(false);
let mediaQuery = null;

function handleChange(event) {
  prefersReducedMotion.value = event.matches;
}

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  prefersReducedMotion.value = mediaQuery.matches;
  mediaQuery.addEventListener("change", handleChange);
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener("change", handleChange);
});

const mark = computed(() => (prefersReducedMotion.value ? LoaderMarkStatic : LoaderMark));
</script>
