import { afterEach, describe, expect, it } from "vitest";
import { h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";
import { FilterSelect } from "@iam3xtr/vue";

let wrapper;
async function settle() { await new Promise((r) => setTimeout(r, 0)); await nextTick(); await nextTick(); await new Promise((r) => setTimeout(r, 0)); }
afterEach(() => wrapper?.unmount());
describe("packed non-searchable FilterSelect", () => {
  it.each([
    ["Provider", "All", "Reset", "{count} selected"],
    ["Proveedor", "Todos", "Restablecer", "{count} elegidos"],
  ])("round-trips controlled single/multi/reset and names (%s)", async (ariaLabel, placeholder, resetLabel, selectedCountLabel) => {
    const single = ref("historical"); const multi = ref(["a"]);
    const options = Object.freeze([{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]);
    const copy = { ariaLabel, placeholder, resetLabel, selectedCountLabel };
    const Host = { setup: () => () => h("div", [
      h(FilterSelect, { ...copy, options, modelValue: single.value, "onUpdate:modelValue": (value) => { single.value = value; } }),
      h(FilterSelect, { ...copy, options, multiple: true, modelValue: multi.value, "onUpdate:modelValue": (value) => { multi.value = value; } }),
    ]) };
    wrapper = mount(Host, { attachTo: document.body, global: { plugins: [Buefy] } });
    const [one, many] = wrapper.findAllComponents(FilterSelect);
    const trigger = (w) => w.find(".tr-filter-select__trigger");
    expect(one.find(".tr-filter-select__value").text()).toBe("historical");
    expect(trigger(one).attributes("aria-label")).toBe(ariaLabel);
    expect(trigger(one).attributes("aria-controls")).not.toBe(trigger(many).attributes("aria-controls"));
    await trigger(one).trigger("keydown", { key: "ArrowDown" }); await settle();
    expect(single.value).toBe("historical");
    await one.findAll('[role="option"]')[1].trigger("click"); await settle();
    expect(single.value).toBe("b");
    expect(document.activeElement).toBe(trigger(one).element);
    await trigger(many).trigger("keydown", { key: "ArrowDown" }); await settle();
    await many.findAll('[role="option"]')[1].trigger("click");
    expect(multi.value).toEqual(["a", "b"]);
    expect(many.find('[role="status"]').text()).toBe(selectedCountLabel.replace("{count}", "2"));
    await many.find(".tr-filter-select__reset").trigger("click"); await settle();
    expect(multi.value).toEqual([]);
    expect(many.find('[role="status"]').text()).toBe(placeholder);
  });
});
