import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import DirtyExitModal from "../../../../src/components/common/DirtyExitModal.vue";
import FormErrorSummary from "../../../../src/components/common/FormErrorSummary.vue";
import { COMMON_DICTIONARIES } from "../../../../src/locales/common/index.js";
import { useLocaleStore } from "../../../../src/stores/locale.js";

// jsdom has no `matchMedia` — some Buefy components (and this suite mounts
// `b-modal`) read it; same fix as other component tests in this repo.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Task A10.9: `common/DirtyExitModal.vue` and `common/FormErrorSummary.vue`
// are the two shared cross-cutting pieces every A10 savable form reuses
// (agent/knowledge/workspace/profile settings) — this asserts they actually
// switch text through the kit-wide `stores/locale.js` pick and the scoped
// `locales/common` dictionary, not just that the dictionary itself parses.
function mountWithLocale(component, props, locale) {
  const pinia = createPinia();
  setActivePinia(pinia);
  if (locale) {
    useLocaleStore().setLocale(locale);
  }
  return mount(component, {
    props,
    global: { plugins: [pinia, Buefy] },
  });
}

describe("locale-driven common components (Task A10.9)", () => {
  it("DirtyExitModal рендерит текст на русском по умолчанию", () => {
    const wrapper = mountWithLocale(DirtyExitModal, { active: true });
    expect(wrapper.text()).toContain(COMMON_DICTIONARIES.ru.dirtyExit.title);
    expect(wrapper.text()).toContain(COMMON_DICTIONARIES.ru.dirtyExit.stay);
  });

  it("DirtyExitModal переключается на EN/ES через useLocaleStore", () => {
    const en = mountWithLocale(DirtyExitModal, { active: true }, "en");
    expect(en.text()).toContain(COMMON_DICTIONARIES.en.dirtyExit.title);

    const es = mountWithLocale(DirtyExitModal, { active: true }, "es");
    expect(es.text()).toContain(COMMON_DICTIONARIES.es.dirtyExit.title);
  });

  it("FormErrorSummary без явного title берёт заголовок из словаря по locale", () => {
    const props = { errors: { name: "Обязательное поле" } };

    const ru = mountWithLocale(FormErrorSummary, props);
    expect(ru.text()).toContain(COMMON_DICTIONARIES.ru.formErrorSummary.title);

    const en = mountWithLocale(FormErrorSummary, props, "en");
    expect(en.text()).toContain(COMMON_DICTIONARIES.en.formErrorSummary.title);
  });

  it("FormErrorSummary с явным title продолжает использовать переданный текст", () => {
    const wrapper = mountWithLocale(FormErrorSummary, {
      errors: { name: "Обязательное поле" },
      title: "Custom heading",
    }, "en");

    expect(wrapper.text()).toContain("Custom heading");
    expect(wrapper.text()).not.toContain(COMMON_DICTIONARIES.en.formErrorSummary.title);
  });
});
