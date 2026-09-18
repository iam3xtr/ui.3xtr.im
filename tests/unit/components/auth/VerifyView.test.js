import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import VerifyView from "../../../../src/components/auth/VerifyView.vue";

async function mountVerifyView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/auth/verify/:token?", name: "auth-verify", component: VerifyView },
      { path: "/auth/login", name: "auth-login", component: { template: "<div />" } },
    ],
  });
  router.push("/auth/verify");
  await router.isReady();

  const wrapper = mount(VerifyView, {
    global: { plugins: [router] },
  });

  return { wrapper };
}

// Issue #9.1 ("Сделать login, signup и forgot плоскими"): `VerifyView.vue` is
// explicitly excluded from the flat variant — it must keep the default
// `.tr-card` anatomy, unlike Login/Signup/Forgot.
describe("VerifyView.vue — card anatomy unchanged (Issue #9.1)", () => {
  it("сохраняет card-анатомию (.tr-card), в отличие от Login/Signup/Forgot", async () => {
    const { wrapper } = await mountVerifyView();

    const card = wrapper.find(".tr-auth__card");
    expect(card.exists()).toBe(true);
    expect(card.classes()).toContain("tr-card");
  });
});
