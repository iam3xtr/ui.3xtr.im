import { defineStore } from "pinia";
import { ref, watch } from "vue";

/**
 * @typedef {Object} StoredSiteSettings
 * @property {boolean} showSearch
 * @property {boolean} showResourceMenu
 * @property {boolean} showNotifications
 */

const STORAGE_KEY = "trickster-site-settings";
/** @type {StoredSiteSettings} */
const defaults = {
  showSearch: true,
  showResourceMenu: true,
  showNotifications: true,
};

/** @returns {StoredSiteSettings} */
function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return stored
      ? {
          ...defaults,
          ...JSON.parse(stored),
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
      }));
    },
    { flush: "sync" },
  );

  function reset() {
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
