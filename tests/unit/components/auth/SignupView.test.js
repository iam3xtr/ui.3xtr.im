import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import SignupView from "../../../../src/components/auth/SignupView.vue";
import { useAuthStore } from "../../../../src/stores/auth.js";

async function mountSignupView({ withPendingInvite = false } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  if (withPendingInvite) {
    useAuthStore().setPendingInvite({
      token: "demo-token",
      kind: "workspace",
      workspaceName: "Trickster Team",
    });
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/auth/signup", name: "auth-signup", component: SignupView },
      { path: "/auth/login", name: "auth-login", component: { template: "<div />" } },
    ],
  });
  router.push("/auth/signup");
  await router.isReady();

  const wrapper = mount(SignupView, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });

  return { wrapper, router };
}

// Task A10.7 ("Self-registration формирует редактируемое default workspace
// name и передаёт поле fixture-контракту"): the field pre-fills as the
// person types their name instead of staying an empty required field, but
// remains editable — a manual edit stops the auto-fill from overwriting it.
describe("SignupView.vue — редактируемое default workspace name (Task A10.7)", () => {
  it("предзаполняет название пространства по имени по умолчанию", async () => {
    const { wrapper } = await mountSignupView();

    const [nameInput, workspaceInput] = wrapper.findAll("input");
    await nameInput.setValue("Мария Кузнецова");

    expect(workspaceInput.element.value).toBe("Пространство Мария");
  });

  it("ручное редактирование поля пространства останавливает автозаполнение", async () => {
    const { wrapper } = await mountSignupView();

    const [nameInput, workspaceInput] = wrapper.findAll("input");
    await nameInput.setValue("Мария");
    await workspaceInput.setValue("Своё пространство");
    await nameInput.setValue("Мария Кузнецова");

    expect(workspaceInput.element.value).toBe("Своё пространство");
  });

  it("workspace-инвайт скрывает поле пространства и не отправляет его в fixture-контракт", async () => {
    const { wrapper } = await mountSignupView({ withPendingInvite: true });
    const authStore = useAuthStore();
    const signupSpy = vi.spyOn(authStore, "signup").mockResolvedValue();

    const inputs = wrapper.findAll("input");
    // Без поля пространства форма — имя/email/пароль/повтор.
    expect(inputs).toHaveLength(4);

    await inputs[0].setValue("Мария Кузнецова");
    await inputs[1].setValue("maria@example.com");
    await inputs[2].setValue("supersecret1");
    await inputs[3].setValue("supersecret1");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(signupSpy).toHaveBeenCalledTimes(1);
    const payload = signupSpy.mock.calls[0][0];
    expect(payload.workspace).toBeUndefined();
    expect(payload.inviteToken).toBe("demo-token");
  });
});
