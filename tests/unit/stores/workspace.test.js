import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import {
  AUDIT_VISIBLE_ROLES,
  COMPACT_TARIFF_LIMIT_ORDER,
  formatResourceCapCaption,
  getAuditLogFor,
  getLimitsNeedingAttention,
  getResourceLimitLabel,
  RESOURCE_LIMIT_KEYS,
  selectCompactTariffLimits,
  useWorkspaceStore,
} from "../../../src/stores/workspace.js";

// Task A10.6 (`.plan` "Ресурсы, расходы и тарифные возможности", API Issue
// #106): `stores/workspace.js` is the single source of the seven-key
// resource-limit contract every screen (`Dashboard.vue`,
// `common/TariffSummaryCard.vue`, `workspace/Usage.vue`, `WorkspacePlans.vue`)
// reads instead of formatting captions itself. No Pinia instance is needed
// for the pure exports; `activeWorkspaceTariff` needs one.
describe("stores/workspace — семиключевой контракт ресурсов (Task A10.6)", () => {
  it("RESOURCE_LIMIT_KEYS — ровно семь ключей API-контракта, без credits", () => {
    expect(RESOURCE_LIMIT_KEYS).toEqual([
      "members",
      "agents",
      "channels",
      "conversations",
      "collections",
      "objects",
      "extracted",
    ]);
    expect(RESOURCE_LIMIT_KEYS).not.toContain("credits");
  });

  for (const workspaceId of ["demo", "trickster", "empty"]) {
    it(`${workspaceId}: лимиты содержат ровно семь ключей контракта`, () => {
      setActivePinia(createPinia());
      const store = useWorkspaceStore();
      store.activeWorkspaceId = workspaceId;

      const keys = store.activeWorkspaceTariff.limits.map((limit) => limit.key);
      expect(keys.sort()).toEqual([...RESOURCE_LIMIT_KEYS].sort());
    });
  }

  it("unknown-лимит не рисует прогресс и не путается с нулём", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "demo";

    const bytes = store.activeWorkspaceTariff.limits
      .find((limit) => limit.key === "extracted");

    expect(bytes.state).toBe("unknown");
    expect(bytes.progress).toBeNull();
    expect(bytes.caption).not.toMatch(/0\s*%|из 0/);
  });

  it("zero-лимит (не входит в тариф) отличается от честного used:0 при реальном limit", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();

    store.activeWorkspaceId = "demo";
    const channels = store.activeWorkspaceTariff.limits.find((limit) => limit.key === "channels");
    expect(channels.state).toBe("zero");
    expect(channels.progress).toBeNull();
    expect(channels.caption).toBe("Не входит в тариф");

    store.activeWorkspaceId = "empty";
    const agents = store.activeWorkspaceTariff.limits.find((limit) => limit.key === "agents");
    expect(agents.state).toBe("ok");
    expect(agents.used).toBe(0);
    expect(agents.progress).toBe(0);
  });

  it("unlimited-лимит не рисует прогресс и подписан «Без ограничений»", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "trickster";

    const conversations = store.activeWorkspaceTariff.limits
      .find((limit) => limit.key === "conversations");

    expect(conversations.state).toBe("unlimited");
    expect(conversations.progress).toBeNull();
    expect(conversations.caption).toContain("Без ограничений");
    // Monthly-period key mentions the period even when unlimited.
    expect(conversations.caption).toContain("в этом месяце");
  });

  it("exhausted-лимит достигает 100% и отличается по тексту от обычного ok", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "demo";

    const objects = store.activeWorkspaceTariff.limits
      .find((limit) => limit.key === "objects");

    expect(objects.state).toBe("exhausted");
    expect(objects.progress).toBe(100);
    expect(objects.caption).toContain("лимит исчерпан");
  });

  it("error-лимит независим от прочих ключей и подписан отдельно от unknown", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "empty";

    const channels = store.activeWorkspaceTariff.limits.find((limit) => limit.key === "channels");
    expect(channels.state).toBe("error");
    expect(channels.progress).toBeNull();
    expect(channels.caption).not.toBe("Значение уточняется");
  });

  it("getLimitsNeedingAttention отбирает exhausted и ok у порога, не unlimited/unknown/zero/error", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "demo";

    const attention = getLimitsNeedingAttention(store.activeWorkspaceTariff.limits);
    const attentionKeys = attention.map((limit) => limit.key);

    expect(attentionKeys).toContain("objects"); // exhausted
    expect(attentionKeys).not.toContain("channels"); // zero
    expect(attentionKeys).not.toContain("extracted"); // unknown
  });

  it("getLimitsNeedingAttention: пусто, когда всё в норме или unlimited (trickster)", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();
    store.activeWorkspaceId = "trickster";

    expect(getLimitsNeedingAttention(store.activeWorkspaceTariff.limits)).toEqual([]);
  });

  it("formatResourceCapCaption различает unlimited/zero/измеренный cap теми же словами, что лимиты", () => {
    expect(formatResourceCapCaption("channels", 0)).toBe("Не входит в тариф");
    expect(formatResourceCapCaption("agents", null)).toBe("Без ограничений");
    expect(formatResourceCapCaption("conversations", null))
      .toBe("Без ограничений в этом месяце");
    expect(formatResourceCapCaption("members", 25)).toBe("До 25");
    expect(formatResourceCapCaption("extracted", 50_000_000))
      .toMatch(/^До .+ в этом месяце$/);
  });

  it("getResourceLimitLabel возвращает подпись для каждого из семи ключей", () => {
    for (const key of RESOURCE_LIMIT_KEYS) {
      expect(getResourceLimitLabel(key)).toEqual(expect.any(String));
      expect(getResourceLimitLabel(key).length).toBeGreaterThan(0);
    }
  });
});

