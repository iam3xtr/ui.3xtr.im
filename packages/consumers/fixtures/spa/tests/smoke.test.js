// Isolated consumer smoke test: mounts a real tree built purely from the
// packed `@iam3xtr/ui`/`@iam3xtr/vue` tarballs installed into this fixture's
// own node_modules (see ../../scripts/run-matrix.mjs) — no import path
// reaches back into the ui-kit workspace or the packages/* submodule
// checkouts.
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";
import { provideIconRegistry } from "@iam3xtr/vue";
import App from "../src/App.vue";

async function mountApp() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/", component: { template: "<div />" } }],
  });
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [
        Buefy,
        router,
        {
          install(app) {
            provideIconRegistry(app, {});
          },
        },
      ],
    },
  });
  await router.isReady();
  return wrapper;
}

// Buefy opens a dropdown from a `setTimeout` inside its toggle and
// ModelSelect focuses the search field a tick later; settle both.
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// Drives one ModelSelect instance end to end from the packed tarball:
// open (ArrowDown on the trigger), focus lands on the search input, a
// click on a rendered recommendation selects it, the popup closes and
// focus returns to the trigger, which then shows the canonical name and
// the parent's `v-model:model-id` binding holds the selected id.
async function exerciseModelSelect(wrapper, rootSelector, { portal, bound }) {
  const root = wrapper.find(rootSelector);
  expect(root.exists()).toBe(true);
  const trigger = root.find("button.tr-model-select__trigger");
  expect(trigger.text()).toBe("GPT");
  expect(wrapper.vm[bound]).toBe("gpt");
  expect(trigger.attributes("aria-expanded")).toBe("false");

  await trigger.trigger("keydown", { key: "ArrowDown" });
  await settle();
  expect(root.classes()).toContain("tr-model-select--open");
  expect(trigger.attributes("aria-expanded")).toBe("true");

  const popup = document.getElementById(trigger.attributes("aria-controls"));
  expect(popup).not.toBeNull();
  const search = popup.querySelector("input");
  expect(search).not.toBeNull();
  expect(document.activeElement).toBe(search);

  // Overlay contract from `useDropdownOverlay`: the menu carries the
  // overlay marker; under a clipping ancestor it lives in a body portal
  // wrapper marked for the theme, outside the component root.
  const menu = popup.closest(".dropdown-menu");
  expect(menu).not.toBeNull();
  expect(menu.classList.contains("tr-dropdown-overlay")).toBe(true);
  const portalWrapper = menu.closest(".tr-dropdown-overlay-portal");
  if (portal) {
    expect(portalWrapper).not.toBeNull();
    expect(root.element.contains(popup)).toBe(false);
  } else {
    expect(portalWrapper).toBeNull();
    expect(root.element.contains(popup)).toBe(true);
  }

  const option = [...popup.querySelectorAll(".tr-model-select__option")].find((el) =>
    el.textContent.includes("Claude"),
  );
  expect(option).toBeTruthy();
  option.closest(".dropdown-item").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();

  expect(root.classes()).not.toContain("tr-model-select--open");
  expect(trigger.attributes("aria-expanded")).toBe("false");
  expect(trigger.text()).toBe("Claude");
  expect(wrapper.vm[bound]).toBe("claude");
  expect(document.activeElement).toBe(trigger.element);
}

describe("consumer SPA fixture", () => {
  it("mounts without throwing and renders the expected markup", async () => {
    const wrapper = await mountApp();

    expect(wrapper.find(".tr-page-header").exists()).toBe(true);
    expect(wrapper.find(".tr-loader").exists()).toBe(true);
    // "cog" is neither in the (empty here) injected consumer registry nor
    // in @iam3xtr/ui's default SVG set — with Buefy installed (as this
    // fixture does), Icon falls through to its Buefy/MDI fallback instead
    // of the placeholder, proving that precedence step end to end from a
    // packed install, not just from the package's own source-level tests.
    expect(wrapper.find(".tr-icon--placeholder").exists()).toBe(false);
    expect(wrapper.find(".mdi-cog").exists()).toBe(true);

    // Stage 1 `.plan` "Floating dropdowns": ToolbarDropdown and
    // MobileFilters (inline unless clipped) ship as public exports of `@iam3xtr/vue`
    // and mount without source aliases. The fixture exercises them next to
    // the viewport edge so a future browser smoke run can catch auto-flip
    // regressions against the published tarball; the unit-level flip,
    // marker and z-index behaviour is covered by focused tests inside
    // `@iam3xtr/vue`.
    expect(wrapper.find(".tr-toolbar-dropdown").exists()).toBe(true);
    expect(wrapper.find(".tr-mobile-filters").exists()).toBe(true);
    expect(wrapper.find(".tr-toolbar-dropdown__trigger").exists()).toBe(true);
    expect(wrapper.find(".tr-mobile-filters__trigger").exists()).toBe(true);

    wrapper.unmount();
  });

  // Stage 2.1 `ModelSelect` from the packed tarball, run by
  // run-matrix.mjs against each supported Buefy version.
  it("ModelSelect opens, focuses search, selects and closes inline", async () => {
    const wrapper = await mountApp();
    await exerciseModelSelect(wrapper, ".tr-consumer-flow__model-inline", { portal: false, bound: "inlineModelId" });
    wrapper.unmount();
  });

  it("ModelSelect opens, focuses search, selects and closes in a body portal", async () => {
    const wrapper = await mountApp();
    await exerciseModelSelect(wrapper, ".tr-consumer-flow__model-portal", { portal: true, bound: "portalModelId" });
    wrapper.unmount();
    // The Buefy portal wrapper is removed together with the component.
    expect(document.querySelector(".tr-dropdown-overlay-portal")).toBeNull();
  });
});

