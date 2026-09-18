import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import AuthPage from "../../../../src/components/auth/AuthPage.vue";

// Issue #9.1 ("Сделать login, signup и forgot плоскими"): `AuthPage.vue`
// применяет card-анатомию (`.tr-card` — background/border/radius/padding/
// shadow из `theme.scss`, раздел 8 «Cards and catalogs») только по
// умолчанию; узкий `flat`-variant убирает исключительно этот класс, сохраняя
// `.tr-auth__card` — он не декоративный, только задаёт центрированную
// адаптивную колонку. `Invite`/`VerifyView` не передают `flat` и должны
// остаться card-layout без изменений (см. `LoginView`/`SignupView`/
// `ForgotView.vue`, которые передают `flat`).
describe("AuthPage.vue — flat variant (Issue #9.1)", () => {
  it("по умолчанию сохраняет card-анатомию для Invite/Verify", () => {
    const wrapper = mount(AuthPage, {
      slots: { default: "<p>content</p>" },
    });

    const card = wrapper.find(".tr-auth__card");
    expect(card.classes()).toContain("tr-card");
  });

  it("flat убирает класс .tr-card у Login/Signup/Forgot, сохраняя центрированную колонку", () => {
    const wrapper = mount(AuthPage, {
      props: { flat: true },
      slots: { default: "<p>content</p>" },
    });

    const card = wrapper.find(".tr-auth__card");
    expect(card.classes()).not.toContain("tr-card");
    expect(card.exists()).toBe(true);
  });
});
