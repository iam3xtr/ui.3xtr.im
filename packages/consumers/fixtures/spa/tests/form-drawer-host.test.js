// `FormDrawer` host contract from the packed tarballs on real Buefy: one close
// guard for Escape, backdrop and the header button; denied or pending
// requests keep the panel and draft; the requested width reaches the panel.
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import Buefy from "buefy";
import { provideIconRegistry } from "@iam3xtr/vue";
import ShellDrawer from "../src/ShellDrawer.vue";

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});

function mountHost(props) {
  wrapper = mount(ShellDrawer, {
    attachTo: document.body,
    props: { onSave: vi.fn(), ...props },
    global: {
      plugins: [
        Buefy,
        {
          install(app) {
            provideIconRegistry(app, {});
          },
        },
      ],
    },
  });
  return document.body.querySelector(".tr-form-drawer");
}

const isOpen = () => wrapper.vm.open;
const escape = () => document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
const backdrop = () => document.body.querySelector(".sidebar-background").click();
const closeButton = () => document.body.querySelector(".tr-form-drawer__close").click();
const paths = { Escape: escape, backdrop, "close button": closeButton };

describe("FormDrawer host close guard", () => {
  it.each(Object.keys(paths))("denied guard keeps the drawer and draft open on %s", async (name) => {
    const beforeClose = vi.fn(() => false);
    const drawer = mountHost({ beforeClose });
    await flushPromises();
    const input = drawer.querySelector(".tr-consumer-shell__name");
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    paths[name]();
    await flushPromises();

    expect(beforeClose).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(true);
    expect(drawer.querySelector(".tr-consumer-shell__name").value).toBe("Ada");
  });

  it("joins repeated requests to one pending guard and closes once when allowed", async () => {
    let allow;
    const beforeClose = vi.fn(() => new Promise((resolve) => (allow = resolve)));
    mountHost({ beforeClose });
    await flushPromises();

    escape();
    backdrop();
    closeButton();
    await flushPromises();
    expect(beforeClose).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(true);

    allow(true);
    await flushPromises();
    expect(isOpen()).toBe(false);
  });

  it("applies the requested width through the panel custom property", async () => {
    const drawer = mountHost({ width: "42rem" });
    await flushPromises();
    expect(drawer.getAttribute("style")).toContain("--tr-form-drawer-width: 42rem");
  });
});
