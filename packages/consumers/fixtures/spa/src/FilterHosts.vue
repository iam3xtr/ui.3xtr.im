<script setup>
// Consumer example for `FilterSelect` inside real hosts: the Toolbar `filters`
// slot (rendered twice: inline and inside MobileFilters), a clipping ancestor,
// a Buefy modal and a FormDrawer. Selection is controlled by shared refs.
import { computed, ref } from "vue";
import { FilterSelect, FormDrawer, Toolbar } from "@iam3xtr/vue";

const props = defineProps({ locale: { type: String, default: "en" } });
const COPY = {
  en: {
    ariaLabel: "Provider", placeholder: "All providers", resetLabel: "Reset", selectedCountLabel: "{count} selected",
    emptyLabel: "No options", loadingLabel: "Loading", searchLabel: "Search", noResultsLabel: "No matches",
    customLabel: "Use {value}", customInvalidLabel: "Invalid", customDuplicateLabel: "Already selected",
  },
  es: {
    ariaLabel: "Proveedor", placeholder: "Todos los proveedores", resetLabel: "Restablecer", selectedCountLabel: "{count} elegidos",
    emptyLabel: "Sin opciones", loadingLabel: "Cargando", searchLabel: "Buscar", noResultsLabel: "Sin resultados",
    customLabel: "Usar {value}", customInvalidLabel: "No valido", customDuplicateLabel: "Ya elegido",
  },
};
const HOST = {
  en: { filters: "Filters", drawer: "Filter drawer", close: "Close" },
  es: { filters: "Filtros", drawer: "Panel de filtros", close: "Cerrar" },
};
const filterProps = computed(() => COPY[props.locale] ?? COPY.en);
const host = computed(() => HOST[props.locale] ?? HOST.en);

const options = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "long", label: "A very long provider label that must stay compact inside the toolbar trigger" },
];
const modelOptions = [{ value: "gpt-4o", label: "GPT-4o" }, { value: "claude", label: "Claude" }];
const provider = ref("historical-provider");
const models = ref(["gpt-4o"]);
const loading = ref(false);
const disabled = ref(false);
const drawerOpen = ref(false);
const modalOpen = ref(false);
const changes = ref(0);
const setProvider = (value) => { provider.value = value; changes.value += 1; };
const filtersActive = computed(() => Boolean(provider.value) || models.value.length > 0);
defineExpose({ provider, models, loading, disabled, drawerOpen, modalOpen, changes });
</script>

<template>
  <Toolbar class="tr-filter-hosts__toolbar" :filters-active="filtersActive" :filters-aria-label="host.filters">
    <template #filters>
      <FilterSelect v-bind="filterProps" class="tr-filter-hosts__provider" :options="options" :model-value="provider"
        :loading="loading" :disabled="disabled" searchable allow-custom @update:model-value="setProvider" />
      <FilterSelect v-bind="filterProps" class="tr-filter-hosts__models" :options="modelOptions" multiple
        :model-value="models" :loading="loading" :disabled="disabled" @update:model-value="(v) => (models = v)" />
    </template>
  </Toolbar>

  <div class="tr-filter-hosts__clip" style="overflow: hidden; width: 200px">
    <FilterSelect v-bind="filterProps" class="tr-filter-hosts__clipped" :options="options" :model-value="provider"
      @update:model-value="setProvider" />
  </div>

  <b-modal v-model="modalOpen" has-modal-card trap-focus aria-role="dialog" aria-modal>
    <div class="modal-card tr-filter-hosts__modal">
      <section class="modal-card-body">
        <FilterSelect v-bind="filterProps" class="tr-filter-hosts__in-modal" :options="options" :model-value="provider"
          @update:model-value="setProvider" />
      </section>
    </div>
  </b-modal>

  <FormDrawer v-model="drawerOpen" :title="host.drawer" :close-aria-label="host.close">
    <FilterSelect v-bind="filterProps" class="tr-filter-hosts__in-drawer" :options="options" :model-value="provider"
      @update:model-value="setProvider" />
  </FormDrawer>
</template>
