import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";

import Help from "../../../../src/components/profile/Help.vue";

// Task A10.8 (`.plan` item 7): a permanent, route-backed help screen — static
// reference content, no fixture/store, always reachable regardless of any
// first-visit tip elsewhere in the kit.
describe("profile/Help.vue (Task A10.8)", () => {
  it("рендерит термины кабинета без переименования", () => {
    const wrapper = mount(Help, { global: { plugins: [Buefy] } });

    for (const term of ["Агент", "Песочница", "Знания", "Пространство"]) {
      expect(wrapper.text()).toContain(term);
    }
  });

  it("рендерит хотя бы один типовой сценарий с действием", () => {
    const wrapper = mount(Help, { global: { plugins: [Buefy] } });

    expect(wrapper.findAll(".tr-help__scenario").length).toBeGreaterThan(0);
  });
});
