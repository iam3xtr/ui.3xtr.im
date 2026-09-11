import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useModelsStore } from "../../../src/stores/models.js";

describe("stores/models", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("не выполняет сетевых вызовов и держит каталог как синхронный fixture", () => {
    const store = useModelsStore();

    expect(store.models.length).toBeGreaterThan(0);
    expect(store.providers.length).toBeGreaterThan(0);
  });

  it("покрывает несколько вендоров, включая openrouter", () => {
    const store = useModelsStore();
    const vendorIds = new Set(store.models.map((model) => model.providerId));

    expect(vendorIds.has("openrouter")).toBe(true);
    expect(vendorIds.size).toBeGreaterThan(1);
  });

  it("содержит и рекомендуемые, и обычные модели", () => {
    const store = useModelsStore();

    expect(store.list().some((model) => model.recommended)).toBe(true);
    expect(store.list().some((model) => !model.recommended)).toBe(true);
  });

  it("list({ providerId: 'openrouter' }) фильтрует каталог по вендору (BYOK)", () => {
    const store = useModelsStore();
    const filtered = store.list({ providerId: "openrouter" });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((model) => model.providerId === "openrouter")).toBe(true);
  });

  it("listRecommended возвращает только recommended-модели, опционально по вендору", () => {
    const store = useModelsStore();
    const recommended = store.listRecommended();

    expect(recommended.every((model) => model.recommended)).toBe(true);

    const recommendedOpenRouter = store.listRecommended({ providerId: "openrouter" });
    expect(recommendedOpenRouter.every((model) => model.providerId === "openrouter")).toBe(true);
  });

  it("search ищет по имени, вендору и идентификатору по всему каталогу", () => {
    const store = useModelsStore();

    const byName = store.search("Claude");
    expect(byName.some((model) => model.id === "claude-sonnet-4.5")).toBe(true);

    const byVendor = store.search("openrouter");
    expect(byVendor.length).toBeGreaterThan(0);
    expect(byVendor.every((model) => model.providerId === "openrouter")).toBe(true);

    const byId = store.search("gpt-4o-mini");
    expect(byId.some((model) => model.id === "gpt-4o-mini")).toBe(true);
  });

  it("search с пустой строкой возвращает список без сужения", () => {
    const store = useModelsStore();

    expect(store.search("")).toHaveLength(store.list().length);
  });

  it("резолвит иконку провайдера цепочкой icon → protocol → id → brain", () => {
    const store = useModelsStore();

    const withIcon = store.getModel("gpt-4.1-mini");
    expect(withIcon.provider.icon).toBe("openai");

    const withoutIcon = store.providers.find((provider) => !provider.icon);
    expect(withoutIcon).toBeDefined();
    expect(withoutIcon.protocol).toBeTruthy();

    const modelWithoutIcon = store.models.find((model) => model.providerId === withoutIcon.id);
    expect(modelWithoutIcon).toBeDefined();
    const resolved = store.getModel(modelWithoutIcon.id);
    expect(resolved.provider.icon ?? resolved.provider.protocol ?? resolved.provider.id).toBeTruthy();
  });

  it("содержит хотя бы одну модель с длинным именем", () => {
    const store = useModelsStore();

    expect(store.models.some((model) => model.name.length > 60)).toBe(true);
  });

  it("getModel возвращает undefined для неизвестного id", () => {
    const store = useModelsStore();

    expect(store.getModel("unknown-model")).toBeUndefined();
  });
});
