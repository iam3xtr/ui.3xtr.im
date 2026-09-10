import { onMounted, ref } from "vue";

/**
 * Имитирует сетевую задержку загрузки данных там, где кит показывает
 * `Loader` вместо содержимого страницы. Кит работает без бэкенда (см.
 * `.plan`), поэтому все данные — статические фикстуры; composable лишь
 * задерживает их показ на случайное время, чтобы состояние загрузки было
 * видно и проверяемо, а не проскакивало мгновенно.
 *
 * @param {{ min?: number, max?: number }} [options]
 *   `min`/`max` — границы случайной задержки в миллисекундах.
 * @returns {{ isLoading: import("vue").Ref<boolean> }}
 */
export function useSimulatedLoading({ min = 300, max = 900 } = {}) {
  const isLoading = ref(true);

  onMounted(() => {
    const delay = min + Math.random() * (max - min);
    window.setTimeout(() => {
      isLoading.value = false;
    }, delay);
  });

  return { isLoading };
}
