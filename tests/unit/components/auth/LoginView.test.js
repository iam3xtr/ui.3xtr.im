import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import LoginView from "../../../../src/components/auth/LoginView.vue";

async function mountLoginView() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/auth/login", name: "auth-login", component: LoginView },
      { path: "/auth/signup", name: "auth-signup", component: { template: "<div />" } },
      { path: "/auth/invite", name: "auth-invite", component: { template: "<div />" } },
      { path: "/", name: "dashboard", component: { template: "<div />" } },
    ],
  });
  router.push("/auth/login");
  await router.isReady();

  const wrapper = mount(LoginView, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });

  return { wrapper };
}

// Issue #9.1 ("Сделать login, signup и forgot плоскими"): regression guard on
// the actual view, not just `AuthPage.vue` in isolation — `LoginView.vue`
// must keep passing `flat` to `AuthPage`, so `.tr-auth__card` never carries
// `.tr-card` (background/border/radius/shadow) here.
describe("LoginView.vue — flat variant (Issue #9.1)", () => {
  it("не несёт card-анатомию (.tr-card)", async () => {
    const { wrapper } = await mountLoginView();

    const card = wrapper.find(".tr-auth__card");
    expect(card.exists()).toBe(true);
    expect(card.classes()).not.toContain("tr-card");
  });
});
