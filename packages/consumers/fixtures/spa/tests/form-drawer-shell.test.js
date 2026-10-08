// `FormDrawer shell` with a real vee-validate `<Form>` from the packed
// tarballs: exactly one form element, invalid submit sends nothing, valid
// submit calls the handler once.
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import Buefy from "buefy";
import { provideIconRegistry } from "@iam3xtr/vue";
import ShellDrawer from "../src/ShellDrawer.vue";

let wrapper;
afterEach(() => wrapper?.unmount());

function mountShell(onSave) {
  wrapper = mount(ShellDrawer, {
    attachTo: document.body,
    props: { onSave },
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
  // b-sidebar moves its element to document.body.
  return document.body.querySelector(".tr-form-drawer");
}

describe("FormDrawer shell with vee-validate", () => {
  it("renders exactly one form element", async () => {
    const drawer = mountShell(vi.fn());
    await flushPromises();
    expect(drawer.querySelectorAll("form")).toHaveLength(1);
    expect(drawer.querySelector("form .tr-form-drawer__body")).not.toBeNull();
    expect(drawer.querySelector("form .tr-form-drawer__footer")).not.toBeNull();
  });

  it("does not submit invalid input and submits valid input once", async () => {
    const onSave = vi.fn();
    const drawer = mountShell(onSave);
    await flushPromises();

    drawer.querySelector(".tr-consumer-shell__save").click();
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(drawer.querySelector(".tr-consumer-shell__error").textContent).toContain("required");

    const input = drawer.querySelector(".tr-consumer-shell__name");
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    drawer.querySelector(".tr-consumer-shell__save").click();
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toEqual({ name: "Ada" });
  });
});
