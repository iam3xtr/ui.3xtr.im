import { computed, ref, toValue } from "vue";

import { useModelsStore } from "../../stores/models.js";

/**
 * Thin demo adapter between the in-memory `models` fixture store and the
 * public `@iam3xtr/vue` `ModelSelect`. The package never filters its own
 * catalog and never fetches, so this adapter supplies the scoped
 * `models`/`recommendedModels`/`searchResults` arrays and tracks the query
 * reported through `update:query`. Fixtures and store stay in the demo; the
 * package only receives plain arrays.
 *
 * BYOK scope is limited to OpenRouter (demo decision, not a production API
 * contract — see `api.3xtr.im#112`).
 */
export const BYOK_PROVIDER_ID = "openrouter";

// Mirrors the package's own free-form rule (trimmed, no whitespace,
// ≤ 255 characters). The package enforces the rule itself; the adapter only
// needs to know *which* rule failed to show the matching consumer copy.
const FREEFORM_MAX_LENGTH = 255;

/**
 * @param {import("vue").MaybeRefOrGetter<boolean>} byok Whether the picker
 *   instance serves the BYOK scope (OpenRouter-only catalog).
 */
export function useModelSelectCatalog(byok) {
  const modelsStore = useModelsStore();
  const query = ref("");

  const scope = computed(() => ({ providerId: toValue(byok) ? BYOK_PROVIDER_ID : undefined }));
  const trimmedQuery = computed(() => query.value.trim());

  const models = computed(() => modelsStore.list(scope.value));
  const recommendedModels = computed(
    () => modelsStore.listRecommended(scope.value).map((model) => model.id),
  );
  const searchResults = computed(() => (
    trimmedQuery.value ? modelsStore.search(trimmedQuery.value, scope.value) : []
  ));

  /** @type {import("vue").ComputedRef<"whitespace" | "tooLong" | null>} */
  const freeformIssue = computed(() => {
    if (/\s/.test(trimmedQuery.value)) {
      return "whitespace";
    }
    if (trimmedQuery.value.length > FREEFORM_MAX_LENGTH) {
      return "tooLong";
    }
    return null;
  });

  function onQuery(value) {
    query.value = value ?? "";
  }

  /**
   * Name shown on the closed trigger, used by consumers to build an
   * accessible name that still announces the current value.
   *
   * @param {string | null | undefined} modelId
   * @param {string | null | undefined} [providerModelId] Free-form BYOK id;
   *   wins over the catalog id, matching the package's trigger display.
   *   Pass it only for a BYOK-scope instance.
   * @returns {string}
   */
  function displayName(modelId, providerModelId = null) {
    if (providerModelId) {
      return providerModelId;
    }
    if (!modelId) {
      return "";
    }
    // Same fallback as the package trigger: an unknown BYOK id is shown as
    // is, an unknown regular id falls back to the placeholder.
    return modelsStore.getModel(modelId)?.name ?? (toValue(byok) ? modelId : "");
  }

  return {
    models,
    recommendedModels,
    searchResults,
    freeformIssue,
    onQuery,
    displayName,
  };
}