// Task A10.8 (`.plan` item 7, API Issue #109): capability-gated workspace
// audit — visibility follows the workspace's own role, and the fixture log
// only ever carries actor/action/time (plus retention gaps), never a
// password/key/message payload.
describe("stores/workspace — аудит пространства (Task A10.8)", () => {
  it("Владелец и Администратор видят аудит, Участник — нет", () => {
    setActivePinia(createPinia());
    const store = useWorkspaceStore();

    expect(store.canViewAudit("demo")).toBe(true); // Владелец
    expect(store.canViewAudit("trickster")).toBe(true); // Администратор
    expect(store.canViewAudit("empty")).toBe(false); // Участник
    expect(store.canViewAudit("does-not-exist")).toBe(false);
  });

  it("AUDIT_VISIBLE_ROLES не включает роль «Участник»", () => {
    expect(AUDIT_VISIBLE_ROLES).not.toContain("Участник");
  });

  it("каждая запись аудита несёт только actor/action/time или является gap-заметкой", () => {
    for (const workspaceId of ["demo", "trickster", "empty"]) {
      for (const entry of getAuditLogFor(workspaceId)) {
        if (entry.gap) {
          expect(entry.note).toEqual(expect.any(String));
          continue;
        }

        expect(entry.actor).toEqual(expect.any(String));
        expect(entry.action).toEqual(expect.any(String));
        expect(entry.time).toEqual(expect.any(String));

        const serialized = JSON.stringify(entry).toLowerCase();
        expect(serialized).not.toMatch(/password|секрет|пароль|api[_-]?key|ключ api|токен/);
      }
    }
  });

  it("trickster содержит явный gap-пробел retention", () => {
    expect(getAuditLogFor("trickster").some((entry) => entry.gap)).toBe(true);
  });

  it("неизвестное пространство возвращает пустой лог, а не ошибку", () => {
    expect(getAuditLogFor("does-not-exist")).toEqual([]);
  });
});


// Stage 4 `.plan`: focused unit checks for the compact tariff limit
// projection used by the Sidebar card. The helper relies on resource metadata
// and formatters from the same module, so we check the end-to-end result:
// order, the "hide zero/unknown/error" filter, the "fewer than two — return
// all" behaviour, caption rebuilding and `progress` preservation.

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
