import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import Buefy from "buefy";
import { Loader, ListAsyncState, Toolbar, CopyPre, FormDrawer, Icon } from "@iam3xtr/vue";

let wrapper;
afterEach(() => wrapper?.unmount());
describe("packed consumer copy", () => {
  it.each([
    ["Loading", "Copy", "Copied", "Open filters", "Close"],
    ["Cargando", "Copiar", "Copiado", "Abrir filtros", "Cerrar"],
  ])("renders localized names from consumer input (%s)", (loading, copy, copied, filters, close) => {
    wrapper = mount({ render: () => h("div", [
      h(Loader, { label: loading }),
      h(ListAsyncState, { loading: true, loadingLabel: loading }),
      h(CopyPre, { text: "code", buttonLabel: copy, copiedLabel: copied }),
      h(Toolbar, { filtersAriaLabel: filters }, { filters: () => h("button", "Option") }),
      h(FormDrawer, { modelValue: true, closeAriaLabel: close }),
      h(Icon, { name: "openai" }),
    ]) }, { global: { plugins: [Buefy] } });
    for (const loader of wrapper.findAll(".tr-loader")) expect(loader.attributes("aria-label")).toBe(loading);
    expect(wrapper.find(".copy-pre__button").attributes("aria-label")).toBe(copy);
    expect(wrapper.find(".tr-mobile-filters__trigger").attributes("aria-label")).toBe(filters);
    expect(wrapper.findComponent(FormDrawer).find(".tr-form-drawer__close").attributes("aria-label")).toBe(close);
    expect(wrapper.find(".tr-icon").attributes("aria-hidden")).toBe("true");
    expect(wrapper.text()).not.toMatch(/Загрузка|Копировать|Фильтры|Закрыть/);
  });
});
