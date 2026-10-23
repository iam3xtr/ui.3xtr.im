import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Buefy from "buefy";

const SOURCE_MODE = import.meta.env.MODE === "development";
let wrapper;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("Metric anatomy reference gating", () => {
  it("is reachable only through a development-mode dynamic import", () => {
    const overview = readFileSync("src/components/kit/Overview.vue", "utf8");
    expect(overview).not.toMatch(/^import\s.*KitMetricCards/m);
    expect(overview).toMatch(/import\.meta\.env\.MODE === "development"/);
    expect(overview).toMatch(/import\("\.\/KitMetricCards\.vue"\)/);
  });

  it("keeps the Dashboard on legacy grid classes as the published-pin fallback", () => {
    const dashboard = readFileSync("src/components/Dashboard.vue", "utf8");
    expect(dashboard).toMatch(/tr-grid tr-grid--3 tr-dashboard-grid tr-metric-grid__items/);
  });
});

describe.skipIf(!SOURCE_MODE)("kit/KitMetricCards.vue (source mode)", () => {
  async function mountReference() {
    const { default: Cards } = await import("../../../../src/components/kit/KitMetricCards.vue");
    wrapper = mount(Cards, { attachTo: document.body, global: { plugins: [Buefy] } });
    return wrapper;
  }

  it("renders six metrics with distinct states and zero versus unknown", async () => {
    await mountReference();
    expect(wrapper.findAll(".tr-metric")).toHaveLength(6);
    expect(wrapper.get('[data-testid="metric-zero"] .tr-metric__value').text()).toBe("0");
    expect(wrapper.get('[data-testid="metric-unknown"] .tr-metric__value').text()).toBe("—");
    expect(wrapper.get('[data-testid="metric-unknown"]').classes()).toContain("tr-metric--unavailable");
    expect(wrapper.get('[data-testid="metric-pending"]').attributes("aria-busy")).toBe("true");
  });

  it("keeps one primary link and no nested interactive content", async () => {
    await mountReference();
    const card = wrapper.get('[data-testid="metric-clickable"]');
    expect(card.element.tagName).toBe("ARTICLE");
    expect(card.findAll("a")).toHaveLength(1);
    const button = card.get("button.tr-metric__secondary");
    expect(button.attributes("type")).toBe("button");
    expect(card.get("a").element.contains(button.element)).toBe(false);
    expect(wrapper.findAll(".tr-metric--readonly a")).toHaveLength(0);
  });

  it("limits the container width through the host, not the viewport", async () => {
    await mountReference();
    expect(wrapper.get('[data-testid="metric-host"]').attributes("style")).toContain("max-width: 100%");
    await wrapper.get('[data-testid="metric-width"] select, select[data-testid="metric-width"]').setValue("320px");
    expect(wrapper.get('[data-testid="metric-host"]').attributes("style")).toContain("max-width: 320px");
  });
});
