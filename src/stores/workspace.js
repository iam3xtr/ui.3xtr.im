import { defineStore } from "pinia";
import { computed, ref } from "vue";

/**
 * @typedef {Object} Workspace
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} plan
 */

/**
 * @typedef {"ok" | "zero" | "unlimited" | "unknown" | "exhausted" | "error"} WorkspaceLimitState
 */

/**
 * @typedef {Object} WorkspaceTariffLimit
 * @property {string} key One of `RESOURCE_LIMIT_KEYS`.
 * @property {string} label
 * @property {string} caption Ready-to-render text state — see `buildCaption`.
 * @property {number | null} progress 0-100 for `"ok"`/`"exhausted"`; `null`
 *   for `"zero"`/`"unlimited"`/`"unknown"`/`"error"` (never a fabricated 0%).
 * @property {WorkspaceLimitState} state
 * @property {number | null} used Measured consumption, `null` when not
 *   applicable to `state` (`zero`/`unlimited`/`unknown`/`error`).
 * @property {number | null} limit `null` means unlimited; `0` means the
 *   resource isn't included in the tariff at all (`state: "zero"`).
 */

/**
 * @typedef {Object} WorkspaceTariff
 * @property {string} displayName
 * @property {string} priceLabel
 * @property {string} [tagType]
 * @property {WorkspaceTariffLimit[]} limits
 */

/**
 * @typedef {Object} WorkspaceAuditEntry
 * @property {string} id
 * @property {string} actor Person who performed the action — never a
 *   password/key/payload value (Task A10.8 acceptance).
 * @property {string} action Plain-language description of what changed
 *   (owner/member/access/settings — API Issue #109's scope).
 * @property {string} time
 */

/**
 * @typedef {Object} WorkspaceAuditGap
 * @property {string} id
 * @property {true} gap Marks this entry as a retention gap note rather than
 *   a real action — `Audit.vue` renders it distinctly from `WorkspaceAuditEntry`.
 * @property {string} note
 */

/**
 * Task A10.6 (`.plan` "Ресурсы, расходы и тарифные возможности", API Issue
 * #106): the seven resource keys the real `/workspaces/{id}/usage` contract
 * measures. No `credits`/monetary key — the kit doesn't fabricate a spend,
 * cost forecast, or a credits-to-currency conversion the API doesn't expose;
 * "Кредиты" from the pre-A10.6 fixture is gone for that reason, not renamed.
 *
 * @type {string[]}
 */
export const RESOURCE_LIMIT_KEYS = [
  "workspace_members",
  "agents",
  "knowledge_collections",
  "knowledge_objects",
  "channels",
  "knowledge_extracted_bytes",
  "active_conversations_monthly",
];

/**
 * @type {Record<string, { label: string, unit: "count" | "bytes", period: "monthly" | null }>}
 */
const RESOURCE_LIMIT_META = {
  workspace_members: { label: "Участники пространства", unit: "count", period: null },
  agents: { label: "Агенты", unit: "count", period: null },
  knowledge_collections: { label: "Коллекции знаний", unit: "count", period: null },
  knowledge_objects: { label: "Материалы знаний", unit: "count", period: null },
  channels: { label: "Каналы", unit: "count", period: null },
  knowledge_extracted_bytes: { label: "Извлечено из знаний", unit: "bytes", period: "monthly" },
  active_conversations_monthly: { label: "Диалоги", unit: "count", period: "monthly" },
};

const PERIOD_SUFFIX = {
  monthly: " в этом месяце",
  null: "",
};

/**
 * Same rounding convention as `knowledge/Statistics.vue`/`knowledge/Files.vue`'s
 * local `formatBytes` (kept local there too — no shared numbers module in
 * this kit yet).
 *
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex > 0 && value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

/**
 * @param {number} count
 * @returns {string}
 */
function formatCount(count) {
  return count.toLocaleString("ru-RU");
}

/**
 * @param {"count" | "bytes"} unit
 * @param {number} value
 * @returns {string}
 */
function formatValue(unit, value) {
  return unit === "bytes" ? formatBytes(value) : formatCount(value);
}

/**
 * Text-state caption for one resource limit (Task A10.6 acceptance:
 * "Unknown/zero/unlimited/error различимы текстом", "не рисует 0% при
 * неизвестном лимите"). `state` alone decides the wording — `used`/`limit`
 * only feed the measured (`ok`/`exhausted`) case.
 *
 * @param {{ key: string, state: WorkspaceLimitState, used: number | null, limit: number | null }} params
 * @returns {string}
 */
