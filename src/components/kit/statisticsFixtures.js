// Deterministic demo fixtures for the statistics reference (Task S2-11).
// Shapes mirror the Summary samples (LLM calls, RAG retrieval); values are demo
// figures, not backend defaults, pricing or production contracts. Formatting
// stays here, in the consumer: packages only supply the presentation classes.

const number = new Intl.NumberFormat("ru-RU");

/** @param {number | null | undefined} value */
export function formatCount(value) {
  return value == null ? "—" : number.format(value);
}

/** @param {number | null | undefined} ms */
export function formatLatency(ms) {
  if (ms == null) return { value: "—", unit: "" };
  return ms >= 1000 ? { value: number.format(ms / 1000), unit: "с" } : { value: number.format(ms), unit: "мс" };
}

const breakdowns = {
  source: [
    { name: "Веб-чат", figure: 7210 },
    { name: "Telegram", figure: 4380 },
    { name: "API", figure: 1250 },
  ],
  provider: [
    { name: "OpenAI", figure: 9034 },
    { name: "Anthropic", figure: 3806 },
  ],
  model: [
    { name: "gpt-4o-mini", figure: 8120 },
    { name: "claude-sonnet-со-слишком-длинным-идентификатором-для-проверки-переноса", figure: 3806 },
    { name: "gpt-4o", figure: 914 },
  ],
  kind: [
    { name: "Ответ", figure: 11200 },
    { name: "Суммаризация", figure: 1640 },
  ],
};

const workspace = {
  llm: { total: 12840, success: 12611, failure: 187, running: 42, tokens: 48213907, avgMs: 1840, p95Ms: 6120 },
  rag: { calls: 9320, success: 9104, failure: 61, degraded: 155, tokens: 3120455, avgMs: 412, p95Ms: 1290 },
  breakdowns,
};

// Admin variant: platform-wide figures (larger values stress the layout).
const admin = {
  llm: { total: 9812340, success: 9702115, failure: 80120, running: 1204, tokens: 31204557123, avgMs: 2210, p95Ms: 8400 },
  rag: { calls: 6120044, success: 6001000, failure: 21044, degraded: 98000, tokens: 1840200311, avgMs: 530, p95Ms: 1820 },
  breakdowns,
};

// Second context: one agent with its model and knowledge usage.
const agent = {
  agentName: "Поддержка клиентов",
  modelName: "gpt-4o-mini",
  llm: { total: 3120 },
  rag: { calls: 2210 },
  breakdowns: {
    source: breakdowns.source.slice(0, 2),
    provider: breakdowns.provider.slice(0, 1),
    model: breakdowns.model.slice(0, 1),
    kind: breakdowns.kind,
  },
};

const zero = {
  agentName: agent.agentName,
  modelName: agent.modelName,
  llm: { total: 0, success: 0, failure: 0, running: 0, tokens: 0, avgMs: 0, p95Ms: 0 },
  rag: { calls: 0, success: 0, failure: 0, degraded: 0, tokens: 0, avgMs: 0, p95Ms: 0 },
  breakdowns: { source: [], provider: [], model: [], kind: [] },
};

export const statisticsFixtures = { workspace, admin, agent, zero };
