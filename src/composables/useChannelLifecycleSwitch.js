import { reactive } from "vue";

import { useModalStore } from "../stores/modal.js";

/**
 * Fixture-driven adapter for the Telegram / Web header lifecycle switch
 * (Task S2-16). The switch value is the saved *enabled* intent only — runtime
 * diagnostics (`channel.status`, Web readiness/runtime) never feed it. The
 * command outcome is a deterministic demo fixture (`lifecycleFixture`), not a
 * production revision protocol or API error model.
 */

export const CHANNEL_LIFECYCLE_REASONS = Object.freeze({
  checking: "Подключение проверяется — переключение недоступно.",
  needsToken: "Чтобы включить канал, замените токен бота.",
  needsIdentity: "Чтобы включить канал, завершите подключение бота.",
  webNotReady: "Веб-чат пока не готов к публикации.",
  failure: "Не удалось изменить состояние. Сохранённое значение осталось прежним.",
  stale: "Состояние изменилось в другом месте. Повторите действие.",
});

const COMMAND_DELAY_MS = 400;

/**
 * Turning a channel off is always allowed; turning it on is blocked only by an
 * activation-readiness failure.
 *
 * @param {{ status: string, isEnabled: boolean, providerIdentity: string | null }} channel
 * @returns {{ canToggle: boolean, reason: string | null }}
 */
export function decideChannelToggle(channel) {
  if (channel.status === "checking") {
    return { canToggle: false, reason: CHANNEL_LIFECYCLE_REASONS.checking };
  }
  if (channel.isEnabled) {
    return { canToggle: true, reason: null };
  }
  if (channel.status === "error") {
    return { canToggle: false, reason: CHANNEL_LIFECYCLE_REASONS.needsToken };
  }
  if (!channel.providerIdentity && channel.status !== "displaced") {
    return { canToggle: false, reason: CHANNEL_LIFECYCLE_REASONS.needsIdentity };
  }

  return { canToggle: true, reason: null };
}

/**
 * @param {{ enabled: boolean, readiness: string, readinessReason: string | null }} publication
 * @returns {{ canToggle: boolean, reason: string | null }}
 */
export function decideWebToggle(publication) {
  if (!publication.enabled && publication.readiness !== "ready") {
    return {
      canToggle: false,
      reason: publication.readinessReason ?? CHANNEL_LIFECYCLE_REASONS.webNotReady,
    };
  }

  return { canToggle: true, reason: null };
}

/**
 * @param {{ delayMs?: number }} [options]
 */
export function useChannelLifecycleSwitch({ delayMs = COMMAND_DELAY_MS } = {}) {
  const modalStore = useModalStore();

  /** @type {Record<string, { pending: boolean, target: boolean | null, error: string | null, staleSpent: boolean, syncKey: number }>} */
  const states = reactive({});

  function stateOf(key) {
    if (!states[key]) {
      states[key] = {
        pending: false, target: null, error: null, staleSpent: false, syncKey: 0,
      };
    }

    return states[key];
  }

  /**
   * @param {string} key unique per entity (e.g. `telegram:<id>`, `web:<agentId>`)
   * @param {{ enabled: boolean, decision: { canToggle: boolean, reason: string | null } }} entity
   */
  function switchState(key, { enabled, decision }) {
    const state = stateOf(key);

    return {
      checked: state.pending ? Boolean(state.target) : enabled,
      disabled: !decision.canToggle || state.pending,
      pending: state.pending,
      reason: decision.reason,
      error: state.error,
      syncKey: state.syncKey,
    };
  }

  async function runCommand(key, request, active) {
    const state = stateOf(key);

    state.pending = true;
    state.target = active;
    state.error = null;

    await new Promise((resolve) => { setTimeout(resolve, delayMs); });

    let error = null;
    if (request.fixture === "failure") {
      error = CHANNEL_LIFECYCLE_REASONS.failure;
    } else if (request.fixture === "stale" && !state.staleSpent) {
      state.staleSpent = true;
      error = CHANNEL_LIFECYCLE_REASONS.stale;
    }

    if (!error) {
      request.apply(active);
    }

    state.pending = false;
    state.target = null;
    state.error = error;
    state.syncKey += 1;
  }

  /**
   * Entry point for the switch `update:modelValue`. Duplicates while pending
   * or blocked are ignored; turning off asks for confirmation and cancelling
   * retains the saved state. `request.intercept(active)` may take over the
   * enable path (e.g. provider takeover) and return true to skip the command.
   *
   * @param {string} key
   * @param {boolean} active requested value
   * @param {{
   *   enabled: boolean,
   *   decision: { canToggle: boolean, reason: string | null },
   *   fixture?: string,
   *   apply: (active: boolean) => void,
   *   intercept?: (active: boolean) => boolean,
   *   confirmOff: { title: string, message: string, confirmText: string },
   * }} request
   */
  function requestToggle(key, active, request) {
    const state = stateOf(key);
    if (state.pending || !request.decision.canToggle) {
      state.syncKey += 1;
      return;
    }
    if (active === request.enabled) {
      return;
    }
    if (request.intercept?.(active)) {
      state.syncKey += 1;
      return;
    }

    if (active) {
      runCommand(key, request, true);
      return;
    }

    modalStore.confirm({
      ...request.confirmOff,
      cancelText: "Отмена",
      type: "is-danger",
      hasIcon: true,
      onConfirm: () => { runCommand(key, request, false); },
      onCancel: () => { state.syncKey += 1; },
    });
    // The native checkbox already flipped; re-sync it until the user decides.
    state.syncKey += 1;
  }

  /**
   * Re-issues the last request in the opposite-of-saved direction.
   *
   * @param {string} key
   */
  function retry(key, request) {
    const state = stateOf(key);
    if (state.pending) {
      return;
    }
    state.error = null;
    requestToggle(key, !request.enabled, request);
  }

  return { switchState, requestToggle, retry };
}
