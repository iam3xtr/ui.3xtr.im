import { computed, reactive } from "vue";

import { AGENT_STATUSES, getAgentLifecycle, useAgentsStore } from "../stores/agents.js";
import { useModalStore } from "../stores/modal.js";

/**
 * Fixture-driven adapter for the agent catalog lifecycle switch (Task S2-15).
 * The switch reflects the agent's *intended/confirmed* active state, never the
 * runtime state of its channels. It reuses `getAgentLifecycle` for the decision
 * and `agentsStore.setAgentStatus` for the confirmed mutation; the command
 * outcome (success / failure / stale revision) is a deterministic demo fixture
 * (`agent.lifecycleFixture`), not a production revision protocol or API error
 * model.
 */

export const LIFECYCLE_REASONS = Object.freeze({
  notReady: "Чтобы запустить агента, заполните его инструкции.",
  unknown: "Статус агента неизвестен — переключение недоступно.",
  failure: "Не удалось изменить статус агента. Состояние сохранено прежним.",
  stale: "Состояние агента изменилось в другом месте. Повторите действие.",
});

const COMMAND_DELAY_MS = 400;

/**
 * @param {import("../stores/agents.js").Agent} agent
 * @returns {{ canToggle: boolean, reason: string | null }}
 */
export function decideLifecycleToggle(agent) {
  if (!AGENT_STATUSES.includes(agent.status)) {
    return { canToggle: false, reason: LIFECYCLE_REASONS.unknown };
  }
  if (getAgentLifecycle(agent) === "draft") {
    return { canToggle: false, reason: LIFECYCLE_REASONS.notReady };
  }

  return { canToggle: true, reason: null };
}

/**
 * @param {{ workspaceId: import("vue").Ref<string> | { value: string }, delayMs?: number }} options
 */
export function useAgentLifecycleSwitch({ workspaceId, delayMs = COMMAND_DELAY_MS }) {
  const agentsStore = useAgentsStore();
  const modalStore = useModalStore();

  /** @type {Record<string, { pending: boolean, target: boolean | null, error: string | null, revision: number, staleSpent: boolean, syncKey: number }>} */
  const states = reactive({});

  function stateOf(agent) {
    const key = String(agent.id);
    if (!states[key]) {
      states[key] = {
        pending: false, target: null, error: null, revision: 1, staleSpent: false, syncKey: 0,
      };
    }

    return states[key];
  }

  /**
   * @param {import("../stores/agents.js").Agent} agent
   */
  function switchState(agent) {
    const state = stateOf(agent);
    const decision = decideLifecycleToggle(agent);

    return {
      checked: state.pending ? Boolean(state.target) : getAgentLifecycle(agent) === "active",
      disabled: !decision.canToggle || state.pending,
      pending: state.pending,
      reason: decision.reason,
      error: state.error,
      syncKey: state.syncKey,
    };
  }

  async function runCommand(agent, active) {
    const state = stateOf(agent);
    const expectedRevision = state.revision;

    state.pending = true;
    state.target = active;
    state.error = null;

    await new Promise((resolve) => { setTimeout(resolve, delayMs); });

    let error = null;
    if (agent.lifecycleFixture === "failure") {
      error = LIFECYCLE_REASONS.failure;
    } else if (agent.lifecycleFixture === "stale" && !state.staleSpent) {
      // The "server" revision moved on while the command was in flight.
      state.staleSpent = true;
      state.revision = expectedRevision + 1;
      error = LIFECYCLE_REASONS.stale;
    }

    if (!error) {
      agentsStore.setAgentStatus(workspaceId.value, agent.id, active ? "Активен" : "Приостановлен");
      state.revision += 1;
    }

    state.pending = false;
    state.target = null;
    state.error = error;
    state.syncKey += 1;

    return !error;
  }

  /**
   * Entry point for the switch `update:modelValue`. Duplicate requests while a
   * command is pending, or for a blocked agent, are ignored. Turning an agent
   * off asks for confirmation; cancelling retains the previous state.
   *
   * @param {import("../stores/agents.js").Agent} agent
   * @param {boolean} active
   */
  function requestToggle(agent, active) {
    const state = stateOf(agent);

    if (state.pending || !decideLifecycleToggle(agent).canToggle) {
      state.syncKey += 1;
      return;
    }
    if (active === (getAgentLifecycle(agent) === "active")) {
      return;
    }

    if (active) {
      runCommand(agent, true);
      return;
    }

    modalStore.confirm({
      title: "Приостановить агента?",
      message: "Агент перестанет отвечать на новые сообщения, пока его не активируют снова.",
      confirmText: "Приостановить",
      cancelText: "Отмена",
      type: "is-danger",
      hasIcon: true,
      onConfirm: () => { runCommand(agent, false); },
      onCancel: () => { state.syncKey += 1; },
    });
    // The native checkbox already flipped; re-sync it until the user decides.
    state.syncKey += 1;
  }

  /** Re-issue the last failed command in the opposite-of-current direction. */
  function retry(agent) {
    const state = stateOf(agent);
    if (state.pending) {
      return;
    }
    state.error = null;
    requestToggle(agent, getAgentLifecycle(agent) !== "active");
  }

  const anyPending = computed(() => Object.values(states).some((state) => state.pending));

  return { switchState, requestToggle, retry, anyPending };
}
