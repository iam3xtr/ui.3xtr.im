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

describe("Settings families reference gating", () => {
  it("is reachable only through a development-mode dynamic import", () => {
    const forms = readFileSync("src/components/kit/Forms.vue", "utf8");
    expect(forms).not.toMatch(/^import\s.*KitSettingsFamilies/m);
    expect(forms).toMatch(/import\("\.\/KitSettingsFamilies\.vue"\)/);
  });
});

describe.skipIf(!SOURCE_MODE)("kit/KitSettingsFamilies.vue (source mode)", () => {
  async function mountReference() {
    const { default: Families } = await import("../../../../src/components/kit/KitSettingsFamilies.vue");
    wrapper = mount(Families, { attachTo: document.body, global: { plugins: [Buefy] } });
    return wrapper;
  }
  const family = (id) => wrapper.get(`[data-testid="family-${id}"]`);
  const choose = async (value) => {
    const input = [...wrapper.element.querySelectorAll('input[type="radio"]')].find((el) => el.value === value);
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
  };
  const type = async (input, value) => {
    input.element.value = value;
    await input.trigger("input");
  };

  it("renders eleven families on the shared anatomy without nested forms or doubled panels", async () => {
    await mountReference();
    expect(wrapper.findAll(".tr-settings__panel")).toHaveLength(11);
    expect(wrapper.findAll("form")).toHaveLength(0);
    expect(wrapper.findAll(".tr-settings__panel .tr-settings__panel")).toHaveLength(0);
    expect(family("workspace").findAll(".tr-property")).toHaveLength(2);
  });

  it("saves one family independently, once, without autosave", async () => {
    await mountReference();
    await family("agent").get('[data-testid="family-edit"]').trigger("click");
    await type(family("agent").get("#agent-inline-name"), "Renamed");
    await settle(50);
    expect(wrapper.get('[data-testid="families-status"]').text()).toContain("Сохранений: 0");
    await family("agent").get('[data-testid="family-save"]').trigger("click");
    await family("agent").find('[data-testid="family-save"]').trigger("click");
    await settle();
    expect(wrapper.get('[data-testid="families-status"]').text()).toContain("Сохранений: 1");
    expect(family("agent").text()).toContain("Renamed");
    expect(family("workspace").find("input").exists()).toBe(false);
  });

  it("validates required fields and shows an explicit Cancel discard", async () => {
    await mountReference();
    await family("workspace").get('[data-testid="family-edit"]').trigger("click");
    await type(family("workspace").get("#workspace-inline-name"), "");
    expect(family("workspace").get('[role="alert"]').text()).toBe("Заполните поле");
    expect(family("workspace").get('[data-testid="family-dirty"]').exists()).toBe(true);
    await family("workspace").get('[data-testid="family-cancel"]').trigger("click");
    expect(family("workspace").find("input").exists()).toBe(false);
    expect(family("workspace").text()).toContain("Main workspace");
  });

  it("hides edit affordances for no-permission families", async () => {
    await mountReference();
    expect(family("tariff").find('[data-testid="family-edit"]').exists()).toBe(false);
    expect(family("tariff").get('[data-testid="family-denied"]').exists()).toBe(true);
  });

  it("covers error, conflict outcomes and the entity switch", async () => {
    await mountReference();
    await choose("error");
    await family("provider").get('[data-testid="family-edit"]').trigger("click");
    await type(family("provider").get("#provider-inline-name"), "X");
    await family("provider").get('[data-testid="family-save"]').trigger("click");
    await settle();
    expect(family("provider").get('[data-testid="family-error"]').text()).toContain("Данные не изменены");

    await choose("conflict");
    await family("provider").get('[data-testid="family-retry"]').trigger("click");
    await settle();
    expect(family("provider").get('[data-testid="family-conflict"]').exists()).toBe(true);
    expect(family("provider").get('[data-testid="family-save"]').attributes("disabled")).toBeDefined();
    await family("provider").get('[data-testid="family-keep"]').trigger("click");
    expect(family("provider").find('[data-testid="family-conflict"]').exists()).toBe(false);

    await choose("b");
    expect(family("provider").find("input").exists()).toBe(false);
    expect(family("provider").text()).toContain("Demo provider B");
  });

  it("edits the same draft in the drawer host", async () => {
    await mountReference();
    await family("knowledge").get('[data-testid="family-open-drawer"]').trigger("click");
    await settle();
    const drawer = document.body.querySelector('[data-testid="family-knowledge-drawer"]');
    expect(drawer.querySelectorAll(".tr-property")).toHaveLength(2);
    expect(family("knowledge").find("input").exists()).toBe(false);
  });

  it("keeps an unknown outcome verify-only and resolves it through the in-flight submit", async () => {
    await mountReference();
    await choose("unknown");
    await family("knowledge").get('[data-testid="family-edit"]').trigger("click");
    await type(family("knowledge").get("#knowledge-inline-name"), "Verified");
    await family("knowledge").get('[data-testid="family-save"]').trigger("click");
    await settle(500);
    expect(family("knowledge").get('[data-testid="family-unknown"]').exists()).toBe(true);
    expect(family("knowledge").find('[data-testid="family-retry"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="families-status"]').text()).toContain("Сохранений: 0");
    await family("knowledge").get('[data-testid="family-verify"]').trigger("click");
    await settle(1400);
    expect(family("knowledge").find('[data-testid="family-unknown"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="families-status"]').text()).toContain("Сохранений: 1");
    expect(family("knowledge").text()).toContain("Verified");
  });

  const drawerEl = () => document.body.querySelector('[data-testid="family-knowledge-drawer"]');
  const openKnowledgeDrawer = async () => {
    await family("knowledge").get('[data-testid="family-open-drawer"]').trigger("click");
    await settle();
    const input = drawerEl().querySelector("#knowledge-drawer-name");
    input.value = "Drawer draft";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
  };
  const drawerButton = (label) =>
    [...drawerEl().closest(".tr-form-drawer__form").querySelectorAll(".tr-form-drawer__footer button")].find((el) => el.textContent.trim() === label);

  it("saves from the drawer once and closes it", async () => {
    await mountReference();
    await openKnowledgeDrawer();
    drawerButton("Сохранить").click();
    await settle();
    expect(wrapper.get('[data-testid="families-status"]').text()).toContain("Сохранений: 1");
    expect(family("knowledge").text()).toContain("Drawer draft");
    expect(family("knowledge").find("input").exists()).toBe(false);
  });

  it("discards the draft on drawer Cancel", async () => {
    await mountReference();
    await openKnowledgeDrawer();
    drawerButton("Отмена").click();
    await settle();
    expect(wrapper.get('[data-testid="families-status"]').text()).toContain("Сохранений: 0");
    expect(family("knowledge").find("input").exists()).toBe(false);
    expect(family("knowledge").text()).toContain("Product docs");
    expect(family("knowledge").text()).not.toContain("Drawer draft");
  });

  it("keeps a dirty draft in the inline host when the drawer is closed with Escape", async () => {
    await mountReference();
    await openKnowledgeDrawer();
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
    await settle();
    expect(wrapper.get('[data-testid="families-status"]').text()).toContain("Сохранений: 0");
    expect(family("knowledge").get("#knowledge-inline-name").element.value).toBe("Drawer draft");
    expect(family("knowledge").get('[data-testid="family-dirty"]').exists()).toBe(true);
  });
});
