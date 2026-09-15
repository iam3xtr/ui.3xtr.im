import { computed, ref, shallowRef, watch } from "vue";

/**
 * Все состояния fixture-контракта сохранения (Task A10.1, `.todo`/`.plan`
 * Stage A10 «Явное сохранение и безопасное редактирование»). Формы
 * agent/settings, knowledge/settings, workspace/settings и profile/settings
 * используют один и тот же shared adapter вместо повторения локального
 * `draft` + `hasChanges` + `save`/`reset` в каждом компоненте — контракт
 * полей общий, но каждая форма остаётся собственной командой/транзакцией
 * (см. `.todo`: «Независимые операции пароля, ключа, профиля и конфигурации
 * не становятся одной транзакцией»).
 * @type {ReadonlyArray<"clean"|"dirty"|"pending"|"success"|"error"|"conflict"|"unknown">}
 */
export const SAVE_STATES = Object.freeze([
  "clean",
  "dirty",
  "pending",
  "success",
  "error",
  "conflict",
  "unknown",
]);

function defaultIsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/**
 * Shared no-network fixture adapter for a single-record edit form: draft,
 * dirty tracking, idempotent submit, field errors and a conflict path that
 * never auto-overwrites local input.
 *
 * The kit has no server, so "conflict" is modelled honestly rather than
 * faked at random: `source()` is the canonical fixture record (a Pinia
 * store getter). If it drifts between when the draft was last synced and
 * when `save()` actually applies the patch — e.g. another part of the UI,
 * or another composable instance, mutated the same record — that drift
 * itself is the conflict signal, independent of any store change.
 *
 * "Unknown" is likewise honest: if `submit()` has not settled within
 * `pendingTimeoutMs`, the UI must not blindly resubmit a possibly-applied
 * command — `verify()` waits on the same in-flight promise instead of
 * firing a second one.
 *
 * @template T
 * @param {object} options
 * @param {() => (T | null | undefined)} options.source Canonical fixture record getter.
 * @param {(value: T | null | undefined) => Record<string, any>} options.toDraft
 *   Projects the canonical record onto the plain draft shape this form edits.
 * @param {(draft: Record<string, any>) => Record<string, string>} [options.validate]
 *   Returns `{ field: message }` for invalid fields; an empty object means valid.
 * @param {(draft: Record<string, any>, source: T | null | undefined) => (
 *   Promise<{ ok: boolean, conflict?: boolean, message?: string,
 *     fieldErrors?: Record<string, string>, remote?: Record<string, any> }>
 *   | { ok: boolean, conflict?: boolean, message?: string,
 *     fieldErrors?: Record<string, string>, remote?: Record<string, any> }
 * )} options.submit Applies the draft; never called while a previous call is pending.
 * @param {(a: Record<string, any>, b: Record<string, any>) => boolean} [options.isEqual]
 * @param {number} [options.pendingTimeoutMs]
 */