function buildCaption({ key, state, used, limit }) {
  const meta = RESOURCE_LIMIT_META[key];
  const periodSuffix = PERIOD_SUFFIX[meta.period ?? "null"];

  switch (state) {
    case "zero":
      return "Не входит в тариф";
    case "unlimited":
      return `Без ограничений${periodSuffix}`;
    case "unknown":
      return "Значение уточняется";
    case "error":
      return "Временная ошибка — повторите позже";
    case "exhausted":
      return `${formatValue(meta.unit, used)} из ${formatValue(meta.unit, limit)}${periodSuffix} — лимит исчерпан`;
    case "ok":
    default:
      return `${formatValue(meta.unit, used)} из ${formatValue(meta.unit, limit)}${periodSuffix}`;
  }
}

/**
 * @param {WorkspaceLimitState} state
 * @param {number | null} used
 * @param {number | null} limit
 * @returns {number | null}
 */
function buildProgress(state, used, limit) {
  if (state !== "ok" && state !== "exhausted") return null;
  if (!limit) return 0;

  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Builds one normalized `WorkspaceTariffLimit` (Task A10.6): the single
 * place that turns `{ used, limit }` (or an explicit `unknown`/`error`
 * override) into `state`/`progress`/`caption`, so every screen that renders
 * a limit — `Dashboard.vue`, `common/TariffSummaryCard.vue`,
 * `workspace/Usage.vue` — reads the same derivation instead of formatting
 * captions itself.
 *
 * @param {string} key One of `RESOURCE_LIMIT_KEYS`.
 * @param {{ used?: number | null, limit?: number | null, state?: "unknown" | "error" }} params
 *   Pass `state: "unknown"`/`"error"` to override measurement; otherwise the
 *   state is derived from `used`/`limit` (`limit === null` → unlimited,
 *   `limit === 0` → zero, `used >= limit` → exhausted, else ok).
 * @returns {WorkspaceTariffLimit}
 */
function createLimit(key, { used = null, limit = null, state: forcedState } = {}) {
  const meta = RESOURCE_LIMIT_META[key];
  let state = forcedState;

  if (!state) {
    if (limit === null) {
      state = "unlimited";
    } else if (limit === 0) {
      state = "zero";
    } else if (used !== null && used >= limit) {
      state = "exhausted";
    } else {
      state = "ok";
    }
  }

  const resolvedUsed = state === "ok" || state === "exhausted" ? used : null;
  const resolvedLimit = state === "ok" || state === "exhausted" ? limit : (state === "zero" ? 0 : null);

  return {
    key,
    label: meta.label,
    state,
    used: resolvedUsed,
    limit: resolvedLimit,
    progress: buildProgress(state, resolvedUsed, resolvedLimit),
    caption: buildCaption({ key, state, used: resolvedUsed, limit: resolvedLimit }),
  };
}

/**
 * Plan-comparison caption for `WorkspacePlans.vue`'s `TariffSelector`
 * (Task A10.6): unlike `createLimit`, this describes a *plan's cap*, not a
 * workspace's measured usage — there's no `used` to report there, only what
 * the tariff grants. Reuses the same key labels/units/period wording as
 * `createLimit` so the two screens read as one system instead of inventing a
 * second caption vocabulary.
 *
 * @param {string} key One of `RESOURCE_LIMIT_KEYS`.
 * @param {number | null} cap `null` — unlimited; `0` — not included in the
 *   plan; otherwise the plan's cap for this resource.
 * @returns {string}
 */
export function formatResourceCapCaption(key, cap) {
  const meta = RESOURCE_LIMIT_META[key];
  const periodSuffix = PERIOD_SUFFIX[meta.period ?? "null"];

  if (cap === null) return `Без ограничений${periodSuffix}`;
  if (cap === 0) return "Не входит в тариф";

  return `До ${formatValue(meta.unit, cap)}${periodSuffix}`;
}

/**
 * @param {string} key One of `RESOURCE_LIMIT_KEYS`.
 * @returns {string}
 */
export function getResourceLimitLabel(key) {
  return RESOURCE_LIMIT_META[key].label;
}

// Defensive fallback for an unknown/missing workspace id (see
// `activeWorkspaceTariff` below): every key reads "unknown" rather than a
// fabricated zero/measured state, since there's no real workspace to have
// measured anything for.
/** @type {WorkspaceTariff} */
const emptyTariff = {
  displayName: "Free",
  priceLabel: "Бесплатно",
  limits: RESOURCE_LIMIT_KEYS.map((key) => createLimit(key, { state: "unknown" })),
};

/**
 * Fixture tariffs per demo workspace (Task A10.6). Together the three
 * workspaces exercise all six limit states at least once — `ok`, `zero`
 * (Free's `channels`), `exhausted` (`demo`'s `knowledge_objects`),
 * `unlimited` (`trickster`'s higher-tier keys), `unknown`
 * (`demo`'s `knowledge_extracted_bytes` — metering not computed yet) and
 * `error` (`empty`'s `channels` — a resource whose usage temporarily failed
 * to load, independent of the page-level demo mode in `stores/demo.js`).
 *
 * @type {Record<string, WorkspaceTariff>}
 */
const tariffsByWorkspaceId = {
  demo: {
    displayName: "Free",
    priceLabel: "Бесплатно",
    limits: [
      createLimit("workspace_members", { used: 2, limit: 3 }),
      createLimit("agents", { used: 4, limit: 5 }),
      createLimit("knowledge_collections", { used: 3, limit: 5 }),
      createLimit("knowledge_objects", { used: 200, limit: 200 }),
      createLimit("channels", { limit: 0 }),
      createLimit("knowledge_extracted_bytes", { state: "unknown" }),
      createLimit("active_conversations_monthly", { used: 620, limit: 1000 }),
    ],
  },
  trickster: {
    displayName: "Superior",
    priceLabel: "2 900 ₽ / мес",
    tagType: "is-primary",
    limits: [
      createLimit("workspace_members", { used: 8, limit: 25 }),
      createLimit("agents", { limit: null }),
      createLimit("knowledge_collections", { limit: null }),
      createLimit("knowledge_objects", { used: 1500, limit: 5000 }),
      createLimit("channels", { used: 3, limit: 10 }),
      createLimit("knowledge_extracted_bytes", { used: 734_003_200, limit: 5_368_709_120 }),
      createLimit("active_conversations_monthly", { limit: null }),
    ],
  },
  empty: {
    displayName: "Free",
    priceLabel: "Бесплатно",
    limits: [
      createLimit("workspace_members", { used: 1, limit: 3 }),
      createLimit("agents", { used: 0, limit: 5 }),
      createLimit("knowledge_collections", { used: 0, limit: 5 }),
      createLimit("knowledge_objects", { used: 0, limit: 200 }),
      createLimit("channels", { state: "error" }),
      createLimit("knowledge_extracted_bytes", { used: 0, limit: 50_000_000 }),
      createLimit("active_conversations_monthly", { used: 0, limit: 1000 }),
    ],
  },
};

/**
 * S2 per-limit attention check (Task A10.4, `.plan` "Ежедневный dashboard и
 * диагностика агента" — "достигнут лимит/нехватка средств"): only a
 * *measured* limit close to or past its cap is worth surfacing — `zero`,
 * `unlimited`, `unknown` and `error` limits aren't a "running out" signal
 * and are left to whatever surfaces those states on their own (an
 * unmeasurable limit isn't "почти исчерпан"). A pure derivation over the
 * tariff's own `limits`, never a second source of truth.
 *
 * @param {WorkspaceTariffLimit[]} limits
 * @param {number} [threshold]
 * @returns {WorkspaceTariffLimit[]}
 */
export function getLimitsNeedingAttention(limits, threshold = 90) {
  return limits.filter((limit) => (
    limit.state === "exhausted"
    || (limit.state === "ok" && limit.progress !== null && limit.progress >= threshold)
  ));
}

/**
 * Roles allowed to view the workspace audit (Task A10.8, `.plan` item 7,
 * API Issue #109: "видимую по capability"). The kit has no real permission
 * store — `activeWorkspace.role` (`"Владелец" | "Администратор" | "Участник"`)
 * is the closest existing capability signal, so audit visibility is gated on
 * it directly rather than inventing a second, parallel permission fixture.
 * @type {string[]}
 */
export const AUDIT_VISIBLE_ROLES = ["Владелец", "Администратор"];

/**
 * Fixture audit log per workspace (Task A10.8): actor/action/time only —
 * never a password, API key or message payload, per the task's acceptance
 * criteria. `trickster`'s log ends with a `WorkspaceAuditGap` entry
 * demonstrating "retention объясняет отсутствие старых событий" from the
 * same `.plan` item. `empty`'s role is `"Участник"` (see `workspaces` below)
 * so its audit is never reachable through `AUDIT_VISIBLE_ROLES` — it still
 * gets a log here so a role change in a test/fixture would show something
 * rather than silently rendering empty for an unrelated reason.
 * @type {Record<string, (WorkspaceAuditEntry | WorkspaceAuditGap)[]>}
 */
const AUDIT_LOG_BY_WORKSPACE_ID = {
  demo: [
    { id: "demo-audit-1", actor: "Иван Петров", action: "Изменил тариф пространства: Free → Free (без изменений)", time: "Сегодня, 10:12" },
    { id: "demo-audit-2", actor: "Иван Петров", action: "Пригласил участника: anna@example.com, роль «Администратор»", time: "Вчера, 18:40" },
    { id: "demo-audit-3", actor: "Анна Смирнова", action: "Приняла приглашение и получила роль «Администратор»", time: "Вчера, 19:02" },
    { id: "demo-audit-4", actor: "Иван Петров", action: "Изменил название пространства: «Демо» → «Демо-пространство»", time: "3 дня назад" },
  ],
  trickster: [
    { id: "trickster-audit-1", actor: "Иван Петров", action: "Обновил тариф пространства: Free → Superior", time: "2 часа назад" },
    { id: "trickster-audit-2", actor: "Иван Петров", action: "Изменил роль участника: Мария Кузнецова, Участник → Администратор", time: "2 дня назад" },
    { id: "trickster-audit-gap", gap: true, note: "События старше 30 дней не хранятся и не показываются здесь." },
  ],
  empty: [],
};

/**
 * @param {string} workspaceId
 * @returns {(WorkspaceAuditEntry | WorkspaceAuditGap)[]}
 */
export function getAuditLogFor(workspaceId) {
  return AUDIT_LOG_BY_WORKSPACE_ID[workspaceId] ?? [];
}

export const useWorkspaceStore = defineStore("workspace", () => {
  /** @type {import("vue").Ref<Workspace[]>} */
  const workspaces = ref([
    {
      id: "demo",
      name: "Демо-пространство",
      role: "Владелец",
      plan: "Free",
    },
    {
      id: "trickster",
      name: "Trickster Team",
      role: "Администратор",
      plan: "Superior",
    },
    {
      id: "empty",
      name: "Пустое пространство",
      role: "Участник",
      plan: "Free",
    },
  ]);
  const activeWorkspaceId = ref(workspaces.value[0].id);
  const activeWorkspaceTariff = computed(
    () => tariffsByWorkspaceId[activeWorkspaceId.value] ?? emptyTariff,
  );

  function createWorkspace() {
    const number = workspaces.value.length + 1;
    const id = `workspace-${number}`;

    workspaces.value.push({
      id,
      name: `Пространство ${number}`,
      role: "Владелец",
      plan: "Free",
    });
    activeWorkspaceId.value = id;
  }

  /**
   * Переименование пространства (Task A5.8, `WorkspaceSettings.vue`) —
   * in-memory, без запроса к серверу.
   * @param {string} id
   * @param {{ name: string }} input
   */
  function updateWorkspace(id, { name }) {
    const workspace = workspaces.value.find((item) => item.id === id);

    if (workspace && name) {
      workspace.name = name;
    }
  }

  /**
   * Удаление пространства (Task A5.8, `WorkspaceSettings.vue`
   * `.tr-destructive-zone`). Нельзя удалить последнее оставшееся
   * пространство — переключать активное после удаления не на что.
   * @param {string} id
   */
  function removeWorkspace(id) {
    if (workspaces.value.length <= 1) {
      return;
    }

    workspaces.value = workspaces.value.filter((item) => item.id !== id);

    if (activeWorkspaceId.value === id) {
      activeWorkspaceId.value = workspaces.value[0].id;
    }
  }

  /**
   * Task A10.8: whether the given workspace's role may see its audit log —
   * `Audit.vue`'s capability gate. Falls back to `false` for an unknown
   * workspace id, same "no fabricated access" rule as `activeWorkspaceTariff`
   * falling back to `emptyTariff` above.
   * @param {string} id
   * @returns {boolean}
   */
  function canViewAudit(id) {
    const workspace = workspaces.value.find((item) => item.id === id);
    return Boolean(workspace) && AUDIT_VISIBLE_ROLES.includes(workspace.role);
  }

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspaceTariff,
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
    canViewAudit,
  };
});
