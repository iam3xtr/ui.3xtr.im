import { defineStore } from "pinia";
import { ref, watch } from "vue";

interface StoredSiteSettings {
  showSearch: boolean;
  showResourceMenu: boolean;
  showNotifications: boolean;
}

const STORAGE_KEY = "trickster-site-settings";
const defaults: StoredSiteSettings = {
  showSearch: true,
  showResourceMenu: true,
  showNotifications: true,
};

function loadSettings(): StoredSiteSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return stored
      ? {
          ...defaults,
          ...JSON.parse(stored) as Partial<StoredSiteSettings>,
        }
      : defaults;
  } catch {
    return defaults;
  }
}

export const useSiteSettingsStore = defineStore("site-settings", () => {
  const initial = loadSettings();
  const showSearch = ref(initial.showSearch);
  const showResourceMenu = ref(initial.showResourceMenu);
  const showNotifications = ref(initial.showNotifications);

  watch(
    [showSearch, showResourceMenu, showNotifications],
    ([search, resourceMenu, notifications]) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        showSearch: search,
        showResourceMenu: resourceMenu,
        showNotifications: notifications,
      } satisfies StoredSiteSettings));
    },
    { flush: "sync" },
  );

  function reset(): void {
    showSearch.value = defaults.showSearch;
    showResourceMenu.value = defaults.showResourceMenu;
    showNotifications.value = defaults.showNotifications;
  }

  return {
    showSearch,
    showResourceMenu,
    showNotifications,
    reset,
  };
});
