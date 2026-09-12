import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

/**
 * @typedef {"ready" | "loading" | "empty" | "error" | "permission-denied" | "partial"} DemoMode
 */

/**
 * Единственные допустимые значения глобального demo-режима кита (Stage A7,
 * Task A7.1). Любое иное сохранённое/переданное значение нормализуется в
 * `"ready"` — см. `normalizeMode`.
 * @type {DemoMode[]}
 */
export const DEMO_MODES = Object.freeze([
  "ready",
  "loading",
  "empty",
  "error",
  "permission-denied",
  "partial",
]);

/**
 * Единый источник русских подписей режимов — переиспользуется demo-панелью
 * навбара (`Navbar.vue`) и матрицей состояний на `/kit` (`components/kit/NavigationStates.vue`, Task
 * A7.6), чтобы обе поверхности всегда показывали один и тот же текст без
 * дублирования словаря.
 * @type {Record<DemoMode, string>}
 */
export const DEMO_MODE_LABELS = Object.freeze({
  ready: "Готово",
  loading: "Загрузка",
  empty: "Пусто",
  error: "Ошибка",
  "permission-denied": "Доступ запрещён",
  partial: "Частично",
});

/**
 * @typedef {"none" | "compact" | "full"} ResourceMenuSize
 */

/**
 * Единственные допустимые значения размера resource-меню Navbar (Task
 * A8.1) — kit-only настройка, не входящая в продуктовый контракт. Любое
 * иное сохранённое/переданное значение нормализуется в `"compact"` — см.
 * `normalizeResourceMenuSize`.
 * @type {ResourceMenuSize[]}
 */
export const RESOURCE_MENU_SIZES = Object.freeze(["none", "compact", "full"]);

/**
 * Русские подписи размеров resource-меню, переиспользуемые demo-панелью
 * навбара (`Navbar.vue`).
 * @type {Record<ResourceMenuSize, string>}
 */
export const RESOURCE_MENU_SIZE_LABELS = Object.freeze({
  none: "Нет",
  compact: "Сокращённое",
  full: "Полное",
});

/** Namespaced-ключ `localStorage`, как `trickster-theme` в `App.vue`. */
const STORAGE_KEY = "trickster-demo-state";

const DEFAULTS = Object.freeze({
  mode: /** @type {DemoMode} */ ("ready"),
  longLabels: false,
  denseData: false,
  resourceMenuSize: /** @type {ResourceMenuSize} */ ("compact"),
});

/**
 * @param {unknown} value
 * @returns {DemoMode}
 */
function normalizeMode(value) {
  return DEMO_MODES.includes(/** @type {DemoMode} */ (value)) ? /** @type {DemoMode} */ (value) : DEFAULTS.mode;
}

/**
 * @param {unknown} value
 * @returns {ResourceMenuSize}
 */
function normalizeResourceMenuSize(value) {
  return RESOURCE_MENU_SIZES.includes(/** @type {ResourceMenuSize} */ (value))
    ? /** @type {ResourceMenuSize} */ (value)
    : DEFAULTS.resourceMenuSize;
}

/**
 * Читает persisted demo-состояние. Кит работает без бэкенда и без гарантии
 * доступного `localStorage` (приватный режим браузера, unit-тесты без DOM
 * storage) — любая ошибка доступа/парсинга тихо считается «ничего не
 * сохранено», а не проваливает инициализацию стора.
 * @returns {Partial<typeof DEFAULTS> | null}
 */
function readPersisted() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param {typeof DEFAULTS} value
 */
function writePersisted(value) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage недоступен — demo-режим просто не переживёт перезагрузку
    // в этой сессии; сам стор при этом продолжает работать (требование
    // Task A7.1).
  }
}

/**
 * Единый реактивный источник demo-состояний кита (Stage A7, Task A7.1):
 * глобальный режим отображения (`ready | loading | empty | error |
 * permission-denied | partial`) и два presentation-only флага («длинные
 * подписи», «много данных»), persisted в `localStorage` кита. Также несёт
 * kit-only размер resource-меню Navbar (`none | compact | full`, Task A8.1) —
 * это не часть контракта кабинета, см. `docs/design-system.md`, «Демо-панель
 * навбара (только кит)». Не выполняет сетевых вызовов и не трогает
 * fixture-данные доменных stores (`src/stores/agents.js` и т.д.) — экраны
 * читают режим и решают, что показать, сами.
 */