export function useSavableForm(options) {
  const {
    source,
    toDraft,
    validate = () => ({}),
    submit,
    isEqual = defaultIsEqual,
    pendingTimeoutMs = 8000,
  } = options;

  const draft = ref(clone(toDraft(source())));
  // Stage A10 review fix: `shallowRef`, not a plain closure variable — a
  // bare reassignment wouldn't invalidate `hasChanges` below, since Vue's
  // `computed` only re-derives when a *tracked reactive* dependency
  // changes. `sync()` masked this (it always pairs the reassignment with a
  // `draft.value` write, which is itself tracked); `keepLocal()` doesn't,
  // so it could read a stale cached `hasChanges` right after replacing the
  // baseline.
  const baselineDraft = shallowRef(clone(toDraft(source())));

  const state = ref("clean");
  const errorMessage = ref("");
  // Field errors returned by the *last submit attempt* (e.g. a server-side
  // field rejection `validate()` cannot see ahead of time). Live validation
  // errors are exposed separately below and take priority in `fieldErrors`,
  // so an invalid field is flagged as soon as it's dirty, not only after a
  // failed Save.
  const submitFieldErrors = ref({});
  const conflictRemote = ref(null);

  let submitToken = 0;
  let timeoutHandle = null;
  let inFlightPromise = null;

  const hasChanges = computed(() => !isEqual(draft.value, baselineDraft.value));
  const validationErrors = computed(() => validate(draft.value) ?? {});
  const isValid = computed(() => Object.keys(validationErrors.value).length === 0);
  const fieldErrors = computed(() => (
    Object.keys(validationErrors.value).length > 0 ? validationErrors.value : submitFieldErrors.value
  ));

  /** Someone/something changed the canonical record since our last sync. */
  function isStale() {
    return !isEqual(clone(toDraft(source())), baselineDraft.value);
  }

  function clearTimer() {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  }

  // Set for the duration of a `sync()`'s own draft/baseline reset so the
  // `hasChanges` watcher below does not immediately re-derive (and clobber)
  // the state `sync()`'s caller is about to set explicitly (`"success"` on a
  // completed save, `"clean"` on reset/reload) — both flip `hasChanges` back
  // to `false` in the very same synchronous assignment.
  let suppressAutoState = false;

  /**
   * Re-adopt the canonical record — discards any local draft.
   * @param {"clean"|"success"} [nextState]
   */
  function sync(nextState = "clean") {
    submitToken += 1;
    clearTimer();
    inFlightPromise = null;
    suppressAutoState = true;
    baselineDraft.value = clone(toDraft(source()));
    draft.value = clone(baselineDraft.value);
    suppressAutoState = false;
    state.value = nextState;
    errorMessage.value = "";
    submitFieldErrors.value = {};
    conflictRemote.value = null;
  }

  // Adopt upstream fixture changes only while the form has no local edits —
  // a dirty/pending/conflict/unknown form is never silently clobbered by an
  // upstream change; that drift instead surfaces as a conflict on `save()`.
  //
  // `deep: true` matters here: `source()` on every current consumer returns
  // the same Pinia-reactive record object across calls (a store getter
  // finds it by id, it never clones), and an instant fixture command (e.g.
  // Task A10.2's `detachApiKey`) mutates that record's fields in place via
  // `Object.assign` rather than replacing it. A shallow `watch` only compares
  // the returned reference — unchanged here — so it would silently miss the
  // mutation and leave a clean form showing stale field values indefinitely.
  //
  // `flush: "sync"` matters too, for the same reason the `hasChanges` watcher
  // below needs it: an instant command can mutate the canonical record *and*
  // a bound draft field in the same synchronous handler (e.g. `ApiKeySelect`
  // deleting the currently-selected key both detaches it from the agent
  // record and nulls the `v-model`-bound `draft.apiKeyId`). Left at the
  // default deferred flush, that field-level nudge would run first and mark
  // the form "dirty" — via the `hasChanges` watcher's own `flush: "sync"` —
  // before this resync ever got a chance to run, permanently blocking it
  // (the guard below only resyncs from "clean"/"success"). Resyncing
  // synchronously, in the same tick the record actually changed, wins the
  // race instead of losing it.
  watch(source, () => {
    if (state.value === "clean" || state.value === "success") {
      sync();
    }
  }, { deep: true, immediate: true, flush: "sync" });

  // `flush: "sync"` — this must land before `save()` (called synchronously
  // right after a draft edit in the common click-handler case) ever runs,
  // otherwise Vue's default post-flush timing would let a queued job here
  // fire *after* `save()` has already set `error`/`conflict`/`success` and
  // clobber it back to `dirty`.
  watch(hasChanges, (changed) => {
    if (suppressAutoState) {
      return;
    }
    if (state.value === "pending" || state.value === "conflict" || state.value === "unknown") {
      return;
    }
    state.value = changed ? "dirty" : "clean";
  }, { flush: "sync" });

  /** Discard local edits and return to the canonical record ("Выйти без сохранения"). */
  function reset() {
    sync();
  }

  async function save() {
    // Duplicate/rapid submit while pending is a no-op, not a second fixture
    // effect — the caller gets the same promise the first submit is
    // already awaiting.
    if (state.value === "pending") {
      return inFlightPromise;
    }

    if (!hasChanges.value) {
      return { ok: true, noop: true };
    }

    const errors = validationErrors.value;
    if (Object.keys(errors).length > 0) {
      state.value = "error";
      errorMessage.value = "Проверьте поля перед сохранением.";
      return { ok: false, fieldErrors: errors };
    }

    if (isStale()) {
      state.value = "conflict";
      conflictRemote.value = clone(toDraft(source()));
      return { ok: false, conflict: true };
    }

    state.value = "pending";
    errorMessage.value = "";
    submitFieldErrors.value = {};
    const token = (submitToken += 1);

    timeoutHandle = setTimeout(() => {
      if (submitToken === token && state.value === "pending") {
        state.value = "unknown";
      }
    }, pendingTimeoutMs);

    // `submit()` itself is invoked synchronously — for a synchronous fixture
    // mutation (the kit's usual case, no real network) the store change
    // lands within the same call stack as `save()`, exactly like the
    // hand-rolled `save()` functions this composable replaces. Only the
    // state-machine bookkeeping below (`success`/`error`/`conflict`, the
    // timeout race) is deferred to a microtask, so a `submit()` that
    // returns a real Promise is handled identically.
    let submitResult;
    try {
      submitResult = submit(clone(draft.value), source());
    } catch (error) {
      clearTimer();
      state.value = "error";
      errorMessage.value = error?.message || "Не удалось сохранить изменения.";
      return { ok: false, message: error?.message };
    }

    inFlightPromise = Promise.resolve(submitResult)
      .then((result) => {
        if (token !== submitToken) {
          return result;
        }

        clearTimer();

        if (result?.ok) {
          sync("success");
        } else if (result?.conflict) {
          state.value = "conflict";
          conflictRemote.value = result.remote ?? clone(toDraft(source()));
        } else {
          state.value = "error";
          errorMessage.value = result?.message || "Не удалось сохранить изменения.";
          submitFieldErrors.value = result?.fieldErrors ?? {};
        }

        return result;
      })
      .catch((error) => {
        if (token !== submitToken) {
          return { ok: false, message: error?.message };
        }

        clearTimer();
        state.value = "error";
        errorMessage.value = error?.message || "Не удалось сохранить изменения.";
        return { ok: false, message: error?.message };
      });

    return inFlightPromise;
  }

  /** Only valid from `error` — `unknown` must be verified, not blindly retried. */
  function retry() {
    if (state.value !== "error") {
      return undefined;
    }
    return save();
  }

  /**
   * For `unknown`: check what the already in-flight submit resolves to
   * instead of firing a second command.
   */
  function verify() {
    if (state.value !== "unknown" || !inFlightPromise) {
      return undefined;
    }
    return inFlightPromise;
  }

  /**
   * Conflict → keep the local draft, dismiss the banner, adopt the
   * remote value only as the new comparison baseline (not overwriting
   * what the user typed) so a further edit/save is evaluated against it.
   */
  function keepLocal() {
    if (state.value !== "conflict") {
      return;
    }

    baselineDraft.value = clone(toDraft(source()));
    conflictRemote.value = null;
    state.value = hasChanges.value ? "dirty" : "clean";
  }

  /** Conflict → re-read the canonical record, discarding the local draft. */
  function reloadRemote() {
    if (state.value !== "conflict") {
      return;
    }
    sync();
  }

  return {
    draft,
    state,
    hasChanges,
    isValid,
    fieldErrors,
    errorMessage,
    conflictRemote,
    isPending: computed(() => state.value === "pending"),
    isError: computed(() => state.value === "error"),
    isConflict: computed(() => state.value === "conflict"),
    isUnknown: computed(() => state.value === "unknown"),
    isSuccess: computed(() => state.value === "success"),
    save,
    retry,
    verify,
    reset,
    keepLocal,
    reloadRemote,
  };
}
