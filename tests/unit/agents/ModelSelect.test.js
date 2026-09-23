import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import ModelSelect from "../../../src/components/agents/ModelSelect.vue";

// Task A6.2 own coverage gap flagged by Stage A6 review (Finding 4): this
// component's branchy logic (recommended-vs-search, `useOwnApiKey` scoping,
// free-form validation, `modelValue`/`providerModelId` two-way sync) was
// previously only exercised indirectly via `AgentSettings.test.js`. Not a
// visual regression pass — see CLAUDE.md "Verification policy".

// `icon` is normally registered globally by `main.js`; stub it here instead
// of pulling in `vite-svg-loader`'s asset-glob resolution, which this test
// runner does not configure for the icon registry (see `AgentSettings.test.js`).
const IconStub = { name: "icon", props: ["name"], template: "<span />" };

function mountModelSelect(props = {}) {
  setActivePinia(createPinia());

  return mount(ModelSelect, {
    props,
    global: {
      plugins: [Buefy],
      components: { icon: IconStub },
    },
  });
}

// The dropdown list is toggled with CSS (`v-show`), not `v-if`, so its
// content is queryable in jsdom without simulating focus/open first — group
// headers render as `div.dropdown-item`, options as `a.dropdown-item`
// wrapping our own `#default` slot.
function groupHeaders(wrapper) {
  return wrapper.findAll("div.dropdown-item").map((el) => el.text());
}

function optionNames(wrapper) {
  return wrapper.findAll(".tr-model-select__option-name").map((el) => el.text());
}

async function typeQuery(wrapper, text) {
  await wrapper.find("input").setValue(text);
}

describe("ModelSelect.vue — без BYOK", () => {
  it("без ввода показывает только рекомендуемые модели всего каталога", () => {
    const wrapper = mountModelSelect();

    expect(groupHeaders(wrapper)).toEqual(["Рекомендуемые"]);
    expect(optionNames(wrapper)).toEqual([
      "GPT-4.1 mini",
      "GPT-4.1",
      "Claude Sonnet 4.5",
      "GPT-OSS 120B (OpenRouter)",
    ]);
  });

  it("ввод ищет по всему каталогу и показывает группу «Все модели»", async () => {
    const wrapper = mountModelSelect();

    await typeQuery(wrapper, "gemini");

    expect(groupHeaders(wrapper)).toEqual(["Все модели"]);
    expect(optionNames(wrapper)).toEqual(["Gemini 2.5 Pro"]);
  });

  it("подсказка BYOK и свободный идентификатор недоступны без useOwnApiKey", async () => {
    const wrapper = mountModelSelect();

    expect(wrapper.find(".tr-model-select__hint").exists()).toBe(false);

    await typeQuery(wrapper, "нет-такой-модели");

    expect(wrapper.find(".tr-model-select__freeform-action").exists()).toBe(false);
    expect(wrapper.text()).toContain("Ничего не найдено.");
  });

  it("иконка провайдера без собственной иконки резолвится по protocol", async () => {
    const wrapper = mountModelSelect();

    await typeQuery(wrapper, "локальный");

    expect(optionNames(wrapper)).toEqual(["Llama 3 8B (локальный сервер)"]);
    expect(wrapper.findComponent(IconStub).props("name")).toBe("openai");
  });
});

