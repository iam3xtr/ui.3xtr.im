<template>
  <div class="copy-pre">
    <button
      type="button"
      class="button is-small copy-pre__button"
      :class="{ 'is-success': copied }"
      :disabled="!canCopy"
      :title="buttonTitle"
      :aria-label="buttonTitle"
      @click="copyToClipboard"
    >
      <b-icon icon="content-copy" size="is-small" />
      <span class="is-sr-only">{{ buttonText }}</span>
    </button>
    <pre class="copy-pre__pre"><slot>{{ text }}</slot></pre>
    <!-- Слот — контракт кабинета: вызывающий код может отрендерить
         форматированное содержимое (например с подсветкой синтаксиса), а
         `text` остаётся тем, что реально уходит в буфер обмена. Если слот не
         передан, `text` используется и для отображения — типичный случай
         demo-использования с обычной строкой/JSON. -->
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

// Контракт кабинета (get.3xtr.im/src/modules/common/components/CopyPre.vue):
// ограниченный по высоте <pre> с плавающей кнопкой копирования в правом
// верхнем углу. Высота, отступы и типографика — из foundation-классов
// .copy-pre* в trickster-buefy.scss, отдельный style-контракт не заводится.
const props = defineProps({
  text: {
    type: [String, Number],
    default: "",
  },
  buttonLabel: {
    type: String,
    default: "Копировать",
  },
  copiedLabel: {
    type: String,
    default: "Скопировано!",
  },
  title: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const copied = ref(false);
let copiedTimer = null;

const canCopy = computed(
  () => !props.disabled && String(props.text ?? "").length > 0,
);
const buttonText = computed(() =>
  copied.value ? props.copiedLabel : props.buttonLabel,
);
const buttonTitle = computed(() =>
  copied.value ? props.copiedLabel : props.title || props.buttonLabel,
);

async function copyToClipboard() {
  if (!canCopy.value) return;

  try {
    await navigator.clipboard.writeText(String(props.text));
    copied.value = true;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copied.value = false;
      copiedTimer = null;
    }, 2000);
  } catch (error) {
    console.error("Clipboard copy failed", error);
  }
}

onBeforeUnmount(() => {
  clearTimeout(copiedTimer);
});
</script>
