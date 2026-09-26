import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { h } from "vue";
import Buefy from "buefy";

import OverlayDropdown from "../../../../src/components/common/OverlayDropdown.vue";

// Demo adapter over the public `useDropdownOverlay` composable (.plan
// stage 5, audited demo dropdowns). The composable's geometry is covered
// by the package suite; this file checks the demo wiring: pass-through,
// placement by clipping/modal context, menu marker and cleanup.

let wrapper = null;
let host = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  host?.remove();
  host = null;
});

function mountDropdown({ hostStyle = "", hostClass = "", props = {}, attrs = {} } = {}) {
  host = document.createElement("div");
  host.setAttribute("style", hostStyle);
  if (hostClass) host.className = hostClass;
  const target = document.createElement("div");
  host.appendChild(target);
  document.body.appendChild(host);

  wrapper = mount(OverlayDropdown, {
    attachTo: target,
    props,
    attrs: { "aria-role": "list", class: "tr-probe-dropdown", ...attrs },
    slots: {
      trigger: () => h("button", { type: "button", class: "tr-probe-trigger" }, "Open"),
      default: () => h("a", { class: "dropdown-item" }, "Item"),
    },
    global: { plugins: [Buefy] },
  });
  return wrapper;
}

async function open() {
  await wrapper.find(".tr-probe-trigger").trigger("click");
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
}

function buefy() {
  return wrapper.findComponent({ name: "BDropdown" });
}

describe("common/OverlayDropdown.vue", () => {
  it("передаёт атрибуты, слоты и исходную позицию в b-dropdown", async () => {
    mountDropdown({ props: { position: "is-top-right" } });
    await flushPromises();

    expect(buefy().classes()).toContain("tr-probe-dropdown");
    expect(buefy().props("position")).toBe("is-top-right");
    expect(buefy().props("appendToBody")).toBe(false);
    expect(wrapper.find(".tr-probe-trigger").exists()).toBe(true);
  });

  it("без обрезающего контейнера остаётся inline и помечает открытое меню", async () => {
    mountDropdown();
    await flushPromises();
    await open();

    const menu = buefy().vm.$refs.dropdownMenu;
    expect(buefy().vm.isActive).toBe(true);
    expect(wrapper.emitted("active-change")?.at(-1)).toEqual([true]);
    expect(wrapper.element.contains(menu)).toBe(true);
    expect(menu.classList.contains("tr-dropdown-overlay")).toBe(true);

    wrapper.vm.close();
    await flushPromises();
    expect(buefy().vm.isActive).toBe(false);
    expect(menu.classList.contains("tr-dropdown-overlay")).toBe(false);
  });

  it("под обрезающим предком выносит меню в body-portal с маркером", async () => {
    mountDropdown({ hostStyle: "overflow: auto" });
    await flushPromises();

    expect(buefy().props("appendToBody")).toBe(true);
    await open();

    const menu = buefy().vm.$refs.dropdownMenu;
    expect(host.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);
    expect(menu.closest(".dropdown").classList.contains("tr-dropdown-overlay-portal")).toBe(true);

    wrapper.unmount();
    wrapper = null;
    expect(document.body.contains(menu)).toBe(false);
  });

  it("внутри обрезающего modal не использует portal", async () => {
    mountDropdown({ hostStyle: "overflow: auto", hostClass: "modal" });
    await flushPromises();

    expect(buefy().props("appendToBody")).toBe(false);
    await open();
    expect(host.contains(buefy().vm.$refs.dropdownMenu)).toBe(true);
  });

  it("v-model проходит через адаптер", async () => {
    const onUpdate = vi.fn();
    mountDropdown({ attrs: { modelValue: "a", "onUpdate:modelValue": onUpdate } });
    await flushPromises();

    expect(buefy().props("modelValue")).toBe("a");
    buefy().vm.$emit("update:modelValue", "b");
    expect(onUpdate).toHaveBeenCalledWith("b");
  });
});
