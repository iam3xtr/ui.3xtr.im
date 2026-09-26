import { effectScope, nextTick, ref } from "vue";
import { beforeEach, describe, expect, it } from "vitest";

import { useDashboardAttentionQueue } from "../../../src/composables/useDashboardAttentionQueue";

// `.todo` "Добавить прямой выбор карточки в pager «Требует внимания»":
// direct selection by number on top of the session-scoped queue. Watchers
// need a live effect scope outside a component.
function setup(keys, workspaceId = "demo") {
  const items = ref(keys.map((key) => ({ key, title: key.toUpperCase() })));
  const workspace = ref(workspaceId);
  const scope = effectScope();
  const queue = scope.run(() => useDashboardAttentionQueue(items, workspace));
  return { items, workspace, queue, scope };
}

describe("composables/useDashboardAttentionQueue — прямой выбор", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("goTo открывает видимую карточку по индексу и сохраняет границы previous/next", () => {
    const { queue, scope } = setup(["a", "b", "c"]);

    expect(queue.visibleItems.value.map((item) => item.key)).toEqual(["a", "b", "c"]);
    expect(queue.activeIndex.value).toBe(0);

    queue.goTo(2);
    expect(queue.activeItem.value.key).toBe("c");
    expect(queue.position.value).toBe(3);
    expect(queue.hasNext.value).toBe(false);
    expect(queue.hasPrevious.value).toBe(true);

    queue.goTo(1);
    expect(queue.activeItem.value.key).toBe("b");

    // Out-of-range indices are ignored instead of clearing the selection.
    queue.goTo(5);
    queue.goTo(-1);
    expect(queue.activeItem.value.key).toBe("b");
    scope.stop();
  });

  it("номера пересчитываются из видимого списка после скрытия, восстановления и изменения источника", async () => {
    const { items, queue, scope } = setup(["a", "b", "c", "d"]);

    // Dismiss "b" while it is active: the neighbour at the same position
    // becomes active and "c" is now number 2.
    queue.goTo(1);
    queue.dismissActive();
    await nextTick();
    expect(queue.visibleItems.value.map((item) => item.key)).toEqual(["a", "c", "d"]);
    expect(queue.activeItem.value.key).toBe("c");
    expect(queue.activeIndex.value).toBe(1);

    // Select "d", then restore: "d" stays active (key-stable) and moves to
    // its restored number.
    queue.goTo(2);
    queue.restoreHidden();
    await nextTick();
    expect(queue.visibleItems.value.map((item) => item.key)).toEqual(["a", "b", "c", "d"]);
    expect(queue.activeItem.value.key).toBe("d");
    expect(queue.activeIndex.value).toBe(3);

    // A new source item in front shifts numbering; the active card is
    // still found by key.
    items.value = [{ key: "z", title: "Z" }, ...items.value];
    await nextTick();
    expect(queue.activeItem.value.key).toBe("d");
    expect(queue.position.value).toBe(5);
    expect(queue.total.value).toBe(5);

    // The active source item disappears: the neighbour is selected.
    items.value = items.value.filter((item) => item.key !== "d");
    await nextTick();
    expect(queue.activeItem.value.key).toBe("c");
    expect(queue.position.value).toBe(4);
    scope.stop();
  });

  it("скрытие изолировано по workspace, выбор сбрасывается при смене пространства", async () => {
    const { workspace, queue, scope } = setup(["a", "b", "c"], "demo");

    queue.goTo(2);
    queue.dismissActive();
    await nextTick();
    expect(queue.visibleItems.value.map((item) => item.key)).toEqual(["a", "b"]);

    workspace.value = "other";
    await nextTick();
    expect(queue.visibleItems.value.map((item) => item.key)).toEqual(["a", "b", "c"]);
    expect(queue.activeItem.value.key).toBe("a");

    workspace.value = "demo";
    await nextTick();
    expect(queue.visibleItems.value.map((item) => item.key)).toEqual(["a", "b"]);
    scope.stop();
  });
});
