import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  decideLifecycleToggle,
  LIFECYCLE_REASONS,
  useAgentLifecycleSwitch,
} from "../../../src/composables/useAgentLifecycleSwitch.js";
import { useAgentsStore } from "../../../src/stores/agents.js";
import { useModalStore } from "../../../src/stores/modal.js";

describe("decideLifecycleToggle", () => {
  it("allows active, paused and ready agents", () => {
    expect(decideLifecycleToggle({ status: "Активен", instructions: "" }).canToggle).toBe(true);
    expect(decideLifecycleToggle({ status: "Приостановлен", instructions: "" }).canToggle).toBe(true);
    expect(decideLifecycleToggle({ status: "Черновик", instructions: "x" }).canToggle).toBe(true);
  });

  it("blocks a draft that is not ready with a reason", () => {
    expect(decideLifecycleToggle({ status: "Черновик", instructions: " " }))
      .toEqual({ canToggle: false, reason: LIFECYCLE_REASONS.notReady });
  });

  it("blocks an unknown status", () => {
    expect(decideLifecycleToggle({ status: "???", instructions: "x" }))
      .toEqual({ canToggle: false, reason: LIFECYCLE_REASONS.unknown });
  });
});

describe("useAgentLifecycleSwitch — команды (Task S2-15)", () => {
  const WS = "demo";
  let agentsStore;
  let modalStore;
  let confirmSpy;
  let sw;
  let setStatusSpy;

  const agent = (id) => agentsStore.getAgent(WS, id);
  const lastConfirm = () => confirmSpy.mock.calls.at(-1)[0];

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    agentsStore = useAgentsStore();
    modalStore = useModalStore();
    confirmSpy = vi.spyOn(modalStore, "confirm").mockImplementation(() => {});
    setStatusSpy = vi.spyOn(agentsStore, "setAgentStatus");
    sw = useAgentLifecycleSwitch({ workspaceId: { value: WS }, delayMs: 100 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("выключение с подтверждением вызывает setAgentStatus", async () => {
    const a = agent(1);
    sw.requestToggle(a, false);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(setStatusSpy).not.toHaveBeenCalled();

    lastConfirm().onConfirm();
    expect(sw.switchState(a).pending).toBe(true);
    await vi.advanceTimersByTimeAsync(100);

    expect(setStatusSpy).toHaveBeenCalledWith(WS, 1, "Приостановлен");
    expect(a.status).toBe("Приостановлен");
    expect(sw.switchState(a).checked).toBe(false);
  });

  it("отмена подтверждения сохраняет состояние и пересинхронизирует переключатель", async () => {
    const a = agent(1);
    sw.requestToggle(a, false);
    const before = sw.switchState(a).syncKey;

    lastConfirm().onCancel();
    await vi.advanceTimersByTimeAsync(500);

    expect(sw.switchState(a).syncKey).toBeGreaterThan(before);
    expect(setStatusSpy).not.toHaveBeenCalled();
    expect(a.status).toBe("Активен");
    expect(sw.switchState(a).checked).toBe(true);
  });

  it("stale: первая попытка отклонена, повтор успешен", async () => {
    const a = agent(4);
    sw.requestToggle(a, false);
    lastConfirm().onConfirm();
    await vi.advanceTimersByTimeAsync(100);

    expect(setStatusSpy).not.toHaveBeenCalled();
    expect(sw.switchState(a).error).toBe(LIFECYCLE_REASONS.stale);
    expect(a.status).toBe("Активен");

    sw.retry(a);
    expect(sw.switchState(a).error).toBeNull();
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    lastConfirm().onConfirm();
    await vi.advanceTimersByTimeAsync(100);

    expect(setStatusSpy).toHaveBeenCalledWith(WS, 4, "Приостановлен");
    expect(sw.switchState(a).error).toBeNull();
    expect(sw.switchState(a).checked).toBe(false);
  });

  it("failure: повтор снова завершается ошибкой, состояние не меняется", async () => {
    const a = agent(3);
    sw.requestToggle(a, true);
    await vi.advanceTimersByTimeAsync(100);
    expect(sw.switchState(a).error).toBe(LIFECYCLE_REASONS.failure);

    sw.retry(a);
    expect(sw.switchState(a).pending).toBe(true);
    await vi.advanceTimersByTimeAsync(100);

    expect(sw.switchState(a).error).toBe(LIFECYCLE_REASONS.failure);
    expect(setStatusSpy).not.toHaveBeenCalled();
    expect(a.status).toBe("Приостановлен");
    expect(sw.switchState(a).checked).toBe(false);
  });

  it("заблокированный черновик не делает запрос и не открывает подтверждение", async () => {
    const draft = { id: 99, status: "Черновик", instructions: "" };
    const before = sw.switchState(draft).syncKey;

    sw.requestToggle(draft, true);
    sw.requestToggle(draft, false);
    await vi.advanceTimersByTimeAsync(500);

    expect(sw.switchState(draft).disabled).toBe(true);
    expect(sw.switchState(draft).reason).toBe(LIFECYCLE_REASONS.notReady);
    expect(sw.switchState(draft).pending).toBe(false);
    expect(sw.switchState(draft).syncKey).toBeGreaterThan(before);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(setStatusSpy).not.toHaveBeenCalled();
  });

  it("неизвестный статус показывает причину unknown и не делает запрос", async () => {
    const unknown = { id: 98, status: "???", instructions: "x" };

    sw.requestToggle(unknown, true);
    await vi.advanceTimersByTimeAsync(500);

    expect(sw.switchState(unknown).disabled).toBe(true);
    expect(sw.switchState(unknown).reason).toBe(LIFECYCLE_REASONS.unknown);
    expect(setStatusSpy).not.toHaveBeenCalled();
  });

  it("смена workspace во время pending отбрасывает результат и не трогает другой workspace", async () => {
    const ws = { value: WS };
    const local = useAgentLifecycleSwitch({ workspaceId: ws, delayMs: 100 });
    const a = agent(1);

    local.requestToggle(a, false);
    lastConfirm().onConfirm();
    expect(local.switchState(a).pending).toBe(true);

    ws.value = "other";
    await vi.advanceTimersByTimeAsync(100);

    expect(setStatusSpy).not.toHaveBeenCalled();
    expect(a.status).toBe("Активен");
    expect(local.switchState(a).pending).toBe(false);
  });

  it("подтверждение после смены workspace не запускает команду", async () => {
    const ws = { value: WS };
    const local = useAgentLifecycleSwitch({ workspaceId: ws, delayMs: 100 });
    const a = agent(1);

    local.requestToggle(a, false);
    ws.value = "other";
    lastConfirm().onConfirm();
    await vi.advanceTimersByTimeAsync(100);

    expect(setStatusSpy).not.toHaveBeenCalled();
    expect(local.switchState(a).pending).toBe(false);
  });
});
