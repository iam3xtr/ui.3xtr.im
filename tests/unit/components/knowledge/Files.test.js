import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { ref } from "vue";
import Buefy from "buefy";

import Files from "../../../../src/components/knowledge/Files.vue";
import { useKnowledgeStore } from "../../../../src/stores/knowledge.js";
import { useWorkspaceStore } from "../../../../src/stores/workspace.js";

// jsdom has no `matchMedia` — `Loader.vue` reads it on mount (see
// tests/unit/components/Agents.test.js for the same fix).
if (typeof window.matchMedia !== "function") {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

vi.mock("../../../../src/composables/useSimulatedLoading.js", () => ({
  useSimulatedLoading: () => ({ isLoading: ref(false) }),
}));

function makeFile(name, size = 1024) {
  const file = new File(["x"], name, { type: "text/plain" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function fileTransfer(files) {
  return { types: ["Files"], files, dropEffect: "none" };
}

async function mountFiles({ collectionId = "1" } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const workspaceStore = useWorkspaceStore();
  workspaceStore.activeWorkspaceId = "demo";

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/knowledge/:id", name: "knowledge-collection", component: Files },
    ],
  });
  router.push(`/knowledge/${collectionId}`);
  await router.isReady();

  const wrapper = mount(Files, {
    global: {
      plugins: [pinia, router, Buefy],
    },
  });
  await flushPromises();

  return { wrapper, router };
}

// Task 3.2: the picker (`b-upload`) and `FileDropTarget` wrapping the table
// are two equal entry points into the same fixture-only enqueue helper.
describe("knowledge/Files.vue — drop и picker через общую demo-очередь (Issue #3.2)", () => {
  it("picker (b-upload v-model) добавляет объект в очередь в статусе indexing", async () => {
    const { wrapper } = await mountFiles();
    const knowledgeStore = useKnowledgeStore();
    const before = knowledgeStore.getCollection("demo", "1").objects.length;

    await wrapper.findComponent({ name: "BUpload" }).vm.$emit("update:modelValue", [makeFile("picked.pdf")]);
    await flushPromises();

    const objects = knowledgeStore.getCollection("demo", "1").objects;
    expect(objects.length).toBe(before + 1);
    expect(objects.at(-1).name).toBe("picked.pdf");
    expect(objects.at(-1).status).toBe("indexing");
  });

  it("drop над таблицей добавляет объект через тот же жизненный цикл, что и picker", async () => {
    const { wrapper } = await mountFiles();
    const knowledgeStore = useKnowledgeStore();
    const before = knowledgeStore.getCollection("demo", "1").objects.length;

    const dropTarget = wrapper.find(".tr-file-drop-target");
    const dt = fileTransfer([makeFile("dropped.pdf")]);
    await dropTarget.trigger("dragenter", { dataTransfer: dt });
    expect(wrapper.find(".tr-file-drop-target__overlay").exists()).toBe(true);

    await dropTarget.trigger("drop", { dataTransfer: dt });
    await flushPromises();

    expect(wrapper.find(".tr-file-drop-target__overlay").exists()).toBe(false);

    const objects = knowledgeStore.getCollection("demo", "1").objects;
    expect(objects.length).toBe(before + 1);
    expect(objects.at(-1).name).toBe("dropped.pdf");
    expect(objects.at(-1).status).toBe("indexing");
  });

  it("явный picker остаётся доступен рядом с drop-таблицей", async () => {
    const { wrapper } = await mountFiles();

    expect(wrapper.findComponent({ name: "BUpload" }).exists()).toBe(true);
    expect(wrapper.find(".tr-file-drop-target").exists()).toBe(true);
  });

  it("поиск и действия строки продолжают работать под FileDropTarget", async () => {
    const { wrapper } = await mountFiles();

    // Search still narrows the table underneath the drop target.
    await wrapper.find("input.input").setValue("Начало работы");
    await flushPromises();
    expect(wrapper.text()).toContain("Начало работы");
    expect(wrapper.text()).not.toContain("Настройка интеграций");
    await wrapper.find("input.input").setValue("");
    await flushPromises();

    // Row action trigger still renders/reachable — the drop overlay only
    // mounts (`v-if`) during an active file drag, so it never sits over the
    // table intercepting clicks at rest.
    const rowAction = wrapper.find("[aria-label='Действия с файлом «Начало работы»']");
    expect(rowAction.exists()).toBe(true);
  });
});
