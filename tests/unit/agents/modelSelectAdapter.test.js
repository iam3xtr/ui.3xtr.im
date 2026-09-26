import { beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { useModelSelectCatalog } from "../../../src/components/agents/modelSelectAdapter.js";

// Demo adapter for the public `@iam3xtr/vue` `ModelSelect`: the package
// receives plain scoped arrays; the fixture store and the OpenRouter BYOK
// scope stay in the demo.
describe("modelSelectAdapter — useModelSelectCatalog", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("обычный scope: весь каталог и id рекомендуемых моделей", () => {
    const catalog = useModelSelectCatalog(false);

    expect(catalog.models.value.length).toBeGreaterThan(4);
    expect(catalog.recommendedModels.value).toEqual([
      "gpt-4.1-mini",
      "gpt-4.1",
      "claude-sonnet-4.5",
      "or-gpt-oss-120b",
    ]);
    expect(catalog.searchResults.value).toEqual([]);
  });

  it("BYOK scope ограничен OpenRouter для каталога, рекомендаций и поиска", () => {
    const catalog = useModelSelectCatalog(true);

    expect(catalog.models.value.every((model) => model.providerId === "openrouter")).toBe(true);
    expect(catalog.recommendedModels.value).toEqual(["or-gpt-oss-120b"]);

    catalog.onQuery("gpt");
    expect(catalog.searchResults.value.map((model) => model.id)).toEqual(["or-gpt-oss-120b"]);
  });

  it("поиск по query из update:query и пустой результат для пробелов", () => {
    const catalog = useModelSelectCatalog(false);

    catalog.onQuery("gemini");
    expect(catalog.searchResults.value.map((model) => model.name)).toEqual(["Gemini 2.5 Pro"]);
    expect(catalog.searchResults.value[0].provider?.id).toBe("google");

    catalog.onQuery("   ");
    expect(catalog.searchResults.value).toEqual([]);
  });

  it("scope следует за реактивным источником", () => {
    const byok = ref(false);
    const catalog = useModelSelectCatalog(byok);

    expect(catalog.recommendedModels.value).toContain("gpt-4.1");
    byok.value = true;
    expect(catalog.recommendedModels.value).toEqual(["or-gpt-oss-120b"]);
  });

  it("freeformIssue различает пробелы и длину больше 255 символов", () => {
    const catalog = useModelSelectCatalog(true);

    catalog.onQuery("vendor/model");
    expect(catalog.freeformIssue.value).toBeNull();

    catalog.onQuery("vendor model");
    expect(catalog.freeformIssue.value).toBe("whitespace");

    catalog.onQuery(`vendor/${"a".repeat(250)}`);
    expect(catalog.freeformIssue.value).toBe("tooLong");
  });

  it("displayName повторяет правило закрытого trigger", () => {
    const regular = useModelSelectCatalog(false);
    const byok = useModelSelectCatalog(true);

    expect(regular.displayName("claude-sonnet-4.5")).toBe("Claude Sonnet 4.5");
    expect(regular.displayName("unknown-id")).toBe("");
    expect(regular.displayName(null)).toBe("");

    expect(byok.displayName("or-gpt-oss-120b")).toBe("GPT-OSS 120B (OpenRouter)");
    expect(byok.displayName("unknown-id")).toBe("unknown-id");
    expect(byok.displayName("or-gpt-oss-120b", "vendor/free")).toBe("vendor/free");
  });
});