describe("ModelSelect.vue — BYOK (useOwnApiKey)", () => {
  it("ограничивает каталог OpenRouter и показывает инлайн-подсказку", () => {
    const wrapper = mountModelSelect({ useOwnApiKey: true });

    expect(wrapper.find(".tr-model-select__hint").exists()).toBe(true);
    expect(optionNames(wrapper)).toEqual(["GPT-OSS 120B (OpenRouter)"]);
  });

  it("пустой результат поиска предлагает свободный идентификатор", async () => {
    const wrapper = mountModelSelect({ useOwnApiKey: true });

    await typeQuery(wrapper, "vendor/my-model");

    const action = wrapper.find(".tr-model-select__freeform-action");
    expect(action.exists()).toBe(true);
    expect(action.attributes("disabled")).toBeUndefined();
    expect(action.text()).toContain("vendor/my-model");
  });

  it("валидация свободного идентификатора отвергает пробелы и строку длиннее 255 символов", async () => {
    const wrapper = mountModelSelect({ useOwnApiKey: true });

    await typeQuery(wrapper, "vendor model");
    expect(wrapper.find(".tr-model-select__freeform-action").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("не должен содержать пробелов");

    await typeQuery(wrapper, `vendor/${"a".repeat(250)}`);
    expect(wrapper.find(".tr-model-select__freeform-action").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("Не более 255 символов");
  });

  it("выбор свободного идентификатора эмитит update:providerModelId", async () => {
    const wrapper = mountModelSelect({ useOwnApiKey: true });

    await typeQuery(wrapper, "vendor/my-model");
    await wrapper.find(".tr-model-select__freeform-action").trigger("mousedown");

    expect(wrapper.emitted("update:providerModelId")).toEqual([["vendor/my-model"]]);
  });

  it("выключение BYOK сбрасывает providerModelId", async () => {
    const wrapper = mountModelSelect({ useOwnApiKey: true, providerModelId: "vendor/my-model" });

    await wrapper.setProps({ useOwnApiKey: false });

    expect(wrapper.emitted("update:providerModelId")).toEqual([[null]]);
  });
});

describe("ModelSelect.vue — синхронизация modelValue/providerModelId", () => {
  it("выбор каталожной модели сбрасывает свободный идентификатор", async () => {
    const wrapper = mountModelSelect({ providerModelId: "vendor/legacy" });

    await typeQuery(wrapper, "GPT-4.1 mini");
    await wrapper.find("a.dropdown-item").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["gpt-4.1-mini"]]);
    expect(wrapper.emitted("update:providerModelId")).toEqual([[null]]);
  });

  it("отражает выбранную каталожную модель в поле поиска", () => {
    const wrapper = mountModelSelect({ modelValue: "claude-sonnet-4.5" });

    expect(wrapper.find("input").element.value).toBe("Claude Sonnet 4.5");
  });

  it("отражает свободный идентификатор в поле поиска, если он задан", () => {
    const wrapper = mountModelSelect({ providerModelId: "meta-llama/llama-3.1-405b-instruct" });

    expect(wrapper.find("input").element.value).toBe("meta-llama/llama-3.1-405b-instruct");
  });
});

