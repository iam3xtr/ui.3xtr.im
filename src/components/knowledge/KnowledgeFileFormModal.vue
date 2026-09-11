<template>
  <b-modal
    :model-value="modalStore.isOpen(modalKey)"
    has-modal-card
    @update:model-value="(value) => (value ? modalStore.open(modalKey) : modalStore.close(modalKey))"
  >
    <form class="modal-card" @submit.prevent="submit">
      <header class="modal-card-head">
        <p class="modal-card-title">Добавить источник</p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="modalStore.close(modalKey)"
        />
      </header>

      <section class="modal-card-body">
        <b-tabs v-model="activeTab" type="is-boxed">
          <b-tab-item value="text" label="Текст">
            <div class="tr-form">
              <b-field label="Название">
                <b-input v-model="name" placeholder="Например, Аргументы для переговоров" required />
              </b-field>
              <b-field label="Содержимое">
                <b-input
                  v-model="content"
                  type="textarea"
                  rows="8"
                  placeholder="Вставьте или напишите Markdown-текст"
                />
              </b-field>
            </div>
          </b-tab-item>

          <b-tab-item value="url" label="Ссылка">
            <div class="tr-form">
              <b-field label="Название">
                <b-input v-model="name" placeholder="Например, Актуальные тарифы" required />
              </b-field>
              <b-field label="URL">
                <b-input v-model="url" type="url" placeholder="https://example.com" required />
              </b-field>
            </div>
          </b-tab-item>
        </b-tabs>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="modalStore.close(modalKey)">
          Отмена
        </b-button>
        <b-button native-type="submit" type="is-primary" :disabled="!canSave">
          Добавить
        </b-button>
      </footer>
    </form>
  </b-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

import { useKnowledgeStore } from "../../stores/knowledge";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";

// Add-source modal (Task A5.6), equivalent of
// `get.3xtr.im/src/modules/knowledge/components/KnowledgeFileForm.vue`
// scoped to its `text`/`url` tabs — the cabinet's third path (drag-and-drop
// file upload) is `Files.vue`'s own `b-upload` dropzone here, not part of
// this modal, so there is no `file` tab to switch to. The cabinet's inline
// Markdown-preview renderer is product logic with no design-review payoff in
// a kit with no real indexing pipeline, so this form stops at a plain
// textarea; the tab layout, fields and save/cancel contract are otherwise
// unchanged.
const modalKey = "knowledge-object-form";

const props = defineProps({
  collectionId: { type: [String, Number], required: true },
  initialTab: { type: String, default: "text" },
});

const modalStore = useModalStore();
const knowledgeStore = useKnowledgeStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const activeTab = ref(props.initialTab);
const name = ref("");
const content = ref("");
const url = ref("");

const canSave = computed(() => {
  if (activeTab.value === "text") return Boolean(name.value.trim() && content.value.trim());
  return Boolean(name.value.trim() && url.value.trim());
});

watch(
  () => modalStore.isOpen(modalKey),
  (isOpen) => {
    if (!isOpen) {
      return;
    }

    activeTab.value = props.initialTab;
    name.value = "";
    content.value = "";
    url.value = "";
  },
);

function submit() {
  if (!canSave.value) {
    return;
  }

  const isText = activeTab.value === "text";
  const object = knowledgeStore.addObject(activeWorkspaceId.value, props.collectionId, {
    name: name.value.trim(),
    kind: isText ? "text" : "url",
    size: isText ? content.value.length : 0,
    sourceLabel: isText ? "Внутренний документ" : url.value.trim(),
  });

  if (object) {
    setTimeout(() => {
      knowledgeStore.setObjectStatus(activeWorkspaceId.value, props.collectionId, object.id, "indexed");
    }, 1200);
  }

  modalStore.close(modalKey);
}
</script>
