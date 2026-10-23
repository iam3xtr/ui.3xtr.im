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

describe("Recent cards reference gating", () => {
  it("is reachable only through a development-mode dynamic import", () => {
    const overview = readFileSync("src/components/kit/Overview.vue", "utf8");
    expect(overview).not.toMatch(/^import\s.*KitRecentCards/m);
    expect(overview).toMatch(/import\("\.\/KitRecentCards\.vue"\)/);
  });

  it("keeps the Dashboard on legacy grid classes as the published-pin fallback", () => {
    const dashboard = readFileSync("src/components/Dashboard.vue", "utf8");
    expect(dashboard).toMatch(/tr-grid tr-grid--2 tr-recent-grid__items/);
  });
});

describe.skipIf(!SOURCE_MODE)("kit/KitRecentCards.vue (source mode)", () => {
  async function mountReference() {
    const { default: Cards } = await import("../../../../src/components/kit/KitRecentCards.vue");
    wrapper = mount(Cards, { attachTo: document.body, global: { plugins: [Buefy] } });
    return wrapper;
  }

  it("renders many, one, empty, loading and error states", async () => {
    await mountReference();
    expect(wrapper.findAll('[data-testid="recent-many"] tbody tr')).toHaveLength(3);
    expect(wrapper.findAll('[data-testid="recent-one"] tbody tr')).toHaveLength(1);
    expect(wrapper.get('[data-testid="recent-empty"] .tr-recent__state').text()).toContain("Пока ничего нет");
    expect(wrapper.get('[data-testid="recent-loading"]').attributes("aria-busy")).toBe("true");
    expect(wrapper.get('[data-testid="recent-error"] [role="alert"]').exists()).toBe(true);
  });

  it("keeps row links and header actions separate, with no nested controls", async () => {
    await mountReference();
    const card = wrapper.get('[data-testid="recent-many"]');
    expect(card.get("button.tr-recent__action").attributes("type")).toBe("button");
    expect(card.findAll("a button, button a")).toHaveLength(0);
    expect(card.findAll("a.tr-recent__link")).toHaveLength(3);
  });

  it("limits the container width through the host, not the viewport", async () => {
    await mountReference();
    await wrapper.get('[data-testid="recent-width"]').setValue("320px");
    expect(wrapper.get('[data-testid="recent-host"]').attributes("style")).toContain("max-width: 320px");
  });
});