// Этап 1.1 (active `.plan` "Улучшение выбора модели и настройки собственного
// ключа"): разделение canonical selected display и transient search query.
// Поведение закрытого контрола, открытия с уже выбранным значением,
// restore-on-close и selected marker.
describe("ModelSelect.vue — жизненный цикл canonical/поиск (этап 1.1)", () => {
  it("закрытый контрол показывает canonical display для выбранной каталожной модели", () => {
    const wrapper = mountModelSelect({ modelValue: "claude-sonnet-4.5" });

    expect(wrapper.find("input").element.value).toBe("Claude Sonnet 4.5");
    // Рекомендованные варианты из всего каталога показаны сразу, без открытия
    // через клик — `b-autocomplete` рендерит dropdown-content через `v-show`,
    // а не `v-if`, поэтому он доступен в jsdom.
    expect(groupHeaders(wrapper)).toEqual(["Рекомендуемые"]);
  });

  it("focus при существующем выборе очищает search query и не трогает v-model", async () => {
    const wrapper = mountModelSelect({ modelValue: "claude-sonnet-4.5" });

    await wrapper.find("input").trigger("focus");

    expect(wrapper.find("input").element.value).toBe("");
    // v-model `update:modelValue` не должен эмититься — выбор только
    // изменяется через явный `@select`.
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    // Пустой query показывает только scoped `listRecommended` — никаких
    // результатов поиска по "Claude" или похожему.
    expect(groupHeaders(wrapper)).toEqual(["Рекомендуемые"]);
    const names = optionNames(wrapper);
    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain("Claude Haiku 4.5");
  });

  it("blur без select восстанавливает canonical display в input", async () => {
    const wrapper = mountModelSelect({ modelValue: "claude-sonnet-4.5" });

    await wrapper.find("input").trigger("focus");
    await typeQuery(wrapper, "поиск-без-выбора");
    expect(wrapper.find("input").element.value).toBe("поиск-без-выбора");

    await wrapper.find("input").trigger("blur");

    expect(wrapper.find("input").element.value).toBe("Claude Sonnet 4.5");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("select через клик не оставляет transient query после restore", async () => {
    const wrapper = mountModelSelect();

    await typeQuery(wrapper, "GPT-4.1");
    await wrapper.find("a.dropdown-item").trigger("click");

    // Сразу после выбора input должен показывать имя выбранной модели, а не
    // оставшийся search query.
    expect(wrapper.find("input").element.value).toBe("GPT-4.1 mini");
    expect(wrapper.emitted("update:modelValue")).toEqual([["gpt-4.1-mini"]]);

    // Повторное открытие должно начинаться с пустого query и показывать
    // рекомендованный список, а не фильтрованный по "GPT-4.1".
    await wrapper.find("input").trigger("focus");
    expect(wrapper.find("input").element.value).toBe("");
    expect(groupHeaders(wrapper)).toEqual(["Рекомендуемые"]);
  });

  it("непустой search query показывает только results, без смешивания с recommended", async () => {
    const wrapper = mountModelSelect({ modelValue: "gpt-4.1" });

    await wrapper.find("input").trigger("focus");
    // focus с уже существующим выбором очищает query — дальше имитируем
    // ввод через обычное typing.
    await typeQuery(wrapper, "haiku");

    expect(groupHeaders(wrapper)).toEqual(["Все модели"]);
    expect(optionNames(wrapper)).toEqual(["Claude Haiku 4.5"]);
  });

  it("помечает выбранный каталожный option в открытом списке", async () => {
    const wrapper = mountModelSelect({ modelValue: "claude-sonnet-4.5" });

    await wrapper.find("input").trigger("focus");

    const selectedOption = wrapper.findAll("a.dropdown-item")
      .find((item) => item.text().includes("Claude Sonnet 4.5"));
    expect(selectedOption).toBeDefined();
    expect(selectedOption.find(".tr-model-select__option--selected").exists()).toBe(true);
    expect(selectedOption.find(".tr-model-select__option-marker").exists()).toBe(true);

    const unselectedOption = wrapper.findAll("a.dropdown-item")
      .find((item) => item.text().includes("GPT-4.1"));
    expect(unselectedOption.find(".tr-model-select__option--selected").exists()).toBe(false);
  });

  it("free-form id не помечается как catalog choice", () => {
    const wrapper = mountModelSelect({
      providerModelId: "meta-llama/llama-3.1-405b-instruct",
    });

    // При свободном id selected option в списке отсутствует (его нет в
    // каталоге); marker внутри списка ни к чему не привязан.
    const allOptions = wrapper.findAll(".tr-model-select__option--selected");
    expect(allOptions.length).toBe(0);
  });

  it("BYOK: focus при выбранном free-form id очищает search query и оставляет провайдерский scope", async () => {
    const wrapper = mountModelSelect({
      useOwnApiKey: true,
      providerModelId: "meta-llama/llama-3.1-405b-instruct",
    });

    // Свободный id вне каталога — список показывает только рекомендованные
    // OpenRouter-модели (одна рекомендованная).
    expect(optionNames(wrapper)).toEqual(["GPT-OSS 120B (OpenRouter)"]);

    await wrapper.find("input").trigger("focus");
    expect(wrapper.find("input").element.value).toBe("");

    // Search внутри BYOK-scope ограничен OpenRouter.
    await typeQuery(wrapper, "GPT-OSS");
    expect(optionNames(wrapper)).toEqual(["GPT-OSS 120B (OpenRouter)"]);
    expect(groupHeaders(wrapper)).toEqual(["Все модели"]);
  });
});