// Stage 2.2 BYOK modes from the packed tarball. Helpers drive the real
// DOM only (no component internals): open via ArrowDown on the trigger,
// type into the single search row, commit a free-form id with Enter.
async function openPicker(root) {
  const trigger = root.find("button.tr-model-select__trigger");
  await trigger.trigger("keydown", { key: "ArrowDown" });
  await settle();
  expect(root.classes()).toContain("tr-model-select--open");
  const popup = document.getElementById(trigger.attributes("aria-controls"));
  expect(popup).not.toBeNull();
  return { trigger, popup };
}

async function pickRecommendation(popup, name) {
  const option = [...popup.querySelectorAll(".tr-model-select__option")].find((el) =>
    el.textContent.includes(name),
  );
  expect(option).toBeTruthy();
  option.closest(".dropdown-item").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await settle();
}

async function commitFreeform(popup, query) {
  const search = popup.querySelector("input:not([type=checkbox])");
  search.value = query;
  search.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  // No consumer search results: the free-form action is offered.
  expect(popup.querySelector(".tr-model-select__freeform-action")).not.toBeNull();
  search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await settle();
}

describe("consumer SPA fixture: ModelSelect BYOK modes", () => {
  it("mode=byok: slot, catalog pick and free-form Enter keep ids exclusive", async () => {
    const wrapper = await mountApp();
    const root = wrapper.find(".tr-consumer-flow__model-byok");
    expect(root.exists()).toBe(true);
    // No switch outside mode=both.
    expect(root.find(".tr-model-select__switch").exists()).toBe(false);

    let { trigger, popup } = await openPicker(root);
    // Consumer-owned byok-key slot is rendered inside the popup.
    expect(popup.querySelector(".tr-model-select__byok-key .tr-consumer-flow__byok-key-input")).not.toBeNull();

    // Catalog BYOK pick → byokModelId, clears the free-form id.
    await pickRecommendation(popup, "Claude");
    expect(wrapper.vm.byokModelId).toBe("claude");
    expect(wrapper.vm.byokProviderModelId).toBeNull();
    expect(trigger.text()).toBe("Claude");
    expect(root.classes()).not.toContain("tr-model-select--open");

    // Free-form id committed with Enter → providerModelId, clears byokModelId.
    ({ trigger, popup } = await openPicker(root));
    await commitFreeform(popup, "  acme/model-x  ");
    expect(wrapper.vm.byokProviderModelId).toBe("acme/model-x");
    expect(wrapper.vm.byokModelId).toBeNull();
    expect(trigger.text()).toBe("acme/model-x");
    expect(root.classes()).not.toContain("tr-model-select--open");
    expect(document.activeElement).toBe(trigger.element);

    wrapper.unmount();
  });

  it("mode=both: the switch flips useOwnApiKey without erasing hidden ids", async () => {
    const wrapper = await mountApp();
    const root = wrapper.find(".tr-consumer-flow__model-both");
    expect(root.exists()).toBe(true);

    let { trigger, popup } = await openPicker(root);
    expect(trigger.text()).toBe("GPT");
    const switchInput = popup.querySelector(".tr-model-select__switch-input");
    expect(switchInput).not.toBeNull();
    expect(switchInput.checked).toBe(false);

    switchInput.click();
    await settle();
    expect(wrapper.vm.bothUseOwnApiKey).toBe(true);
    expect(wrapper.vm.bothModelId).toBe("gpt");
    expect(wrapper.vm.bothByokModelId).toBe("claude");
    expect(wrapper.vm.bothProviderModelId).toBeNull();
    expect(trigger.text()).toBe("Claude");

    // BYOK scope: free-form Enter commits providerModelId, clears only
    // byokModelId; the hidden regular modelId stays.
    await commitFreeform(popup, "acme/model-y");
    expect(wrapper.vm.bothProviderModelId).toBe("acme/model-y");
    expect(wrapper.vm.bothByokModelId).toBeNull();
    expect(wrapper.vm.bothModelId).toBe("gpt");
    expect(trigger.text()).toBe("acme/model-y");

    // Switch back: regular scope shows modelId, BYOK draft is preserved.
    ({ trigger, popup } = await openPicker(root));
    const switchAgain = popup.querySelector(".tr-model-select__switch-input");
    expect(switchAgain.checked).toBe(true);
    switchAgain.click();
    await settle();
    expect(wrapper.vm.bothUseOwnApiKey).toBe(false);
    expect(wrapper.vm.bothModelId).toBe("gpt");
    expect(wrapper.vm.bothProviderModelId).toBe("acme/model-y");
    expect(wrapper.vm.bothByokModelId).toBeNull();
    expect(trigger.text()).toBe("GPT");

    wrapper.unmount();
  });
});
