import { describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Buefy from "buefy";

import DialogsOverlays from "../../../../src/components/kit/DialogsOverlays.vue";

// Buefy's own `b-sidebar` (`position: fixed`, the default) moves its root
// element to `document.body` in its `mounted()` hook via a plain
// `appendChild` — not a Vue `<Teleport>` — the moment the component mounts,
// independent of open state. `FormDrawer`'s `<b-sidebar>` is unconditionally
// present in `DialogsOverlays.vue`'s template, so its content is always in
// the DOM (hidden with `v-show`/`display: none` while closed) and always a
// child of `document.body`, never a descendant of this component's mounted
// element. `wrapper.find(...)` therefore cannot see it — only a `DOMWrapper`
// rooted at `document.body` can.
function mountDialogsOverlays() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const wrapper = mount(DialogsOverlays, {
    global: {
      plugins: [pinia, Buefy],
    },
  });

  return { wrapper, pinia };
}

function bodyWrapper() {
  return new DOMWrapper(document.body);
}

function isDrawerVisible() {
  const content = document.body.querySelector(".tr-form-drawer .sidebar-content");
  return !!content && content.style.display !== "none";
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll("button").find((button) => button.text() === text);
}

async function openFormDrawer(wrapper) {
  await findButtonByText(wrapper, "Открыть форму в панели").trigger("click");
}

// Issue #4.3: `/kit` FormDrawer showcase — presentation-only reference for
// editing in a right-hand panel, distinct from the plain `b-sidebar`
// (non-form panel), `b-modal` (short form) and `b-dialog` (confirmation)
// sections on the same page.
describe("kit/DialogsOverlays.vue — FormDrawer showcase (Issue #4.3)", () => {
  it("opens the FormDrawer with visible header/body/footer and long form body", async () => {
    const { wrapper } = mountDialogsOverlays();

    expect(isDrawerVisible()).toBe(false);

    await openFormDrawer(wrapper);

    expect(isDrawerVisible()).toBe(true);
    const drawer = bodyWrapper().find(".tr-form-drawer");
    expect(drawer.find(".tr-form-drawer__title").text()).toBe("Правило уведомления");
    expect(drawer.find(".tr-form-drawer__body").exists()).toBe(true);
    expect(drawer.find(".tr-form-drawer__footer").text()).toContain("Сохранить");
    expect(drawer.find(".tr-form-drawer__footer").text()).toContain("Отмена");

    // Long body: more than a couple of fields, exercising the independently
    // scrolled body region rather than a short one-field form.
    expect(drawer.findAll(".field").length).toBeGreaterThanOrEqual(4);
  });

  it("closes the drawer from the footer secondary action without submitting", async () => {
    const { wrapper } = mountDialogsOverlays();

    await openFormDrawer(wrapper);
    expect(isDrawerVisible()).toBe(true);

    const footer = bodyWrapper().find(".tr-form-drawer__footer");
    const [cancelButton] = footer.findAll("button");
    await cancelButton.trigger("click");

    expect(isDrawerVisible()).toBe(false);
  });

  it("shows a busy submit state and closes on completion, without a store or API call", async () => {
    vi.useFakeTimers();
    try {
      const { wrapper } = mountDialogsOverlays();

      await openFormDrawer(wrapper);
      const form = bodyWrapper().find(".tr-form-drawer__form");
      await form.trigger("submit");

      // Busy: the primary footer action shows Buefy's own `is-loading`
      // affordance and a second submit is suppressed by FormDrawer itself.
      const footer = bodyWrapper().find(".tr-form-drawer__footer");
      const submitButton = footer.findAll("button").find((button) => button.text() === "Сохранить");
      expect(submitButton.classes()).toContain("is-loading");

      const pendingTimersAfterFirstSubmit = vi.getTimerCount();

      await form.trigger("submit");

      // A second submit while busy must not schedule a second save — if
      // FormDrawer's busy guard were removed, this would double the pending
      // timer count instead of staying the same.
      expect(vi.getTimerCount()).toBe(pendingTimersAfterFirstSubmit);

      await vi.advanceTimersByTimeAsync(600);
      await flushPromises();

      expect(isDrawerVisible()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the plain b-sidebar section for a non-form panel, separate from FormDrawer", () => {
    const { wrapper } = mountDialogsOverlays();

    const headings = wrapper.findAll(".tr-card__title").map((node) => node.text());
    expect(headings).toContain("Боковая панель");
    expect(headings).toContain("Форма в правой панели");
    expect(headings).toContain("Модальное окно");
    expect(headings).toContain("Диалог подтверждения");
  });
});
