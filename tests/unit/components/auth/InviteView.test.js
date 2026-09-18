import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import InviteView from "../../../../src/components/auth/InviteView.vue";
import { useAuthStore } from "../../../../src/stores/auth.js";
import { useDemoStore } from "../../../../src/stores/demo.js";

// jsdom has no `matchMedia` — `Loader.vue` reads it on mount (see
// tests/unit/components/Agents.test.js for the same fix).
if (typeof window.matchMedia !== "function") {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Task A7.5: `auth/InviteView.vue` применяет demo-режим только к найденному
// приглашению (`status === 'ready'`) — не к реальной валидации токена
// (`invalid`), тем же принципом, что "route-валидация побеждает над
// demo-режимом" в детальных shell'ах (Task A7.4/A7.5).
async function mountInviteView({ withPendingInvite = true, demoMode } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  if (withPendingInvite) {
    useAuthStore().setPendingInvite({
      token: "demo-token",
      kind: "workspace",
      workspaceName: "Демо-пространство",
    });
  }

  if (demoMode) {
    useDemoStore().setMode(demoMode);
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/auth/invite", name: "auth-invite", component: InviteView },
      { path: "/auth/login", name: "auth-login", component: { template: "<div />" } },
      { path: "/auth/signup", name: "auth-signup", component: { template: "<div />" } },
    ],
  });
  router.push("/auth/invite");
  await router.isReady();

  vi.useFakeTimers();
  const wrapper = mount(InviteView, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  await flushPromises();

  return { wrapper };
}

describe("InviteView.vue — demo-состояния (Task A7.5)", () => {
  it("ready показывает найденное приглашение", async () => {
    const { wrapper } = await mountInviteView();

    expect(wrapper.text()).toContain("Демо-пространство");
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("отсутствующий токен остаётся invalid независимо от demo-режима", async () => {
    const { wrapper } = await mountInviteView({ withPendingInvite: false, demoMode: "permission-denied" });

    expect(wrapper.text()).toContain("Приглашение недействительно");
    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(false);
  });

  it("permission-denied для найденного приглашения показывает отказ в доступе через AsyncState", async () => {
    const { wrapper } = await mountInviteView({ demoMode: "permission-denied" });

    expect(wrapper.find(".tr-async-state--permission-denied").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Принять приглашение");
  });

  it("partial показывает баннер и оставляет действия приглашения", async () => {
    const { wrapper } = await mountInviteView({ demoMode: "partial" });

    expect(wrapper.find(".message.is-warning").exists()).toBe(true);
    expect(wrapper.text()).toContain("Принять приглашение");
  });

  // Issue #9.1 ("Сделать login, signup и forgot плоскими"): `InviteView.vue`
  // is explicitly excluded from the flat variant — it must keep the default
  // `.tr-card` anatomy, unlike Login/Signup/Forgot.
  it("сохраняет card-анатомию (.tr-card), в отличие от Login/Signup/Forgot", async () => {
    const { wrapper } = await mountInviteView();

    const card = wrapper.find(".tr-auth__card");
    expect(card.exists()).toBe(true);
    expect(card.classes()).toContain("tr-card");
  });
});
