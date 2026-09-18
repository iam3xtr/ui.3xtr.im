import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Buefy from "buefy";

import ApplicationShell from "../../../../src/components/kit/ApplicationShell.vue";
import { mainNavigationItems } from "../../../../src/navigation.js";

const RouteStub = { template: "<div />" };

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/kit/application-shell", name: "kit-application-shell", component: ApplicationShell },
      ...mainNavigationItems.map((item) => ({
        path: `/${item.routeName}`,
        name: item.routeName,
        component: RouteStub,
      })),
      { path: "/workspace/plans", name: "workspace-plans", component: RouteStub },
    ],
  });
}

async function mountApplicationShell() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = buildRouter();
  router.push("/kit/application-shell");
  await router.isReady();

  const wrapper = mount(ApplicationShell, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });

  return { wrapper, router };
}

// Handoff.2 (.todo строки 761-828, требование 3): connected application-shell
// scenario — trVue setup as a non-executed code fragment, a live sidebar with
// a clickable TariffSummaryCard, and the currently-live vs. not-yet-published
// Icon precedence, all in one route instead of separate isolated showcases.
describe("kit/ApplicationShell.vue — application shell scenario (Handoff.2)", () => {
  it("показывает main.js фрагмент с trVue как текст, не исполняемый код", async () => {
    const { wrapper } = await mountApplicationShell();

    const text = wrapper.text();
    expect(text).toContain("app.use(trVue)");
    // Только один текстовый фрагмент — компонент не импортирует и не
    // вызывает `trVue`/`@iam3xtr/vue/plugin` сам.
    expect(wrapper.html()).not.toMatch(/<script[^>]*>[^<]*app\.use\(trVue\)/);
  });

  it("рендерит боковую навигацию и clickable TariffSummaryCard как RouterLink на workspace-plans", async () => {
    const { wrapper } = await mountApplicationShell();

    for (const item of mainNavigationItems) {
      expect(wrapper.find(`a[href="/${item.routeName}"]`).exists()).toBe(true);
    }

    const tariffCard = wrapper.find(".tr-sidebar-tariff");
    expect(tariffCard.exists()).toBe(true);
    expect(tariffCard.element.tagName.toLowerCase()).toBe("a");
    expect(tariffCard.attributes("href")).toBe("/workspace/plans");
  });

  it("резолвит только текущий live-контракт Icon (name, без slot/MDI fallback) и документирует остальное как код", async () => {
    const { wrapper } = await mountApplicationShell();

    // Custom SVG совпадение — реально резолвится установленной
    // `@iam3xtr/vue@0.1.1-alpha` через `provideIconRegistry`-эквивалентный
    // инъекция реестра тестового окружения не настроена, поэтому здесь
    // проверяется единственный гарантированный путь без совпадения —
    // aria-hidden placeholder, не Buefy MDI fallback.
    const placeholders = wrapper.findAll(".tr-icon--placeholder");
    expect(placeholders.length).toBeGreaterThan(0);

    // Расширенная slot/registry/MDI-fallback цепочка (Issue #8.2) — показана
    // только как код, не выполняется этим сценарием.
    const text = wrapper.text();
    expect(text).toContain("Buefy MDI fallback");
    expect(text).toContain("не опубликован");
  });
});
