import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import ForgotView from "../../../../src/components/auth/ForgotView.vue";

async function mountForgotView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/auth/forgot", name: "auth-forgot", component: ForgotView },
      { path: "/auth/login", name: "auth-login", component: { template: "<div />" } },
    ],
  });
  router.push("/auth/forgot");
  await router.isReady();

  const wrapper = mount(ForgotView, {
    global: { plugins: [router] },
  });

  return { wrapper };
}

// Issue #9.1 ("Сделать login, signup и forgot плоскими"): regression guard on
// the actual view, not just `AuthPage.vue` in isolation — `ForgotView.vue`
// must keep passing `flat` to `AuthPage`, so `.tr-auth__card` never carries
// `.tr-card` (background/border/radius/shadow) here.
describe("ForgotView.vue — flat variant (Issue #9.1)", () => {
  it("не несёт card-анатомию (.tr-card)", async () => {
    const { wrapper } = await mountForgotView();

    const card = wrapper.find(".tr-auth__card");
    expect(card.exists()).toBe(true);
    expect(card.classes()).not.toContain("tr-card");
  });
});
