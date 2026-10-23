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

describe("Statistics reference gating", () => {
  it("is reachable only through development-mode dynamic imports", () => {
    const overview = readFileSync("src/components/kit/Overview.vue", "utf8");
    const usage = readFileSync("src/components/workspace/Usage.vue", "utf8");
    expect(overview).not.toMatch(/^import\s.*KitStatistics/m);
    expect(overview).toMatch(/import\("\.\/KitStatisticsReference\.vue"\)/);
    expect(usage).not.toMatch(/^import\s.*KitStatistics/m);
    expect(usage).toMatch(/import\("\.\.\/kit\/KitStatistics\.vue"\)/);
  });
});

describe.skipIf(!SOURCE_MODE)("kit/KitStatistics.vue (source mode)", () => {
  async function mountStats(props) {
    const { default: Stats } = await import("../../../../src/components/kit/KitStatistics.vue");
    wrapper = mount(Stats, { props, attachTo: document.body, global: { plugins: [Buefy] } });
    return wrapper;
  }

  it("shows LLM and RAG stats plus all four breakdowns", async () => {
    await mountStats({ context: "workspace" });
    expect(wrapper.findAll('[data-testid="stats-workspace-llm"] .tr-stat')).toHaveLength(7);
    expect(wrapper.findAll('[data-testid="stats-workspace-rag"] .tr-stat')).toHaveLength(7);
    expect(wrapper.findAll(".tr-breakdown")).toHaveLength(4);
  });

  it("renders read-only values without focusable controls", async () => {
    await mountStats({ context: "workspace" });
    expect(wrapper.findAll("a, button, input, select, [tabindex]")).toHaveLength(0);
  });

  it("states unavailable data in text, not by color alone", async () => {
    await mountStats({ context: "workspace", state: "partial" });
    const rag = wrapper.get('[data-testid="stats-workspace-rag"]');
    expect(rag.text()).toContain("недоступно");
    expect(wrapper.get('[data-testid="stats-workspace-llm"]').text()).not.toContain("недоступно");
  });

  it("marks loading as busy and hides breakdowns", async () => {
    await mountStats({ context: "workspace", state: "loading" });
    expect(wrapper.get('[data-testid="stats-workspace"]').attributes("aria-busy")).toBe("true");
    expect(wrapper.findAll(".tr-breakdown")).toHaveLength(0);
  });

  it("shows honest zeros with a note and no empty breakdowns", async () => {
    await mountStats({ context: "workspace", state: "zero" });
    expect(wrapper.get('[data-testid="stats-zero"]').exists()).toBe(true);
    expect(wrapper.findAll(".tr-breakdown")).toHaveLength(0);
    expect(wrapper.get('[data-testid="stats-workspace-llm"]').text()).toContain("0");
  });

  it("shares the contract in the Agent / Model / Knowledge / Requests context", async () => {
    await mountStats({ context: "agent" });
    const summary = wrapper.get('[data-testid="stats-agent-summary"]');
    expect(summary.findAll(".tr-stat")).toHaveLength(4);
    expect(summary.text()).toContain("Поддержка клиентов");
  });

  it("formats admin figures larger than tenant figures without extra markup", async () => {
    await mountStats({ context: "workspace", variant: "admin" });
    expect(wrapper.findAll(".tr-stat")).toHaveLength(14);
  });
});
