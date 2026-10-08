import { afterEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";
import { FormDrawer } from "@iam3xtr/vue";

import FormDrawerHost from "../../../../src/components/kit/FormDrawerHost.vue";

// The host relies on `beforeClose`, `shell` and `width`, which a published
// @iam3xtr/vue older than the release that adds them does not have. Those
// tests run against package sources (`npm run test:unit:sources`) and
// switch on automatically once the adopted release declares the contract.
const hasHostContract = !!FormDrawer.props?.beforeClose && !!FormDrawer.props?.shell;

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

function mountHost() {
  setActivePinia(createPinia());
  wrapper = mount(FormDrawerHost, {
    attachTo: document.body,
    global: { plugins: [Buefy] },
  });
  return wrapper;
}

const body = () => new DOMWrapper(document.body);
const drawer = () => body().find(".tr-form-drawer");
const isOpen = () => {
  const content = document.body.querySelector(".tr-form-drawer .sidebar-content");
  return !!content && content.style.display !== "none";
};
const status = () => wrapper.find('[data-testid="host-status"]').text();

async function choose(label) {
  const radio = wrapper.findAll("label").find((node) => node.text() === label);
  await radio.find("input").setValue();
}

async function toggle(label) {
  const sw = wrapper.findAll("label").find((node) => node.text() === label);
  await sw.find("input").setValue(!sw.find("input").element.checked);
}

async function openHost() {
  await wrapper.findAll("button").find((b) => b.text() === "Открыть host-форму").trigger("click");
  await flushPromises();
}

async function typeName(value) {
  const input = drawer().find("input[type='text'], input:not([type])");
  await input.setValue(value);
  await flushPromises();
}

async function pressEscape() {
  document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
  await flushPromises();
}

const confirmModal = () => document.body.querySelector(".modal.is-active .modal-card");
const clickModalButton = async (text) => {
  const button = [...confirmModal().querySelectorAll("button")].find((b) => b.textContent.trim() === text);
  button.click();
  await flushPromises();
};

describe.skipIf(!hasHostContract)("kit/FormDrawerHost.vue", () => {
  it("closes a clean form from the footer and header without a confirmation", async () => {
    mountHost();
    await openHost();
    expect(isOpen()).toBe(true);

    drawer().find(".tr-form-drawer__close").element.click();
    await flushPromises();

    expect(isOpen()).toBe(false);
    expect(confirmModal()).toBeNull();
    expect(status()).toContain("close-button");
  });

  it("keeps a dirty draft while the confirmation is pending and after staying", async () => {
    mountHost();
    await openHost();
    await typeName("Борис");

    await pressEscape();
    expect(confirmModal()).not.toBeNull();
    expect(isOpen()).toBe(true);

    await pressEscape();
    await flushPromises();
    expect(isOpen()).toBe(true);

    await clickModalButton("Остаться");
    expect(isOpen()).toBe(true);
    expect(drawer().find("input").element.value).toBe("Борис");
  });

  it("keeps the page scroll lock after staying and releases it when the drawer closes", async () => {
    const clipped = () => document.documentElement.classList.contains("is-clipped");
    mountHost();
    await openHost();
    expect(clipped()).toBe(true);
    await typeName("Борис");

    await pressEscape();
    expect(confirmModal()).not.toBeNull();
    await clickModalButton("Остаться");
    await flushPromises();
    expect(isOpen()).toBe(true);
    expect(clipped()).toBe(true);

    drawer().find(".tr-form-drawer__close").element.click();
    await flushPromises();
    await clickModalButton("Выйти без сохранения");
    await flushPromises();
    expect(isOpen()).toBe(false);
    expect(clipped()).toBe(false);
  });

  it("closes after the draft is discarded", async () => {
    mountHost();
    await openHost();
    await typeName("Борис");

    drawer().find(".tr-form-drawer__close").element.click();
    await flushPromises();
    await clickModalButton("Выйти без сохранения");

    expect(isOpen()).toBe(false);
  });

  it("denies every close path during an upload even for a clean form", async () => {
    mountHost();
    await toggle("Идёт загрузка (закрытие запрещено)");
    await openHost();

    await pressEscape();
    drawer().find(".tr-form-drawer__close").element.click();
    document.body.querySelector(".sidebar-background")?.click();
    await flushPromises();

    expect(isOpen()).toBe(true);
    expect(confirmModal()).toBeNull();
  });

  it("applies width, localized close name and long labels", async () => {
    mountHost();
    await choose("42rem");
    await choose("es");
    await toggle("Длинные подписи");
    await openHost();

    expect(drawer().attributes("style")).toContain("--tr-form-drawer-width: 42rem");
    expect(drawer().find(".tr-form-drawer__close").attributes("aria-label")).toBe("Cerrar panel");
    expect(drawer().find(".tr-form-drawer__title").text()).toContain("etiqueta muy larga");
  });

  it("renders one form in native mode and submits once while busy", async () => {
    vi.useFakeTimers();
    try {
      mountHost();
      await openHost();
      expect(drawer().findAll("form")).toHaveLength(1);

      const form = drawer().find("form");
      await form.trigger("submit");
      await form.trigger("submit");
      await vi.advanceTimersByTimeAsync(600);
      await flushPromises();

      expect(status()).toContain("Отправок: 1");
      expect(isOpen()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("validates once in shell mode with a single vee-validate form", async () => {
    vi.useFakeTimers();
    try {
      mountHost();
      await choose("shell + vee-validate");
      await openHost();
      expect(drawer().findAll("form")).toHaveLength(1);

      await typeName("");
      await drawer().find("form").trigger("submit");
      await flushPromises();
      expect(drawer().text()).toContain("Укажите имя");
      expect(status()).toContain("Отправок: 0");

      await typeName("Борис");
      await drawer().find("form").trigger("submit");
      await flushPromises();
      await vi.advanceTimersByTimeAsync(600);
      await flushPromises();

      expect(status()).toContain("Отправок: 1");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("kit/FormDrawerHost.vue style primitives", () => {
  it("demonstrates the shared field markers and the borderless table", () => {
    mountHost();
    const section = wrapper.find('[data-testid="host-style-primitives"]');
    expect(section.find(".tr-field__required").exists()).toBe(true);
    expect(section.find(".tr-field__error").text()).toBe("Укажите имя");
    expect(section.find("table.table.is-borderless").exists()).toBe(true);
  });
});
