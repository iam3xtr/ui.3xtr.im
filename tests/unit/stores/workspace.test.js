import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import {
  COMPACT_TARIFF_LIMIT_ORDER,
  selectCompactTariffLimits,
  useWorkspaceStore,
} from "../../../src/stores/workspace.js";

// Этап 4 `.plan`: focused unit-проверки компактной проекции лимитов тарифа
// для карточки Sidebar. Helper использует ресурсные метаданные и formatter-ы
// из того же модуля, поэтому проверяем сквозной результат: порядок, фильтр
// «не показывать zero/unknown/error», поведение «меньше двух — выдать всё»,
// пересборку caption и сохранение `progress`.

/**
 * @typedef {import("../../../src/stores/workspace.js").WorkspaceTariffLimit} WorkspaceTariffLimit
 */

/**
 * @param {Partial<WorkspaceTariffLimit> & { key: string }} init
 * @returns {WorkspaceTariffLimit}
 */
function limitFixture(init) {
  return {
    key: init.key,
    label: init.label ?? init.key,
    state: init.state ?? "ok",
    used: init.used ?? null,
    limit: init.limit ?? null,
    progress: init.progress ?? null,
    caption: init.caption ?? "",
    ...init,
  };
}

describe("selectCompactTariffLimits — порядок и фильтр", () => {
  it("отбирает первые три подходящих в фиксированном порядке COMPACT_TARIFF_LIMIT_ORDER", () => {
    const limits = [
      limitFixture({ key: "members", state: "ok", used: 2, limit: 3, progress: 67 }),
      limitFixture({ key: "agents", state: "ok", used: 4, limit: 5, progress: 80 }),
      limitFixture({ key: "collections", state: "ok", used: 3, limit: 5, progress: 60 }),
      limitFixture({ key: "objects", state: "ok", used: 1, limit: 5, progress: 20 }),
      limitFixture({ key: "channels", state: "zero", limit: 0, progress: null }),
      limitFixture({ key: "extracted", state: "unknown", progress: null }),
      limitFixture({ key: "conversations", state: "ok", used: 100, limit: 1000, progress: 10 }),
    ];

    const result = selectCompactTariffLimits(limits);

    expect(result.map((limit) => limit.key)).toEqual([
      "agents",
      "conversations",
      "members",
    ]);
    expect(result).toHaveLength(3);
  });

  it("исключает zero/unknown/error и пропускает unlimited в тройке", () => {
    const limits = [
      limitFixture({ key: "agents", state: "unlimited", limit: null, progress: null }),
      limitFixture({ key: "conversations", state: "unlimited", limit: null, progress: null }),
      limitFixture({ key: "members", state: "zero", limit: 0, progress: null }),
      limitFixture({ key: "objects", state: "unknown", progress: null }),
      limitFixture({ key: "collections", state: "error", progress: null }),
      limitFixture({ key: "channels", state: "ok", used: 1, limit: 10, progress: 10 }),
      limitFixture({ key: "extracted", state: "ok", used: 0, limit: 1, progress: 0 }),
    ];

    const result = selectCompactTariffLimits(limits);

    expect(result.map((limit) => limit.key)).toEqual([
      "agents",
      "conversations",
      "channels",
    ]);
    expect(result.every((limit) => limit.state !== "zero"
      && limit.state !== "unknown"
      && limit.state !== "error")).toBe(true);
  });

  it("если подходящих меньше двух, отдаёт все имеющиеся без выдуманных значений", () => {
    const limits = [
      limitFixture({ key: "agents", state: "unlimited", progress: null }),
      limitFixture({ key: "conversations", state: "zero", limit: 0, progress: null }),
      limitFixture({ key: "members", state: "unknown", progress: null }),
      limitFixture({ key: "objects", state: "error", progress: null }),
      limitFixture({ key: "collections", state: "zero", progress: null }),
    ];

    const result = selectCompactTariffLimits(limits);

    expect(result.map((limit) => limit.key)).toEqual(["agents"]);
    expect(result).toHaveLength(1);
  });

  it("если подходящих ноль, отдаёт пустой массив (без фиктивных значений)", () => {
    const limits = [
      limitFixture({ key: "agents", state: "zero", progress: null }),
      limitFixture({ key: "conversations", state: "unknown", progress: null }),
      limitFixture({ key: "members", state: "error", progress: null }),
    ];

    expect(selectCompactTariffLimits(limits)).toEqual([]);
  });
});

