// FilterSelect in real hosts from the packed tarballs: the duplicated Toolbar
// `filters` slot (inline + MobileFilters), a clipping ancestor, a modal and a
// FormDrawer, with two consumer locales and one controlled selection.
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";
import { provideIconRegistry } from "@iam3xtr/vue";
import FilterHosts from "../src/FilterHosts.vue";

let wrapper;
async function settle() {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
  await nextTick();
  await new Promise((r) => setTimeout(r, 0));
}
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});
const mountHosts = (locale) => {
  wrapper = mount(FilterHosts, {
    attachTo: document.body,
    props: { locale },
    global: { plugins: [Buefy, { install(app) { provideIconRegistry(app, {}); } }] },
  });
  return wrapper;
};
const triggers = (cls) => [...document.body.querySelectorAll(`.${cls} .tr-filter-select__trigger`)];
const arrowDown = (el) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
// Options of the menu owned by one trigger (closed menus stay in the DOM).
const optionsOf = (trigger) => [...document.getElementById(trigger.getAttribute("aria-controls"))?.querySelectorAll('[role="option"]') ?? []];

describe("packed FilterSelect host integration", () => {
  it.each([["en", "Provider"], ["es", "Proveedor"]])("shares one controlled value across both Toolbar instances (%s)", async (locale, name) => {
    mountHosts(locale);
    const instances = triggers("tr-filter-hosts__provider");
    expect(instances).toHaveLength(2);
    instances.forEach((t) => expect(t.getAttribute("aria-label")).toBe(name));
    expect(new Set(instances.map((t) => t.getAttribute("aria-controls"))).size).toBe(2);
    expect(wrapper.vm.provider).toBe("historical-provider");

    arrowDown(instances[0]);
    await settle();
    expect(instances[0].getAttribute("aria-expanded")).toBe("true");
    optionsOf(instances[0]).find((o) => o.textContent.includes("Anthropic")).click();
    await settle();
    expect(wrapper.vm.provider).toBe("anthropic");
    expect(wrapper.vm.changes).toBe(1);
    triggers("tr-filter-hosts__provider").forEach((t) =>
      expect(t.querySelector(".tr-filter-select__value").textContent).toBe("Anthropic"));
    expect(document.activeElement).toBe(instances[0]);
  });

  it("shows long labels and blocks opening while disabled", async () => {
    mountHosts("en");
    wrapper.vm.provider = "long";
    await settle();
    expect(document.body.querySelector(".tr-filter-hosts__provider .tr-filter-select__value").textContent)
      .toContain("A very long provider label");
    wrapper.vm.disabled = true;
    await settle();
    const trigger = triggers("tr-filter-hosts__provider")[0];
    arrowDown(trigger);
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(wrapper.vm.provider).toBe("long");
  });

  it("opens under a clipping ancestor without changing the selection", async () => {
    mountHosts("en");
    await settle(); // placement resolves after mount and re-keys the dropdown into a body portal
    const trigger = triggers("tr-filter-hosts__clipped")[0];
    arrowDown(trigger);
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(optionsOf(trigger).length).toBeGreaterThan(0);
    expect(wrapper.vm.provider).toBe("historical-provider");
  });

  it.each([["modalOpen", "tr-filter-hosts__in-modal"], ["drawerOpen", "tr-filter-hosts__in-drawer"]])("selects inside the %s host", async (flag, cls) => {
    mountHosts("es");
    wrapper.vm[flag] = true;
    await settle();
    const trigger = triggers(cls)[0];
    expect(trigger).toBeTruthy();
    arrowDown(trigger);
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    optionsOf(trigger).find((o) => o.textContent.includes("OpenAI")).click();
    await settle();
    expect(wrapper.vm.provider).toBe("openai");
    expect(wrapper.vm[flag]).toBe(true);
  });

  // Nested overlay behaviour: Escape closes the dropdown first and the host second,
  // focus returns to the trigger, and the host's scroll lock is untouched by the dropdown.
  const press = (el, type, key = "Escape") => el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  const escape = (el) => { press(el, "keydown"); press(el, "keyup"); };
  const locked = () => document.documentElement.classList.contains("is-clipped") || document.body.classList.contains("is-clipped");

  it.each([["modalOpen", "tr-filter-hosts__in-modal", true], ["drawerOpen", "tr-filter-hosts__in-drawer", false]])(
    "closes the dropdown before the %s host on Escape and returns focus", async (flag, cls, scrollLocks) => {
      mountHosts("en");
      wrapper.vm[flag] = true;
      await settle();
      const trigger = triggers(cls)[0];
      const lockedBefore = locked();
      if (scrollLocks) expect(lockedBefore).toBe(true);
      arrowDown(trigger);
      await settle();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const menu = document.getElementById(trigger.getAttribute("aria-controls"));
      expect(menu).toBeTruthy();
      expect(document.body.contains(menu)).toBe(true);
      expect(locked()).toBe(lockedBefore);

      escape(document.activeElement);
      await settle();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(wrapper.vm[flag]).toBe(true);
      expect(document.activeElement).toBe(trigger);
      expect(locked()).toBe(lockedBefore);

      escape(document.activeElement);
      await settle();
      expect(wrapper.vm[flag]).toBe(false);
      expect(locked()).toBe(false);
    });
});
