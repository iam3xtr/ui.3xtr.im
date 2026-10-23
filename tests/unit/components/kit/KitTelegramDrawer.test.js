import { afterEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";
import { FormDrawer } from "@iam3xtr/vue";

import { readFileSync } from "node:fs";

// Reachable only in explicit source mode (`npm run test:unit:sources`): the
// drawer depends on styles absent from published UI 0.1.4.
const SOURCE_MODE = import.meta.env.MODE === "development";
const KitTelegramDrawer = SOURCE_MODE
  ? (await import("../../../../src/components/kit/KitTelegramDrawer.vue")).default
  : null;

describe("Telegram drawer reference gating", () => {
  it("is reachable only through a development-mode dynamic import", () => {
    const overlays = readFileSync("src/components/kit/DialogsOverlays.vue", "utf8");
    expect(overlays).not.toMatch(/^import\s.*KitTelegramDrawer/m);
    expect(overlays).toMatch(/import\("\.\/KitTelegramDrawer\.vue"\)/);
  });
});

// Relies on `beforeClose` and `shell`, available from package sources
// (`npm run test:unit:sources`) and from the adopted release that declares them.
const hasHostContract = !!FormDrawer.props?.beforeClose && !!FormDrawer.props?.shell;

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

function mountRef() {
  setActivePinia(createPinia());
  wrapper = mount(KitTelegramDrawer, {
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
const status = () => wrapper.find('[data-testid="telegram-status"]').text();

async function choose(label) {
  const radio = wrapper.findAll("label").find((node) => node.text() === label);
  await radio.find("input").setValue();
}

async function openDrawer() {
  await wrapper.find('[data-testid="telegram-open"]').trigger("click");
  await flushPromises();
}

async function typeName(value) {
  await drawer().find("input[type='text']").setValue(value);
  await flushPromises();
}

const confirmModal = () => document.body.querySelector(".modal.is-active .modal-card");
async function clickModalButton(text) {
  const button = [...confirmModal().querySelectorAll("button")].find((b) => b.textContent.trim() === text);
  button.click();
  await flushPromises();
}

describe.skipIf(!SOURCE_MODE || !hasHostContract)("kit/KitTelegramDrawer.vue", () => {
  it("renders View read-only with a write-only token and no submit", async () => {
    mountRef();
    await openDrawer();

    expect(drawer().findAll("form")).toHaveLength(1);
    expect(drawer().find('[data-testid="telegram-submit"]').exists()).toBe(false);
    expect(drawer().findAll("input[type='text'], input[type='password'], textarea")).toHaveLength(0);
    expect(drawer().find('[data-testid="telegram-token-state"]').text()).toContain("не отображается");
  });

  it("disables the independent webhook action in Readonly", async () => {
    mountRef();
    await choose("edit");
    await choose("readonly");
    await openDrawer();
    expect(drawer().find('[data-testid="telegram-webhook"]').element.disabled).toBe(true);
  });

  it.each(["native", "shell + vee-validate"])(
    "submits Edit once with a single form in %s mode",
    async (modeLabel) => {
      vi.useFakeTimers();
      try {
        mountRef();
        await choose("edit");
        await choose(modeLabel);
        await openDrawer();
        expect(drawer().findAll("form")).toHaveLength(1);
        expect(drawer().findAll('[type="submit"]')).toHaveLength(1);

        await typeName("Новое имя");
        await drawer().find("form").trigger("submit");
        await drawer().find("form").trigger("submit");
        await vi.advanceTimersByTimeAsync(600);
        await flushPromises();

        expect(status()).toContain("Сохранений: 1");
        expect(isOpen()).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it("requires a name and a token in Create and keeps the draft on a validation error", async () => {
    vi.useFakeTimers();
    try {
      mountRef();
      await choose("create");
      await openDrawer();
      await drawer().find("form").trigger("submit");
      await flushPromises();

      expect(drawer().text()).toContain("Укажите название");
      expect(drawer().text()).toContain("Укажите токен");
      expect(status()).toContain("Сохранений: 0");
      expect(drawer().find('[data-testid="telegram-submit"]').text()).toBe("Создать");
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails the first submit with a long error, keeps the draft and succeeds on retry", async () => {
    vi.useFakeTimers();
    try {
      mountRef();
      await choose("edit");
      await choose("error");
      await openDrawer();
      await typeName("Черновик");

      await drawer().find("form").trigger("submit");
      await vi.advanceTimersByTimeAsync(600);
      await flushPromises();
      expect(isOpen()).toBe(true);
      expect(drawer().find("[role='alert']").text()).toContain("Telegram не принял запрос");
      expect(drawer().find("input[type='text']").element.value).toBe("Черновик");

      await drawer().find("form").trigger("submit");
      await vi.advanceTimersByTimeAsync(600);
      await flushPromises();
      expect(status()).toContain("Сохранений: 1");
      expect(isOpen()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops submit while busy and hides Save in Readonly", async () => {
    vi.useFakeTimers();
    try {
      mountRef();
      await choose("edit");
      await choose("busy");
      await openDrawer();
      await drawer().find("form").trigger("submit");
      await vi.advanceTimersByTimeAsync(600);
      await flushPromises();
      expect(status()).toContain("Сохранений: 0");
      expect(isOpen()).toBe(true);
      wrapper.unmount();
      document.body.innerHTML = "";

      mountRef();
      await choose("edit");
      await choose("readonly");
      await openDrawer();
      expect(drawer().find('[data-testid="telegram-submit"]').exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(["native", "shell + vee-validate"])(
    "denies close with a dirty %s draft until it is discarded",
    async (modeLabel) => {
      mountRef();
      await choose("edit");
      await choose(modeLabel);
      await openDrawer();
      await typeName("Черновик");

      drawer().find(".tr-form-drawer__close").element.click();
      await flushPromises();
      expect(confirmModal()).not.toBeNull();
      expect(isOpen()).toBe(true);

      await clickModalButton("Остаться");
      expect(isOpen()).toBe(true);
      expect(drawer().find("input[type='text']").element.value).toBe("Черновик");
      expect(document.documentElement.classList.contains("is-clipped")).toBe(true);

      drawer().find(".tr-form-drawer__close").element.click();
      await flushPromises();
      await clickModalButton("Выйти без сохранения");
      expect(isOpen()).toBe(false);
      expect(document.documentElement.classList.contains("is-clipped")).toBe(false);
    },
  );

  it("keeps the independent webhook action outside Save and resets welcome locally", async () => {
    mountRef();
    await choose("edit");
    await openDrawer();

    const section = drawer().find('[data-testid="telegram-independent"]');
    expect(section.find("button").attributes("type")).toBe("button");
    await section.find("button").trigger("click");
    expect(status()).toContain("отдельных операций: 1");
    expect(status()).toContain("Сохранений: 0");

    await drawer().find('[data-testid="telegram-reset-welcome"]').trigger("click");
    expect(drawer().find("[data-testid='telegram-inherited']").text()).toContain("Здравствуйте");
    expect(status()).toContain("Сохранений: 0");
  });
});
