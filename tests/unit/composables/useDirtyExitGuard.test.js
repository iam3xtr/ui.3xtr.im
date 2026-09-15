import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { defineComponent, h } from "vue";

import { useDirtyExitGuard } from "../../../src/composables/useDirtyExitGuard";

// Task A10.1: dirty-exit guard for route navigation — "Сохранить / Выйти
// без сохранения / Остаться" must not lose input on an in-app route change
// unless the user explicitly picks one of the three. Each test builds a
// tiny host route component using the composable directly (no markup),
// mirroring how `WorkspaceSettings.vue`/`profile/Settings.vue`/
// `knowledge/Settings.vue`/`agents/AgentSettings.vue` consume it.
function makeFormRoute({ isDirty, onSave, onDiscard }) {
  return defineComponent({
    setup() {
      const guard = useDirtyExitGuard({ isDirty, onSave, onDiscard });
      return () => h("div", [
        h("span", { class: "active" }, String(guard.active.value)),
        h("button", { class: "save", onClick: guard.confirmSave }, "save"),
        h("button", { class: "discard", onClick: guard.confirmDiscard }, "discard"),
        h("button", { class: "stay", onClick: guard.stay }, "stay"),
      ]);
    },
  });
}

async function mountWithRouter(formRoute) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/form", name: "form", component: formRoute },
      { path: "/elsewhere", name: "elsewhere", component: { template: "<div>elsewhere</div>" } },
    ],
  });

  const App = defineComponent({
    setup() {
      return () => h(RouterView);
    },
  });

  const wrapper = mount(App, { global: { plugins: [router] } });
  router.push("/form");
  await router.isReady();
  await flushPromises();

  return { wrapper, router };
}

describe("composables/useDirtyExitGuard", () => {
  it("lets navigation through untouched when the form is clean", async () => {
    const { router } = await mountWithRouter(makeFormRoute({ isDirty: () => false }));

    await router.push("/elsewhere");

    expect(router.currentRoute.value.name).toBe("elsewhere");
  });

  it("blocks navigation and opens the three-way dialog when dirty", async () => {
    const { wrapper, router } = await mountWithRouter(makeFormRoute({ isDirty: () => true }));

    const navigation = router.push("/elsewhere");
    await flushPromises();

    // Still on the form route — the guard has not been resolved yet.
    expect(router.currentRoute.value.name).toBe("form");
    expect(wrapper.find(".active").text()).toBe("true");

    await wrapper.find(".stay").trigger("click");
    await navigation;

    expect(router.currentRoute.value.name).toBe("form");
  });

  it("\"Выйти без сохранения\" discards and lets navigation proceed", async () => {
    const onDiscard = vi.fn();
    const { wrapper, router } = await mountWithRouter(
      makeFormRoute({ isDirty: () => true, onDiscard }),
    );

    const navigation = router.push("/elsewhere");
    await flushPromises();

    await wrapper.find(".discard").trigger("click");
    await navigation;

    expect(onDiscard).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.name).toBe("elsewhere");
  });

  it("\"Сохранить\" only lets navigation proceed once the save actually succeeds", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false });
    const { wrapper, router } = await mountWithRouter(
      makeFormRoute({ isDirty: () => true, onSave }),
    );

    const navigation = router.push("/elsewhere");
    await flushPromises();

    await wrapper.find(".save").trigger("click");
    await navigation;

    expect(onSave).toHaveBeenCalledOnce();
    // A failed/conflicted save must not leave the form — the user still
    // needs to see and resolve it.
    expect(router.currentRoute.value.name).toBe("form");
  });

  it("a successful save lets the pending navigation complete", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    const { wrapper, router } = await mountWithRouter(
      makeFormRoute({ isDirty: () => true, onSave }),
    );

    const navigation = router.push("/elsewhere");
    await flushPromises();

    await wrapper.find(".save").trigger("click");
    await navigation;

    expect(router.currentRoute.value.name).toBe("elsewhere");
  });
});
