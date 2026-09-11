import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useApiKeysStore } from "../../../src/stores/apiKeys.js";

// Stage A6 fix (post-review, по решению пользователя 2026-09-11): ключи
// OpenRouter хранятся в профиле воркспейса и переиспользуются BYOK-агентами
// вместо разового ввода на каждом агенте — см. `ApiKeySelect.vue`,
// `stores/agents.js#updateAgentSettings`.

describe("stores/apiKeys", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("фикстура trickster несёт один сохранённый ключ OpenRouter", () => {
    const store = useApiKeysStore();
    const keys = store.listByWorkspace("trickster");

    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ id: "key-1", providerId: "openrouter" });
  });

  it("новый воркспейс без ключей возвращает пустой список", () => {
    const store = useApiKeysStore();

    expect(store.listByWorkspace("demo")).toEqual([]);
    expect(store.listByWorkspace("unknown-workspace")).toEqual([]);
  });

  it("getKey резолвит ключ по id в пределах воркспейса", () => {
    const store = useApiKeysStore();

    expect(store.getKey("trickster", "key-1")).toMatchObject({ label: "Личный ключ" });
    expect(store.getKey("trickster", "nope")).toBeUndefined();
    // Ключ существует в trickster, но не виден из другого воркспейса.
    expect(store.getKey("demo", "key-1")).toBeUndefined();
  });

  it("createKey добавляет ключ провайдера openrouter и возвращает его", () => {
    const store = useApiKeysStore();

    const key = store.createKey("demo", { label: "Тестовый ключ", secret: "sk-or-v1-abcd1234" });

    expect(key.providerId).toBe("openrouter");
    expect(key.label).toBe("Тестовый ключ");
    expect(store.listByWorkspace("demo")).toHaveLength(1);
    // Pinia wraps pushed objects in a reactive proxy, so identity (`toBe`)
    // differs from the plain object `createKey` returned — compare by value.
    expect(store.getKey("demo", key.id)).toStrictEqual(key);
  });

  it("createKey заводит список для воркспейса, у которого его ещё не было", () => {
    const store = useApiKeysStore();

    const key = store.createKey("new-workspace", { label: "Ключ", secret: "sk-or-v1-xyz" });

    expect(store.listByWorkspace("new-workspace")).toEqual([key]);
  });

  it("maskSecret скрывает всё, кроме последних 4 символов", () => {
    const store = useApiKeysStore();
    const key = store.getKey("trickster", "key-1");

    expect(store.maskSecret(key)).toBe("••••d7e8");
    expect(store.maskSecret(key)).not.toContain(key.secret.slice(0, -4));
  });
});
