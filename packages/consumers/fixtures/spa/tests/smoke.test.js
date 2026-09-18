// Isolated consumer smoke test: mounts a real tree built purely from the
// packed `@iam3xtr/ui`/`@iam3xtr/vue` tarballs installed into this fixture's
// own node_modules (see ../../scripts/run-matrix.mjs) — no import path
// reaches back into the ui-kit workspace or the packages/* submodule
// checkouts.
import { describe, expect, it } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";
import { provideIconRegistry } from "@iam3xtr/vue";
import App from "../src/App.vue";

describe("consumer SPA fixture", () => {
  it("mounts without throwing and renders the expected markup", async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: "/", component: { template: "<div />" } }],
    });
    const wrapper = mount(App, {
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

    expect(wrapper.find(".tr-page-header").exists()).toBe(true);
    expect(wrapper.find(".tr-loader").exists()).toBe(true);
    // "cog" is neither in the (empty here) injected consumer registry nor
    // in @iam3xtr/ui's default SVG set — with Buefy installed (as this
    // fixture does), Icon falls through to its Buefy/MDI fallback instead
    // of the placeholder, proving that precedence step end to end from a
    // packed install, not just from the package's own source-level tests.
    expect(wrapper.find(".tr-icon--placeholder").exists()).toBe(false);
    expect(wrapper.find(".mdi-cog").exists()).toBe(true);
  });
});
