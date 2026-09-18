import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import AdminMarker from "../../../../src/components/administration/AdminMarker.vue";
import { resolveAdminMarkerIcon } from "../../../../src/components/administration/adminMarkers.js";

// Task #12.1: shared presentation helper behind the five administration
// tables' role/status/protocol markers — covered directly here so the
// per-table tests in `catalogs.test.js` only need to assert wiring, not the
// resolution/fallback logic itself.

describe("resolveAdminMarkerIcon", () => {
  it("резолвит известные role/status/protocol значения", () => {
    expect(resolveAdminMarkerIcon("role", "Владелец")).toBe("crown-outline");
    expect(resolveAdminMarkerIcon("status", "Активен")).toBe("check-circle-outline");
    expect(resolveAdminMarkerIcon("status", "Ошибка")).toBe("alert-circle-outline");
    expect(resolveAdminMarkerIcon("status", "Архив")).toBe("archive-outline");
    expect(resolveAdminMarkerIcon("protocol", "openai")).toBe("openai");
    expect(resolveAdminMarkerIcon("protocol", "google")).toBe("gemini");
  });

  it("возвращает null для неизвестного домена или значения", () => {
    expect(resolveAdminMarkerIcon("unknown-domain", "Активен")).toBeNull();
    expect(resolveAdminMarkerIcon("status", "Совсем не статус")).toBeNull();
  });
});

describe("AdminMarker.vue", () => {
  it("показывает текст и decorative-иконку для известного значения", () => {
    const wrapper = mount(AdminMarker, { props: { domain: "status", value: "Активен" } });

    expect(wrapper.text()).toBe("Активен");
    expect(wrapper.find(".icon").exists()).toBe(true);
    expect(wrapper.findComponent({ name: "Icon" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "Icon" }).attributes("aria-hidden")).toBe("true");
  });

  it("сохраняет текст без иконки, если значение не сопоставлено", () => {
    const wrapper = mount(AdminMarker, { props: { domain: "status", value: "Совсем не статус" } });

    expect(wrapper.text()).toBe("Совсем не статус");
    expect(wrapper.find(".icon").exists()).toBe(false);
  });
});