describe("selectCompactTariffLimits — пересборка caption и сохранение progress", () => {
  it("caption для ok строится через resource formatter без периода: «N из M»", () => {
    const limits = [
      limitFixture({ key: "agents", state: "ok", used: 4, limit: 5, progress: 80 }),
    ];

    const result = selectCompactTariffLimits(limits);

    expect(result[0].caption).toBe("4 из 5");
    expect(result[0].caption).not.toContain("в этом месяце");
  });

  it("caption для exhausted сохраняет статус исчерпания и единицы измерения", () => {
    const limits = [
      limitFixture({ key: "agents", state: "exhausted", used: 5, limit: 5, progress: 100 }),
    ];

    const result = selectCompactTariffLimits(limits);

    expect(result[0].caption).toBe("5 из 5 — лимит исчерпан");
  });

  it("caption для unlimited — «Без ограничений» без периода", () => {
    const limits = [
      limitFixture({ key: "agents", state: "unlimited", limit: null, progress: null }),
    ];

    const result = selectCompactTariffLimits(limits);

    expect(result[0].caption).toBe("Без ограничений");
  });

  it("progress и остальные поля исходного лимита сохраняются", () => {
    const limits = [
      limitFixture({ key: "objects", state: "ok", used: 1500, limit: 5000, progress: 30 }),
    ];

    const result = selectCompactTariffLimits(limits);

    expect(result[0]).toMatchObject({
      key: "objects",
      state: "ok",
      used: 1500,
      limit: 5000,
      progress: 30,
    });
  });
});

describe("selectCompactTariffLimits — fixture-сценарии demo", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("demo: agents/conversations/members в указанном порядке, channels и extracted скрыты", () => {
    const store = useWorkspaceStore();
    const tariff = store.activeWorkspaceTariff;

    const result = selectCompactTariffLimits(tariff.limits);

    expect(result.map((limit) => limit.key)).toEqual([
      "agents",
      "conversations",
      "members",
    ]);
    expect(result.every((limit) => limit.key !== "channels")).toBe(true);
    expect(result.every((limit) => limit.key !== "extracted")).toBe(true);
  });

  it("trickster: первые три включают unlimited (agents, conversations)", () => {
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "trickster";
    const tariff = store.activeWorkspaceTariff;

    const result = selectCompactTariffLimits(tariff.limits);

    expect(result.map((limit) => limit.key)).toEqual([
      "agents",
      "conversations",
      "members",
    ]);
    expect(result[0].state).toBe("unlimited");
    expect(result[0].caption).toBe("Без ограничений");
    expect(result[1].state).toBe("unlimited");
  });

  it("empty: первые три — agents (ok), conversations (ok), members (exhausted); channels (error) исключён", () => {
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "empty";
    const tariff = store.activeWorkspaceTariff;

    const result = selectCompactTariffLimits(tariff.limits);

    expect(result.map((limit) => limit.key)).toEqual([
      "agents",
      "conversations",
      "members",
    ]);
    expect(result.every((limit) => limit.state !== "error")).toBe(true);
    expect(result[2].state).toBe("exhausted");
    expect(result[2].caption).toBe("1 из 1 — лимит исчерпан");
  });
});

describe("COMPACT_TARIFF_LIMIT_ORDER", () => {
  it("содержит все ключи измерения ресурсов в фиксированном порядке", () => {
    expect(COMPACT_TARIFF_LIMIT_ORDER).toEqual([
      "agents",
      "conversations",
      "members",
      "objects",
      "collections",
      "channels",
      "extracted",
    ]);
  });
});
