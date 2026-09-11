<template>
  <b-modal
    :model-value="modalStore.isOpen(modalKey)"
    has-modal-card
    @update:model-value="(value) => (value ? modalStore.open(modalKey) : modalStore.close(modalKey))"
  >
    <form class="modal-card" @submit.prevent="submit">
      <header class="modal-card-head">
        <p class="modal-card-title">Новая коллекция</p>
        <button
          class="delete"
          type="button"
          aria-label="Закрыть"
          @click="modalStore.close(modalKey)"
        />
      </header>

      <section class="modal-card-body tr-form">
        <b-field label="Название">
          <b-input
            v-model="name"
            placeholder="Например, Документация продукта"
            required
          />
        </b-field>

        <b-field label="Описание">
          <b-input
            v-model="description"
            type="textarea"
            rows="3"
            placeholder="Что попадёт в эту коллекцию"
          />
        </b-field>

        <b-field label="Тип коллекции">
          <b-select v-model="type" expanded>
            <option
              v-for="collectionType in collectionTypes"
              :key="collectionType.value"
              :value="collectionType.value"
            >
              {{ collectionType.label }}
            </option>
          </b-select>
        </b-field>

        <div class="tr-knowledge__type-hint">
          <b-icon :icon="selectedTypeInfo.icon" />
          <span>
            <strong>{{ selectedTypeInfo.label }}</strong>
            <small>{{ selectedTypeInfo.description }}</small>
          </span>
        </div>
      </section>

      <footer class="modal-card-foot">
        <b-button @click="modalStore.close(modalKey)">
          Отмена
        </b-button>
        <b-button native-type="submit" type="is-primary">
          Создать
        </b-button>
      </footer>
    </form>
  </b-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { COLLECTION_TYPES, useKnowledgeStore } from "../../stores/knowledge";
import { useModalStore } from "../../stores/modal";
import { useWorkspaceStore } from "../../stores/workspace";

// Форма создания коллекции (Task A5.6), эквивалент
// `get.3xtr.im/src/modules/knowledge/components/CollectionForm.vue` в его
// create-ветке — редактирование существующей коллекции (name/description)
// живёт отдельно на вкладке `knowledge/Settings.vue`, как в остальном ките
// (см. `agents/AgentSettings.vue`): один экран — один способ менять поля,
// без дублирующей формы в модалке. Начальная загрузка файлов при создании
// (cabinet's `FileUpload` внутри формы) здесь не нужна — тот же результат
// доступен сразу после создания на вкладке «Файлы».
const modalKey = "knowledge-collection-form";

const modalStore = useModalStore();
const knowledgeStore = useKnowledgeStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);
const router = useRouter();

const collectionTypes = COLLECTION_TYPES;

const name = ref("");
const description = ref("");
const type = ref("mixed");

const selectedTypeInfo = computed(() => knowledgeStore.getCollectionType(type.value));

watch(
  () => modalStore.isOpen(modalKey),
  (isOpen) => {
    if (!isOpen) {
      return;
    }

    name.value = "";
    description.value = "";
    type.value = "mixed";
  },
);

function submit() {
  const trimmedName = name.value.trim();

  if (!trimmedName) {
    return;
  }

  const collection = knowledgeStore.createCollection(activeWorkspaceId.value, {
    name: trimmedName,
    description: description.value,
    type: type.value,
  });

  modalStore.close(modalKey);
  router.push({ name: "knowledge-collection", params: { id: collection.id } });
}
</script>
