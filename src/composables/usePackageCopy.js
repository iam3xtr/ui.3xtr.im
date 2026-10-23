import { computed } from "vue";
import { useLocaleStore } from "../stores/locale.js";
import { getCommonDictionary } from "../locales/common/index.js";

/** Demo-owned copy for public package controls; follows the existing locale switch. */
export function usePackageCopy() {
  const store = useLocaleStore();
  return computed(() => getCommonDictionary(store.locale).packageCopy);
}
