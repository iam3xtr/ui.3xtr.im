import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";

const SOURCE_MODE = import.meta.env.MODE === "development";
let wrapper;

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("FilterSelect reference gating", () => {
  it("is reachable only through a development-mode dynamic import", () => {
    const chat = readFileSync("src/components/kit/ChatComponents.vue", "utf8");
    expect(chat).not.toMatch(/^import\s.*KitFilterSelect/m);
    expect(chat).toMatch(/import\.meta\.env\.MODE === "development"/);
    expect(chat).toMatch(/import\("\.\/KitFilterSelect\.vue"\)/);
  });
});

// `FilterSelect` is a source-only export until Stage 4 publication, so the
// interactive reference runs only under `npm run test:unit:sources`.
describe.skipIf(!SOURCE_MODE)("kit/KitFilterSelect.vue (source mode)", () => {
  async function mountReference() {
    const { default: KitFilterSelect } = await import("../../../../src/components/kit/KitFilterSelect.vue");
    wrapper = mount(KitFilterSelect, { attachTo: document.body, global: { plugins: [Buefy] } });
    return wrapper;
  }
  const triggers = () => [...document.body.querySelectorAll(".tr-page-toolbar .tr-filter-select__trigger")];
  const arrowDown = (el) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

  it("feeds both Toolbar slot instances from one controlled state without double commits", async () => {
    await mountReference();
    const providers = triggers().filter((t) => t.getAttribute("aria-label") === "Провайдер");
    expect(providers).toHaveLength(2);
    expect(new Set(providers.map((t) => t.getAttribute("aria-controls"))).size).toBe(2);
    const ids = [...document.body.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(wrapper.get('[data-testid="filter-provider"]').text()).toBe('"legacy-gateway"');

    arrowDown(providers[0]);
    await settle();
    [...document.body.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes("Anthropic")).click();
    await settle();
    expect(wrapper.get('[data-testid="filter-provider"]').text()).toBe('"anthropic"');
    triggers().filter((t) => t.getAttribute("aria-label") === "Провайдер").forEach((t) =>
      expect(t.querySelector(".tr-filter-select__value").textContent).toBe("Anthropic"));
  });

  it.each([["en", "Provider"], ["es", "Proveedor"]])("switches consumer copy to %s", async (lang, name) => {
    await mountReference();
    const radio = [...wrapper.findAll("input[type=radio]")].find((r) => r.element.value === lang);
    await radio.setValue();
    await settle();
    expect(triggers().some((t) => t.getAttribute("aria-label") === name)).toBe(true);
  });

  it("keeps historical model ids and does not mutate them when options go empty", async () => {
    await mountReference();
    const toggle = wrapper.findAll("label.switch").find((l) => /Пустой каталог/.test(l.text()));
    await toggle.get("input").setValue(true);
    await settle();
    expect(wrapper.get('[data-testid="filter-models"]').text()).toBe('["gpt-4o","retired-model"]');
  });
});
