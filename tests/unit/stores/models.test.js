import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { getModelClassLabel, MODEL_CLASS_IDS, useModelsStore, WIZARD_CAPABILITY_PROFILES } from "../../../src/stores/models.js";

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

describe("stores/models — классы моделей (Task A9.5)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("каждая каталожная модель отнесена к известному классу", () => {
    const store = useModelsStore();

    expect(store.models.every((model) => MODEL_CLASS_IDS.includes(model.classId))).toBe(true);
  });

  it("listByClass возвращает только модели своего класса, опционально по вендору", () => {
    const store = useModelsStore();

    for (const classId of MODEL_CLASS_IDS) {
      const scoped = store.listByClass(classId);
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.every((model) => model.classId === classId)).toBe(true);
    }

    const byokBasic = store.listByClass("basic", { providerId: "openrouter" });
    expect(byokBasic.every((model) => model.providerId === "openrouter")).toBe(true);
  });

  it("getRecommendedModelForClass предпочитает recommended-модель, иначе первую из класса", () => {
    const store = useModelsStore();

    const basic = store.getRecommendedModelForClass("basic");
    expect(basic.classId).toBe("basic");
    expect(basic.recommended).toBe(true);
  });

  it("getRecommendedModelForClass возвращает undefined для пустого пересечения класса и вендора", () => {
    const store = useModelsStore();

    expect(store.getRecommendedModelForClass("power", { providerId: "google" })).toBeUndefined();
  });

  it("getModelClassLabel даёт короткий русский лейбл для каждого класса (Agents.vue post-review fix)", () => {
    for (const classId of MODEL_CLASS_IDS) {
      expect(getModelClassLabel(classId)).toBeTruthy();
    }
    expect(getModelClassLabel("basic")).toBe("Простая");
    expect(getModelClassLabel("advanced")).toBe("Продвинутая");
    expect(getModelClassLabel("power")).toBe("Сильная");
  });

  it("getModelClassLabel для неизвестного classId возвращает его же, не пустую строку", () => {
    expect(getModelClassLabel("unknown-class")).toBe("unknown-class");
  });
});

describe("stores/models — capability-профили тарифов (Task A9.5)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("младший тариф (demo) допускает все классы, но не каталог/BYOK", () => {
    const store = useModelsStore();
    const profile = store.getCapabilityProfile("demo");

    expect(profile.allowedClassIds).toEqual(MODEL_CLASS_IDS);
    expect(profile.allowExpertCatalog).toBe(false);
    expect(profile.allowByok).toBe(false);
  });

  it("расширенный тариф (trickster) допускает все классы, каталог и BYOK", () => {
    const store = useModelsStore();
    const profile = store.getCapabilityProfile("trickster");

    expect(profile.allowedClassIds).toEqual(MODEL_CLASS_IDS);
    expect(profile.allowExpertCatalog).toBe(true);
    expect(profile.allowByok).toBe(true);
  });

  it("вариант с единственным доступным классом (empty) не даёт выбора", () => {
    const store = useModelsStore();
    const profile = store.getCapabilityProfile("empty");

    expect(profile.allowedClassIds).toHaveLength(1);
  });

  it("незнакомый workspace падает на младший (junior) профиль", () => {
    const store = useModelsStore();

    expect(store.getCapabilityProfile("unknown-workspace")).toEqual(WIZARD_CAPABILITY_PROFILES.demo);
  });
});
