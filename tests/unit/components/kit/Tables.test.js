import { afterEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import Tables from "../../../../src/components/kit/Tables.vue";
import DirtyExitModal from "../../../../src/components/common/DirtyExitModal.vue";

// `b-sidebar`/`b-dropdown` (`append-to-body`) both move their own DOM node
// to `document.body` via a plain `appendChild` in `mounted()` — outside
// this suite's own `wrapper`, so a previous test's drawer/dropdown would
// still answer body-rooted queries in a later test unless explicitly
// unmounted (their `beforeUnmount` does the matching `removeElement`).
let activeWrapper = null;

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = null;
});

async function mountTables() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const wrapper = mount(Tables, {
    global: {
      plugins: [pinia, Buefy],
    },
  });
  activeWrapper = wrapper;
  // `b-table-column` registers itself with the parent `b-table` after mount
  // (provide/inject resolved on the next tick) — without this, every column
  // renders as an empty comment node (see knowledge/Files.test.js).
  await flushPromises();

  return { wrapper, pinia };
}

function bodyWrapper() {
  return new DOMWrapper(document.body);
}

function isDrawerVisible() {
  const content = document.body.querySelector(".tr-form-drawer .sidebar-content");
  return !!content && content.style.display !== "none";
}

function normalizedText(wrapperNode) {
  return wrapperNode.text().replace(/\s+/g, " ").trim();
}

async function openEditDrawer(wrapper, rowName = "Консультант") {
  const editItem = bodyWrapper()
    .findAll(".dropdown-item")
    .find((item) => normalizedText(item) === `Редактировать ${rowName}`);
  await editItem.trigger("click");
}

// Handoff.2 (.todo строки 761-828, требование 2): FormDrawer открывается
// построчным действием таблицы — не отдельной кнопкой-витриной — и несёт
// realistic fields, required-валидацию, pending submit и dirty-exit boundary
// без сетевого API.
describe("kit/Tables.vue — редактирование в контексте страницы через FormDrawer (Handoff.2)", () => {
  it("построчное действие «Редактировать» открывает FormDrawer с данными строки", async () => {
    const { wrapper } = await mountTables();

    expect(isDrawerVisible()).toBe(false);

    await openEditDrawer(wrapper);

    expect(isDrawerVisible()).toBe(true);
    const drawer = bodyWrapper().find(".tr-form-drawer");
    expect(drawer.find(".tr-form-drawer__title").text()).toBe("Редактирование агента");
    expect(drawer.find("input").element.value).toBe("Консультант");
    // Long scrollable body: several fields, including a multi-row textarea.
    expect(drawer.findAll(".field").length).toBeGreaterThanOrEqual(4);
    expect(drawer.find("textarea").exists()).toBe(true);
  });

  it("пустое название блокирует сохранение required-валидацией", async () => {
    const { wrapper } = await mountTables();

    await openEditDrawer(wrapper);
    const drawer = bodyWrapper().find(".tr-form-drawer");
    await drawer.find("input").setValue("");

    expect(drawer.text()).toContain("Название не может быть пустым");

    // The Save button must visually reflect the invalid state (FormDrawer's
    // own `disabled` scoped-slot prop), not just block via the submit guard.
    const submitButton = drawer
      .findAll("button")
      .find((button) => normalizedText(button) === "Сохранить");
    expect(submitButton.attributes("disabled")).toBeDefined();

    // A submit attempt while invalid is a no-op: no save, no toast, drawer
    // stays open.
    const form = drawer.find(".tr-form-drawer__form");
    await form.trigger("submit");
    await flushPromises();

    expect(isDrawerVisible()).toBe(true);
    expect(wrapper.text()).toContain("Консультант");
  });

  it("закрытие с несохранёнными правками требует явного выбора dirty-exit", async () => {
    const { wrapper } = await mountTables();

    await openEditDrawer(wrapper);
    const drawer = bodyWrapper().find(".tr-form-drawer");
    await drawer.find("input").setValue("Консультант (изменено)");

    const cancelButton = drawer.findAll("button").find((button) => normalizedText(button) === "Отмена");
    await cancelButton.trigger("click");

    // Drawer stays open; the dirty-exit boundary (shared DirtyExitModal)
    // takes over instead of discarding silently.
    expect(isDrawerVisible()).toBe(true);
    const dirtyExitModal = wrapper.findComponent(DirtyExitModal);
    expect(dirtyExitModal.props("active")).toBe(true);

    await dirtyExitModal.vm.$emit("discard");
    await flushPromises();

    expect(isDrawerVisible()).toBe(false);
    // Discarded — the row keeps its original name.
    expect(wrapper.text()).toContain("Консультант");
    expect(wrapper.text()).not.toContain("Консультант (изменено)");
  });

  it("сохранение показывает pending submit и обновляет строку без сетевого API", async () => {
    vi.useFakeTimers();
    try {
      const { wrapper } = await mountTables();

      await openEditDrawer(wrapper);
      const drawer = bodyWrapper().find(".tr-form-drawer");
      await drawer.find("input").setValue("Консультант Pro");

      const form = drawer.find(".tr-form-drawer__form");
      await form.trigger("submit");

      const submitButton = drawer
        .findAll("button")
        .find((button) => normalizedText(button) === "Сохранить");
      expect(submitButton.classes()).toContain("is-loading");

      await vi.advanceTimersByTimeAsync(500);
      await flushPromises();

      expect(isDrawerVisible()).toBe(false);
      expect(wrapper.text()).toContain("Консультант Pro");
    } finally {
      vi.useRealTimers();
    }
  });
});
