import { effectScope, nextTick, reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSavableForm } from "../../../src/composables/useSavableForm";

// Task A10.1: unit coverage for the shared save-state fixture-adapter —
// idempotent submit, field errors, honest conflict/unknown modelling and
// retry/verify — independent of any single form component. Reactive
// dependencies (`watch(source, ...)`) need a live effect scope outside a
// component, so every test runs its composable call inside one and tears
// it down afterwards.
function withScope(setup) {
  const scope = effectScope();
  const result = scope.run(setup);
  return { ...result, scope };
}

describe("composables/useSavableForm", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts clean and becomes dirty only once the draft differs from the source", () => {
    const record = reactive({ name: "Acme" });
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit: () => ({ ok: true }),
      }),
    }));

    expect(form.state.value).toBe("clean");
    expect(form.hasChanges.value).toBe(false);

    form.draft.value.name = "Acme Inc";
    expect(form.hasChanges.value).toBe(true);
    expect(form.state.value).toBe("dirty");

    form.draft.value.name = "Acme";
    expect(form.hasChanges.value).toBe(false);
    expect(form.state.value).toBe("clean");

    scope.stop();
  });

  it("blocks save on a field error without clearing the draft", async () => {
    const record = reactive({ name: "Acme" });
    const submit = vi.fn(() => ({ ok: true }));
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        validate: (value) => (value.name.trim() ? {} : { name: "Введите название." }),
        submit,
      }),
    }));

    form.draft.value.name = "  ";
    const result = await form.save();

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.name).toBeTruthy();
    expect(form.isError.value).toBe(true);
    expect(form.fieldErrors.value.name).toBeTruthy();
    // The invalid input itself is never discarded.
    expect(form.draft.value.name).toBe("  ");
    expect(submit).not.toHaveBeenCalled();

    scope.stop();
  });

  it("does not fire a second submit while one is pending (idempotent duplicate submit)", async () => {
    const record = reactive({ name: "Acme" });
    let resolveSubmit;
    const submit = vi.fn(() => new Promise((resolve) => {
      resolveSubmit = resolve;
    }));
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit,
      }),
    }));

    form.draft.value.name = "Acme Inc";
    const firstCall = form.save();
    const secondCall = form.save();

    expect(form.isPending.value).toBe(true);
    expect(submit).toHaveBeenCalledOnce();

    resolveSubmit({ ok: true });
    await firstCall;
    await secondCall;

    expect(form.isSuccess.value).toBe(true);

    scope.stop();
  });

  it("surfaces a conflict without auto-overwriting the local draft, and never resends a stale response", async () => {
    const record = reactive({ name: "Acme" });
    const submit = vi.fn(() => ({ ok: true }));
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit,
      }),
    }));

    form.draft.value.name = "Acme Inc";
    // Someone else changes the canonical record while the draft is open.
    record.name = "Acme Renamed Elsewhere";
    await nextTick();

    const result = await form.save();

    expect(result.ok).toBe(false);
    expect(result.conflict).toBe(true);
    expect(form.isConflict.value).toBe(true);
    // Local input is preserved, not silently replaced by the remote value.
    expect(form.draft.value.name).toBe("Acme Inc");
    expect(form.conflictRemote.value.name).toBe("Acme Renamed Elsewhere");
    expect(submit).not.toHaveBeenCalled();

    // "Оставить мой вариант": dismiss the banner, keep local input.
    form.keepLocal();
    expect(form.isConflict.value).toBe(false);
    expect(form.draft.value.name).toBe("Acme Inc");
    expect(form.hasChanges.value).toBe(true);

    scope.stop();
  });

  it("keepLocal recomputes hasChanges against the new baseline instead of a stale cached value (Stage A10 review fix)", async () => {
    const record = reactive({ name: "Acme" });
    const submit = vi.fn(() => ({ ok: true }));
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit,
      }),
    }));

    form.draft.value.name = "Acme Inc";
    record.name = "Acme Renamed Elsewhere";
    await nextTick();
    await form.save();
    expect(form.isConflict.value).toBe(true);

    // The remote record now happens to change *again*, to exactly the
    // draft's own value, before the user picks "Оставить мой вариант" —
    // adopting it as the new baseline should leave the draft clean, not
    // stuck "dirty" from a stale cached `hasChanges`.
    record.name = "Acme Inc";
    await nextTick();

    form.keepLocal();

    expect(form.isConflict.value).toBe(false);
    expect(form.draft.value.name).toBe("Acme Inc");
    expect(form.hasChanges.value).toBe(false);
    expect(form.state.value).toBe("clean");

    scope.stop();
  });

  it("reloadRemote discards the local draft and adopts the canonical record", async () => {
    const record = reactive({ name: "Acme" });
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit: () => ({ ok: true }),
      }),
    }));

    form.draft.value.name = "Acme Inc";
    record.name = "Acme Renamed Elsewhere";
    await nextTick();
    await form.save();

    expect(form.isConflict.value).toBe(true);
    form.reloadRemote();

    expect(form.isConflict.value).toBe(false);
    expect(form.draft.value.name).toBe("Acme Renamed Elsewhere");
    expect(form.hasChanges.value).toBe(false);

    scope.stop();
  });

  it("retry only resubmits from `error`, and unknown must be verified rather than retried", async () => {
    vi.useFakeTimers();

    const record = reactive({ name: "Acme" });
    let resolveSubmit;
    const submit = vi.fn(() => new Promise((resolve) => {
      resolveSubmit = resolve;
    }));
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit,
        pendingTimeoutMs: 1000,
      }),
    }));

    form.draft.value.name = "Acme Inc";
    form.save();

    expect(form.isPending.value).toBe(true);
    // retry() is a no-op while pending — not a second submit.
    expect(form.retry()).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1500);

    expect(form.isUnknown.value).toBe(true);
    // A blind retry must not fire while the result is unknown.
    expect(form.retry()).toBeUndefined();
    expect(submit).toHaveBeenCalledOnce();

    // verify() checks the same in-flight submit instead of resubmitting.
    const verifyResult = form.verify();
    resolveSubmit({ ok: true });
    await verifyResult;

    expect(submit).toHaveBeenCalledOnce();
    expect(form.isSuccess.value).toBe(true);

    scope.stop();
  });

  it("retry resubmits after a real error", async () => {
    const record = reactive({ name: "Acme" });
    const submit = vi.fn()
      .mockImplementationOnce(() => ({ ok: false, message: "Не удалось сохранить." }))
      .mockImplementationOnce(() => ({ ok: true }));

    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit,
      }),
    }));

    form.draft.value.name = "Acme Inc";
    await form.save();

    expect(form.isError.value).toBe(true);
    expect(form.draft.value.name).toBe("Acme Inc");

    await form.retry();

    expect(submit).toHaveBeenCalledTimes(2);
    expect(form.isSuccess.value).toBe(true);

    scope.stop();
  });

  it("reset() discards local edits and returns to the canonical record", () => {
    const record = reactive({ name: "Acme" });
    const { form, scope } = withScope(() => ({
      form: useSavableForm({
        source: () => record,
        toDraft: (value) => ({ name: value?.name ?? "" }),
        submit: () => ({ ok: true }),
      }),
    }));

    form.draft.value.name = "Something else";
    expect(form.hasChanges.value).toBe(true);

    form.reset();

    expect(form.hasChanges.value).toBe(false);
    expect(form.draft.value.name).toBe("Acme");
    expect(form.state.value).toBe("clean");

    scope.stop();
  });
});
