import { afterEach, describe, expect, it } from "vitest";
import { createPinia } from "pinia";
import { h } from "vue";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";
import { Loader, CopyPre } from "@iam3xtr/vue";
import { usePackageCopy } from "../../src/composables/usePackageCopy.js";
import { useLocaleStore } from "../../src/stores/locale.js";

let wrapper;
afterEach(() => wrapper?.unmount());
describe("demo-owned package copy", () => {
  it("switches RU/EN/ES names reactively without package locale state", async () => {
    const pinia = createPinia();
    const Host = { setup() {
      const copy = usePackageCopy();
      return () => h("div", [h(Loader, { label: copy.value.loading }),
        h(CopyPre, { text: "user data", buttonLabel: copy.value.copy, copiedLabel: copy.value.copied })]);
    } };
    wrapper = mount(Host, { global: { plugins: [pinia, Buefy] } });
    for (const [locale, loading, copy] of [["ru", "Загрузка", "Копировать"], ["en", "Loading", "Copy"], ["es", "Cargando", "Copiar"]]) {
      useLocaleStore(pinia).setLocale(locale);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".tr-loader").attributes("aria-label")).toBe(loading);
      expect(wrapper.find(".copy-pre__button").attributes("aria-label")).toBe(copy);
      expect(wrapper.find("pre").text()).toBe("user data");
    }
  });
});
