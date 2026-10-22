// Mounts the Chat-target shell from the packed tarballs only: core exports,
// one Buefy install, the public icon registry and theme CSS, no Router.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";
import { provideIconRegistry } from "@iam3xtr/vue";
import { icons } from "@iam3xtr/ui/icons";
import App from "../src/App.vue";

function mountApp(props = {}) {
  return mount(App, {
    props,
    attachTo: document.body,
    global: { plugins: [Buefy, { install: (app) => provideIconRegistry(app, icons) }] },
  });
}

describe("chat spa fixture", () => {
  it("mounts standalone and embedded with the same app contract", () => {
    const standalone = mountApp();
    expect(standalone.get(".chat-shell").attributes("data-embedded")).toBe("false");
    expect(standalone.find(".tr-chat-history").exists()).toBe(true);
    expect(standalone.find(".tr-message-composer").exists()).toBe(true);
    expect(standalone.find("svg").exists()).toBe(true);
    standalone.unmount();

    const embedded = mountApp({ embedded: true });
    expect(embedded.get(".chat-shell").attributes("data-embedded")).toBe("true");
    expect(embedded.find(".tr-chat-history").exists()).toBe(true);
    embedded.unmount();
  });

  it("renders long unbroken text and switches the root theme from the toolbar", async () => {
    const wrapper = mountApp();
    expect(wrapper.text()).toContain("A_very_long_unbroken_message_");
    await wrapper.get('[data-theme-mode="dark"]').trigger("click");
    expect(document.documentElement.dataset.theme).toBe("dark");
    await wrapper.get('[data-theme-mode="light"]').trigger("click");
    expect(document.documentElement.dataset.theme).toBe("light");
    wrapper.unmount();
  });

  it("submits a draft through the composer", async () => {
    const wrapper = mountApp();
    const textarea = wrapper.get("textarea");
    await textarea.setValue("ping");
    await textarea.trigger("keydown", { key: "Enter" });
    await nextTick();
    expect(wrapper.vm.submitted).toEqual(["ping"]);
    wrapper.unmount();
  });

  it("ships the public theme and icon assets from the packed UI package", () => {
    const css = readFileSync(path.join(process.cwd(), "node_modules", "@iam3xtr", "ui", "dist", "theme.css"), "utf8");
    expect(css).toContain("data-theme");
    expect(Object.keys(icons).length).toBeGreaterThan(0);
    expect(existsSync(path.join(process.cwd(), "node_modules", "@iam3xtr", "ui", "dist", "tokens.css"))).toBe(true);
  });
});
