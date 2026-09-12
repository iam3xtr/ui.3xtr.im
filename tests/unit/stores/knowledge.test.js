import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useKnowledgeStore } from "../../../src/stores/knowledge.js";

// Task A9.4: `autoNamed`/`syncAutoName` back the agent wizard's lazy personal
// collection (`stores/wizard.js`'s `ensureCollection`/`KnowledgeStep.vue`) —
// only the pieces this task adds to `stores/knowledge.js`; the rest of the
// store (objects, reindex runs) is unchanged and already covered elsewhere.
describe("stores/knowledge — autoNamed / syncAutoName (Task A9.4)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("обычная коллекция не создаётся autoNamed по умолчанию", () => {
    const store = useKnowledgeStore();
    const collection = store.createCollection("demo", { name: "Обычная коллекция", type: "mixed" });

    expect(collection.autoNamed).toBe(false);
  });

  it("syncAutoName переименовывает только autoNamed-коллекцию", () => {
    const store = useKnowledgeStore();
    // `createCollection` ids on `Date.now()` — two calls in the same test can
    // land on the same millisecond, so pin distinct timestamps rather than
    // rely on wall-clock spacing between them.
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValueOnce(900_001).mockReturnValueOnce(900_002);
    const auto = store.createCollection("demo", { name: "Агент А", type: "mixed", autoNamed: true });
    const manual = store.createCollection("demo", { name: "Общая база", type: "mixed" });
    dateNowSpy.mockRestore();

    expect(store.syncAutoName("demo", auto.id, "Агент Б")).toBe(true);
    expect(auto.name).toBe("Агент Б");

    expect(store.syncAutoName("demo", manual.id, "Другое имя")).toBe(false);
    expect(manual.name).toBe("Общая база");
  });

  it("явный updateCollection сбрасывает autoNamed — дальнейший syncAutoName её не переименовывает", () => {
    const store = useKnowledgeStore();
    const collection = store.createCollection("demo", { name: "Агент А", type: "mixed", autoNamed: true });

    store.updateCollection("demo", collection.id, { name: "Моя база знаний", description: "" });

    expect(collection.autoNamed).toBe(false);
    expect(store.syncAutoName("demo", collection.id, "Агент Б")).toBe(false);
    expect(collection.name).toBe("Моя база знаний");
  });

  it("syncAutoName по несуществующей коллекции — явный отказ, а не исключение", () => {
    const store = useKnowledgeStore();

    expect(store.syncAutoName("demo", 999_999, "Что угодно")).toBe(false);
  });
});
