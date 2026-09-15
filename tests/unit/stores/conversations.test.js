import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import {
  isHandoffClaimable,
  needsOperatorAttention,
  ownsHandoff,
  useConversationsStore,
} from "../../../src/stores/conversations.js";

const OPERATOR_ME = { id: 1, name: "Иван Петров" };
const OPERATOR_OTHER = { id: 2, name: "Анна Смирнова" };

// Task A10.5: owner/lease commands (`claimHandoff`/`releaseHandoff`) and the
// send-time lease guard (`sendMessage`). Conversation ids below come from
// the `demo` workspace fixture in `stores/conversations.js`:
//   1 — escalated, unclaimed (owner: null)
//   2 — not escalated at all (`awaitingOperator` falsy)
//   5 — escalated, owned by OPERATOR_OTHER, active lease
//   6 — escalated, owned by OPERATOR_ME, active lease
//   7 — escalated, owned by OPERATOR_OTHER, but `leaseExpired: true`
describe("stores/conversations — handoff owner/lease (Task A10.5)", () => {
  it("ownsHandoff/isHandoffClaimable are pure reads of handoff/awaitingOperator, never message time", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();
    const unclaimed = store.getConversation("demo", 1, 1);
    const ownedByOther = store.getConversation("demo", 1, 5);
    const ownedByMe = store.getConversation("demo", 3, 6);
    const expired = store.getConversation("demo", 2, 7);

    expect(ownsHandoff(unclaimed, OPERATOR_ME.id)).toBe(false);
    expect(isHandoffClaimable(unclaimed)).toBe(true);

    expect(ownsHandoff(ownedByOther, OPERATOR_ME.id)).toBe(false);
    expect(isHandoffClaimable(ownedByOther)).toBe(false);

    expect(ownsHandoff(ownedByMe, OPERATOR_ME.id)).toBe(true);
    expect(isHandoffClaimable(ownedByMe)).toBe(false);

    // A stale lease: the previous owner no longer "owns" it either — anyone
    // (including them) must reclaim it explicitly.
    expect(ownsHandoff(expired, OPERATOR_OTHER.id)).toBe(false);
    expect(isHandoffClaimable(expired)).toBe(true);

    // Tampering with unrelated time-ish fields changes nothing — the
    // predicates never read them.
    const tampered = { ...unclaimed, updated: "0 мин", created: "Только что" };
    expect(isHandoffClaimable(tampered)).toBe(true);
  });

  it("needsOperatorAttention keeps reading the plain awaitingOperator flag", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    expect(needsOperatorAttention(store.getConversation("demo", 1, 1))).toBe(true);
    expect(needsOperatorAttention(store.getConversation("demo", 2, 2))).toBe(false);
  });

  it("claimHandoff берёт незанятый диалог и переводит его в escalated с владельцем", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const result = store.claimHandoff("demo", 1, OPERATOR_ME);

    expect(result).toEqual({ ok: true, handoff: { owner: OPERATOR_ME, leaseExpired: false } });
    const conversation = store.getConversation("demo", 1, 1);
    expect(conversation.awaitingOperator).toBe(true);
    expect(conversation.handoff).toEqual({ owner: OPERATOR_ME, leaseExpired: false });
  });

  it("claimHandoff — Stage A10 review fix: не-эскалированный диалог эскалируется и захватывается атомарно", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    // id 2 — совсем не эскалирован (см. комментарий над describe). Claim на
    // таком диалоге должен, как и документирует `claimHandoff`, сразу
    // выставить `awaitingOperator: true` и захватить lease — а не считать
    // это конфликтом "owned-by-another", как если бы диалог был занят.
    const before = store.getConversation("demo", 2, 2);
    expect(before.awaitingOperator).toBeFalsy();

    const result = store.claimHandoff("demo", 2, OPERATOR_ME);

    expect(result).toEqual({ ok: true, handoff: { owner: OPERATOR_ME, leaseExpired: false } });
    const conversation = store.getConversation("demo", 2, 2);
    expect(conversation.awaitingOperator).toBe(true);
    expect(conversation.handoff).toEqual({ owner: OPERATOR_ME, leaseExpired: false });
  });

  it("claimHandoff — конфликт: диалог уже ведёт другой оператор с активным lease, состояние не меняется", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const before = { ...store.getConversation("demo", 1, 5).handoff };
    const result = store.claimHandoff("demo", 5, OPERATOR_ME);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("owned-by-another");
    expect(result.handoff).toEqual(before);
    expect(store.getConversation("demo", 1, 5).handoff).toEqual(before);
  });

  it("claimHandoff — истёкший lease забирается без конфликта (в т.ч. прежним владельцем)", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const result = store.claimHandoff("demo", 7, OPERATOR_OTHER);

    expect(result).toEqual({ ok: true, handoff: { owner: OPERATOR_OTHER, leaseExpired: false } });
  });

  it("claimHandoff — повторный вызов текущим владельцем не конфликтует (no-op success)", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const result = store.claimHandoff("demo", 6, OPERATOR_ME);

    expect(result.ok).toBe(true);
    expect(result.handoff.owner).toEqual(OPERATOR_ME);
  });

  it("releaseHandoff — владелец возвращает диалог агенту, awaitingOperator снимается целиком", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const result = store.releaseHandoff("demo", 6, OPERATOR_ME);

    expect(result).toEqual({ ok: true, handoff: { owner: null, leaseExpired: false } });
    const conversation = store.getConversation("demo", 3, 6);
    expect(conversation.awaitingOperator).toBe(false);
    expect(conversation.handoff).toEqual({ owner: null, leaseExpired: false });
  });

  it("releaseHandoff — не владелец получает конфликт и ничего не меняет", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const before = { ...store.getConversation("demo", 1, 5).handoff };
    const result = store.releaseHandoff("demo", 5, OPERATOR_ME);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("owned-by-another");
    expect(store.getConversation("demo", 1, 5).handoff).toEqual(before);
  });

  it("releaseHandoff — не эскалированный диалог отклоняется с lease-missing", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const result = store.releaseHandoff("demo", 2, OPERATOR_ME);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("lease-missing");
  });

  it("sendMessage работает как раньше для не эскалированного диалога", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const before = store.getConversation("demo", 2, 2).messages.length;
    const result = store.sendMessage("demo", 2, "Проверка", OPERATOR_ME);

    expect(result).toEqual({ ok: true });
    expect(store.getConversation("demo", 2, 2).messages.length).toBe(before + 1);
  });

  it("sendMessage — конфликт: чужой активный владелец блокирует отправку, текст не уходит", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const before = store.getConversation("demo", 1, 5).messages.length;
    const result = store.sendMessage("demo", 5, "Секретный текст", OPERATOR_ME);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("owned-by-another");
    expect(result.handoff.owner).toEqual(OPERATOR_OTHER);
    const conversation = store.getConversation("demo", 1, 5);
    expect(conversation.messages.length).toBe(before);
    expect(conversation.messages.some((m) => m.text === "Секретный текст")).toBe(false);
  });

  it("sendMessage — эскалированный и незанятый диалог блокирует отправку до claim", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const result = store.sendMessage("demo", 1, "Привет", OPERATOR_ME);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("lease-missing");
  });

  it("sendMessage — владелец активного lease может отвечать", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    const result = store.sendMessage("demo", 6, "Разбираюсь с тикетом", OPERATOR_ME);

    expect(result).toEqual({ ok: true });
  });
});

describe("stores/conversations — delivery retry guard (Task A10.5)", () => {
  it("retryMessageDelivery меняет статус только для failed+retryable", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    // Conversation 4: id 2 message — failed + retryable.
    store.retryMessageDelivery("demo", 4, 2);
    expect(store.getConversation("demo", 2, 4).messages[1].delivery.status).toBe("delivered");
  });

  it("retryMessageDelivery — non-retryable/non-failed статусы не меняются", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useConversationsStore();

    // Conversation 1: id 2 message — status "read", not failed at all.
    store.retryMessageDelivery("demo", 1, 2);
    expect(store.getConversation("demo", 1, 1).messages[1].delivery.status).toBe("read");

    // Conversation 6: id 2 message — status "cancelled".
    store.retryMessageDelivery("demo", 6, 2);
    expect(store.getConversation("demo", 3, 6).messages[1].delivery.status).toBe("cancelled");

    // Conversation 5: id 2 message — status "queued".
    store.retryMessageDelivery("demo", 5, 2);
    expect(store.getConversation("demo", 1, 5).messages[1].delivery.status).toBe("queued");
  });
});