export const useDemoStore = defineStore("demo", () => {
  const persisted = readPersisted();

  const mode = ref(normalizeMode(persisted?.mode));
  const longLabels = ref(Boolean(persisted?.longLabels));
  const denseData = ref(Boolean(persisted?.denseData));
  const resourceMenuSize = ref(normalizeResourceMenuSize(persisted?.resourceMenuSize));

  watch(
    [mode, longLabels, denseData, resourceMenuSize],
    ([nextMode, nextLongLabels, nextDenseData, nextResourceMenuSize]) => {
      writePersisted({
        mode: nextMode,
        longLabels: nextLongLabels,
        denseData: nextDenseData,
        resourceMenuSize: nextResourceMenuSize,
      });
    },
  );

  /** @param {DemoMode} value */
  function setMode(value) {
    mode.value = normalizeMode(value);
  }

  /** @param {boolean} value */
  function setLongLabels(value) {
    longLabels.value = Boolean(value);
  }

  /** @param {boolean} value */
  function setDenseData(value) {
    denseData.value = Boolean(value);
  }

  /** @param {ResourceMenuSize} value */
  function setResourceMenuSize(value) {
    resourceMenuSize.value = normalizeResourceMenuSize(value);
  }

  function toggleLongLabels() {
    longLabels.value = !longLabels.value;
  }

  function toggleDenseData() {
    denseData.value = !denseData.value;
  }

  function reset() {
    mode.value = DEFAULTS.mode;
    longLabels.value = DEFAULTS.longLabels;
    denseData.value = DEFAULTS.denseData;
    resourceMenuSize.value = DEFAULTS.resourceMenuSize;
  }

  const isReady = computed(() => mode.value === "ready");
  const isLoading = computed(() => mode.value === "loading");
  const isEmpty = computed(() => mode.value === "empty");
  const isError = computed(() => mode.value === "error");
  const isPermissionDenied = computed(() => mode.value === "permission-denied");
  const isPartial = computed(() => mode.value === "partial");

  /**
   * Нормализованная проекция режима в props `ListAsyncState`
   * (`src/components/common/ListAsyncState.vue`): экран передаёт этот объект
   * напрямую через `v-bind`, не заводя собственный `mode → flags` mapping.
   * Приоритет `loading > error > empty > no-results` остаётся решением
   * самого `ListAsyncState` — стор лишь поднимает нужные флаги.
   * `permission-denied` и `partial` не входят сюда: `ListAsyncState`
   * жёстко рендерит `error`-ветку с `variant="error"`, а не
   * `variant="permission-denied"`, и не имеет ветки для `partial`
   * (`PartialDataBanner`-контракт) — см. `permissionDeniedState` и
   * `isPartial` ниже, экран решает про них отдельным `v-if`.
   */
  const listAsyncState = computed(() => ({
    loading: isLoading.value,
    error: isError.value,
    errorIcon: "alert-circle-outline",
    errorTitle: "Не удалось загрузить данные",
    errorMessage: "Проверьте соединение и повторите попытку.",
    empty: isEmpty.value,
    emptyIcon: "shape-outline",
    emptyTitle: "Здесь пока пусто",
    emptyMessage: "Создайте первый объект, чтобы он появился в списке.",
  }));

  /**
   * Текст/иконка для прямого рендера `<AsyncState variant="permission-denied">`
   * (см. `isPermissionDenied` выше), в тех же формулировках, что и демо на
   * `/kit` (`src/components/kit/NavigationStates.vue`).
   */
  const permissionDeniedState = computed(() => ({
    icon: "lock-outline",
    title: "Доступ ограничен",
    message: "У вас нет прав для просмотра этого раздела.",
  }));

  return {
    mode,
    longLabels,
    denseData,
    resourceMenuSize,
    setMode,
    setLongLabels,
    setDenseData,
    setResourceMenuSize,
    toggleLongLabels,
    toggleDenseData,
    reset,
    isReady,
    isLoading,
    isEmpty,
    isError,
    isPermissionDenied,
    isPartial,
    listAsyncState,
    permissionDeniedState,
  };
});
