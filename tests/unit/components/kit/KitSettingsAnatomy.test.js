import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";

const SOURCE_MODE = import.meta.env.MODE === "development";
let wrapper;

async function settle(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await nextTick();
  await nextTick();
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Settings anatomy reference gating", () => {
  it("is reachable only through a development-mode dynamic import", () => {
    const forms = readFileSync("src/components/kit/Forms.vue", "utf8");
    expect(forms).not.toMatch(/^import\s.*KitSettingsAnatomy/m);
    expect(forms).toMatch(/import\.meta\.env\.MODE === "development"/);
    expect(forms).toMatch(/import\("\.\/KitSettingsAnatomy\.vue"\)/);
  });
});

// The reference uses unreleased `tr-settings__section*`/`tr-property*` styles,
// so it runs only under `npm run test:unit:sources`.
describe.skipIf(!SOURCE_MODE)("kit/KitSettingsAnatomy.vue (source mode)", () => {
  async function mountReference() {
    const { default: Anatomy } = await import("../../../../src/components/kit/KitSettingsAnatomy.vue");
    wrapper = mount(Anatomy, { attachTo: document.body, global: { plugins: [Buefy] } });
    return wrapper;
  }
  const setVariant = async (name) => {
    const radios = [...wrapper.element.querySelectorAll('input[type="radio"]')];
    const input = radios.find((el) => el.value === name);
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
  };
  const statusText = () => wrapper.get('[data-testid="anatomy-status"]').text();

  it("renders the shared property anatomy in the inline host and edits only on request", async () => {
    await mountReference();
    const inline = wrapper.get('[data-testid="host-inline"]');
    expect(inline.findAll(".tr-property")).toHaveLength(3);
    expect(inline.find("input").exists()).toBe(false);
    await wrapper.get('[data-testid="inline-edit"]').trigger("click");
    expect(inline.find("input#anatomy-inline-name").exists()).toBe(true);
    expect(inline.findAll(".tr-settings__panel")).toHaveLength(0);
    expect(inline.findAll("form")).toHaveLength(0);
  });

  it("uses the same rows in the modal and the drawer without autosave", async () => {
    await mountReference();
    await wrapper.get('[data-testid="open-modal"]').trigger("click");
    await settle();
    const modal = document.body.querySelector('[data-testid="host-modal"]');
    expect(modal.querySelectorAll(".tr-property")).toHaveLength(3);
    modal.querySelector("#anatomy-modal-name").value = "Changed";
    modal.querySelector("#anatomy-modal-name").dispatchEvent(new Event("input", { bubbles: true }));
    await settle(450);
    expect(statusText()).toContain("Сохранений: 0");

    modal.querySelector(".modal-card-foot .button.is-primary").click();
    modal.querySelector(".modal-card-foot .button.is-primary")?.click();
    await settle(450);
    expect(statusText()).toContain("Сохранений: 1");
    expect(statusText()).toContain("Changed");

    await wrapper.get('[data-testid="open-drawer"]').trigger("click");
    await settle();
    expect(document.body.querySelectorAll('[data-testid="host-drawer"] .tr-property')).toHaveLength(3);
  });

  it("ignores duplicate submits while a save is in flight", async () => {
    await mountReference();
    await wrapper.get('[data-testid="inline-edit"]').trigger("click");
    await wrapper.get('[data-testid="inline-save"]').trigger("click");
    await wrapper.get('[data-testid="inline-save"]').trigger("click");
    await settle(450);
    expect(statusText()).toContain("Сохранений: 1");
  });

  it("keeps readonly and no-permission variants non-editable", async () => {
    await mountReference();
    for (const name of ["readonly", "no-permission"]) {
      await setVariant(name);
      expect(wrapper.find('[data-testid="inline-edit"]').exists()).toBe(false);
      expect(wrapper.get('[data-testid="host-inline"]').find("input").exists()).toBe(false);
      expect(wrapper.find('[data-testid="inline-notice"]').exists()).toBe(true);
    }
  });

  it("disables inputs and saving in the busy variant and shows a save error without changing data", async () => {
    await mountReference();
    await setVariant("busy");
    const inline = wrapper.get('[data-testid="host-inline"]');
    expect(inline.get("input#anatomy-inline-name").attributes("disabled")).toBeDefined();
    await wrapper.get('[data-testid="inline-save"]').trigger("click");
    await settle(450);
    expect(statusText()).toContain("Сохранений: 0");

    await setVariant("error");
    await wrapper.get('[data-testid="inline-save"]').trigger("click");
    await settle(450);
    expect(statusText()).toContain("Сохранений: 0");
    expect(wrapper.get('[data-testid="host-inline"] .message.is-danger').text()).toContain("Данные не изменены");
  });

  it("blocks saving until the conflict is resolved", async () => {
    await mountReference();
    await setVariant("conflict");
    expect(wrapper.get('[data-testid="inline-save"]').attributes("disabled")).toBeDefined();
    await wrapper.get('[data-testid="conflict-keep"]').trigger("click");
    await settle();
    expect(wrapper.find('[data-testid="conflict-actions"]').exists()).toBe(false);
    await wrapper.get('[data-testid="inline-save"]').trigger("click");
    await settle(450);
    expect(statusText()).toContain("Сохранений: 1");
  });

  it("renders long hidden rows in the same list", async () => {
    await mountReference();
    await setVariant("long-rows");
    expect(wrapper.get('[data-testid="host-inline"]').findAll(".tr-property")).toHaveLength(11);
  });
});
