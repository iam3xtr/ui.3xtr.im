import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import {
  AUDIT_VISIBLE_ROLES,
  formatResourceCapCaption,
  getAuditLogFor,
  getLimitsNeedingAttention,
  getResourceLimitLabel,
  RESOURCE_LIMIT_KEYS,
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
      "workspace_members",
      "agents",
      "knowledge_collections",
      "knowledge_objects",
      "channels",
      "knowledge_extracted_bytes",
      "active_conversations_monthly",
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
      .find((limit) => limit.key === "knowledge_extracted_bytes");

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
      .find((limit) => limit.key === "active_conversations_monthly");

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
      .find((limit) => limit.key === "knowledge_objects");

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

    expect(attentionKeys).toContain("knowledge_objects"); // exhausted
    expect(attentionKeys).not.toContain("channels"); // zero
    expect(attentionKeys).not.toContain("knowledge_extracted_bytes"); // unknown
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
    expect(formatResourceCapCaption("active_conversations_monthly", null))
      .toBe("Без ограничений в этом месяце");
    expect(formatResourceCapCaption("workspace_members", 25)).toBe("До 25");
    expect(formatResourceCapCaption("knowledge_extracted_bytes", 50_000_000))
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
