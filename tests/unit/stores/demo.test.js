import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEMO_MODES, useDemoStore } from "../../../src/stores/demo.js";

const STORAGE_KEY = "trickster-demo-state";

// Node's own global `localStorage` (stable since Node 22, still unbacked by
// a file in this environment — see the `--localstorage-file` startup
// warning) shadows jsdom's working `window.localStorage` and throws on
// every call. Tests that need a *working* store stub a small in-memory
// polyfill instead of depending on the ambient global; tests further below
// exercise the store against a genuinely broken/missing `localStorage`
// (Task A7.1's "safely works without localStorage" requirement) directly.
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

describe("stores/demo — default state", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("стартует в ready без сохранённых подписей и плотных данных", () => {
    const store = useDemoStore();

    expect(store.mode).toBe("ready");
    expect(store.longLabels).toBe(false);
    expect(store.denseData).toBe(false);
    expect(store.isReady).toBe(true);
  });

  it("проекция ListAsyncState в ready не поднимает ни один флаг", () => {
    const store = useDemoStore();

    expect(store.listAsyncState.loading).toBe(false);
    expect(store.listAsyncState.error).toBe(false);
    expect(store.listAsyncState.empty).toBe(false);
  });
});

describe("stores/demo — переключатели и проекция", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("setMode отклоняет неизвестное значение и оставляет ready", () => {
    const store = useDemoStore();

    store.setMode("not-a-real-mode");

    expect(store.mode).toBe("ready");
  });

  it.each(DEMO_MODES)("setMode(%s) переключает режим реактивно", (mode) => {
    const store = useDemoStore();

    store.setMode(mode);

    expect(store.mode).toBe(mode);
  });

  it("ListAsyncState-проекция выражает loading", () => {
    const store = useDemoStore();
    store.setMode("loading");

    expect(store.listAsyncState).toMatchObject({ loading: true, error: false, empty: false });
  });

  it("ListAsyncState-проекция выражает empty с текстом", () => {
    const store = useDemoStore();
    store.setMode("empty");

    expect(store.listAsyncState).toMatchObject({ loading: false, error: false, empty: true });
    expect(store.listAsyncState.emptyTitle).toBeTruthy();
  });

  it("ListAsyncState-проекция выражает error с текстом", () => {
    const store = useDemoStore();
    store.setMode("error");

    expect(store.listAsyncState).toMatchObject({ loading: false, error: true, empty: false });
    expect(store.listAsyncState.errorTitle).toBeTruthy();
  });

  it("permission-denied не поднимает ни один флаг ListAsyncState и несёт собственный текст", () => {
    const store = useDemoStore();
    store.setMode("permission-denied");

    expect(store.isPermissionDenied).toBe(true);
    expect(store.listAsyncState).toMatchObject({ loading: false, error: false, empty: false });
    expect(store.permissionDeniedState.title).toBeTruthy();
  });

  it("partial выставляет только isPartial, не влияя на ListAsyncState-проекцию", () => {
    const store = useDemoStore();
    store.setMode("partial");

    expect(store.isPartial).toBe(true);
    expect(store.listAsyncState).toMatchObject({ loading: false, error: false, empty: false });
  });

  it("toggleLongLabels/toggleDenseData инвертируют флаги независимо от режима", () => {
    const store = useDemoStore();

    store.toggleLongLabels();
    store.toggleDenseData();

    expect(store.longLabels).toBe(true);
    expect(store.denseData).toBe(true);

    store.toggleLongLabels();
    expect(store.longLabels).toBe(false);
    expect(store.denseData).toBe(true);
  });

  it("reset возвращает режим и оба флага к значениям по умолчанию", () => {
    const store = useDemoStore();
    store.setMode("error");
    store.setLongLabels(true);
    store.setDenseData(true);

    store.reset();

    expect(store.mode).toBe("ready");
    expect(store.longLabels).toBe(false);
    expect(store.denseData).toBe(false);
  });
});

describe("stores/demo — persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("изменения сохраняются в namespaced ключ localStorage кита", async () => {
    const store = useDemoStore();
    store.setMode("empty");
    store.setLongLabels(true);
    store.setDenseData(true);

    // watch — асинхронный по умолчанию; ждём flush перед чтением localStorage.
    await Promise.resolve();
    await new Promise((resolve) => { setTimeout(resolve, 0); });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved).toEqual({ mode: "empty", longLabels: true, denseData: true });
  });

  it("новый стор читает persisted режим и настройки при инициализации", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "error", longLabels: true, denseData: false }),
    );
    setActivePinia(createPinia());

    const store = useDemoStore();

    expect(store.mode).toBe("error");
    expect(store.longLabels).toBe(true);
    expect(store.denseData).toBe(false);
  });

  it("невалидный сохранённый режим заменяется на ready, флаги коэрсятся в boolean", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "bogus-mode", longLabels: 1, denseData: 0 }),
    );
    setActivePinia(createPinia());

    const store = useDemoStore();

    expect(store.mode).toBe("ready");
    expect(store.longLabels).toBe(true);
    expect(store.denseData).toBe(false);
  });

  it("повреждённый JSON в localStorage не роняет инициализацию стора", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");
    setActivePinia(createPinia());

    expect(() => useDemoStore()).not.toThrow();
    expect(useDemoStore().mode).toBe("ready");
  });
});

describe("stores/demo — недоступный localStorage", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("инициализация и переключение режима не бросают исключение без localStorage", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(() => {
      const store = useDemoStore();
      store.setMode("error");
      store.toggleLongLabels();
    }).not.toThrow();
  });

  it("инициализация не бросает исключение, если localStorage кидает ошибку доступа", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });

    expect(() => {
      const store = useDemoStore();
      store.setMode("loading");
    }).not.toThrow();
  });
});
