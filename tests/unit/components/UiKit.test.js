import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import UiKit from "../../../src/components/UiKit.vue";
import { useDemoStore } from "../../../src/stores/demo.js";

// jsdom has no `matchMedia` — `Loader.vue` (mounted in the matrix's
// "loading" cards below) reads it on mount to pick the reduced-motion
// variant.
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

function mountUiKit() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const wrapper = mount(UiKit, {
    global: {
      plugins: [pinia, Buefy],
    },
  });

  return { wrapper, pinia };
}

// Task A7.6: `/kit` показывает эталонную матрицу всех шести значений
// `DEMO_MODES` для контрактов ListAsyncState/AsyncState/partial-баннера,
// не только текущий выбранный глобальный demo-режим, и не перезаписывает
// persisted demo-режим при открытии.
describe("UiKit.vue — матрица demo-состояний (Task A7.6)", () => {
  it("показывает каталожный контракт (ListAsyncState) для ready/loading/empty/error", () => {
    const { wrapper } = mountUiKit();

    expect(wrapper.find(".tr-async-state--loading").exists()).toBe(true);
    expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
    expect(wrapper.find(".tr-async-state--error").exists()).toBe(true);
  });

  it("показывает detail-контракт (прямой AsyncState) для error и permission-denied", () => {
    const { wrapper } = mountUiKit();

    const errorStates = wrapper.findAll(".tr-async-state--error");
    const permissionDeniedStates = wrapper.findAll(".tr-async-state--permission-denied");

    // По одной карточке в каталожном (ListAsyncState) и в detail (прямой
    // AsyncState) разделах матрицы.
    expect(errorStates.length).toBe(2);
    expect(permissionDeniedStates.length).toBe(1);
  });

  it("показывает partial-баннер поверх контента тем же b-message-контрактом", () => {
    const { wrapper } = mountUiKit();

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
  });

  it("открытие /kit не читает и не переписывает persisted demo-режим", () => {
    const { wrapper } = mountUiKit();
    const demoStore = useDemoStore();

    expect(demoStore.mode).toBe("ready");
    expect(wrapper.text()).toContain("Готово");
  });

  it("матрица отражает глобальный demo-режим только в read-only строке, не в самих карточках", () => {
    const { wrapper } = mountUiKit();
    const demoStore = useDemoStore();
    demoStore.setMode("error");

    return wrapper.vm.$nextTick().then(() => {
      // Карточки матрицы по-прежнему показывают все шесть состояний —
      // переключение глобального режима не схлопывает их до одного.
      expect(wrapper.find(".tr-async-state--loading").exists()).toBe(true);
      expect(wrapper.find(".tr-async-state--empty").exists()).toBe(true);
      expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    });
  });
});
