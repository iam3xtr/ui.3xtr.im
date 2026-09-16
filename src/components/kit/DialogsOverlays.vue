<template>
  <!--
    Диалоги и оверлеи (Task A8.6): подтверждение, тосты, оверлейная загрузка,
    скелетоны, боковая панель и модальное окно — часть прежней единой `/kit`
    (Task A5.3), разделённой на маршрутные подразделы.
  -->
  <PageHeader
    title="Диалоги и оверлеи"
    subtitle="Подтверждения, тосты, оверлейная загрузка и модальные поверхности."
  />

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Диалог подтверждения</h2>
    <p class="tr-muted mb-4">
      Подтверждение опасного действия — штатный <code>b-dialog</code>,
      не собственная реализация.
    </p>
    <b-button type="is-danger" outlined @click="confirmDeleteAgent">
      Удалить агента…
    </b-button>
    <p class="tr-muted mt-2">
      Вызов идёт через <code>useModalStore().confirm()</code> —
      общий store-API оверлеев (Task A4.5), не собственный
      <code>ConfirmDialog</code>.
    </p>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Баннер и тост</h2>
    <div class="tr-stack">
      <b-message
        title="Индексация завершена"
        type="is-success"
        :closable="false"
      >
        Коллекция «База знаний» проиндексирована, доступно 128
        документов.
      </b-message>
      <b-button @click="showSavedToast">Показать тост</b-button>
    </div>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Загрузка поверх контента и скелет</h2>

    <div class="tr-grid tr-grid--2">
      <div>
        <p class="tr-muted mb-2">b-loading — оверлей поверх блока</p>
        <div class="tr-card tr-uikit-demo-frame tr-uikit-demo-frame--overlay">
          <b-loading v-model="isOverlayLoading" :is-full-page="false" />
          <div class="tr-uikit-demo-frame__body">
            <b-button
              size="is-small"
              @click="isOverlayLoading = !isOverlayLoading"
            >
              Переключить загрузку
            </b-button>
          </div>
        </div>
      </div>

      <div>
        <p class="tr-muted mb-2">b-skeleton — заглушка на время запроса</p>
        <b-skeleton width="80%" />
        <b-skeleton width="60%" />
        <b-skeleton width="90%" />
      </div>
    </div>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Боковая панель</h2>
    <b-button @click="modalStore.open('uikit-sidebar')">
      Открыть панель
    </b-button>
    <b-sidebar
      :model-value="modalStore.isOpen('uikit-sidebar')"
      type="is-light"
      right
      overlay
      @update:model-value="(value) => (value ? modalStore.open('uikit-sidebar') : modalStore.close('uikit-sidebar'))"
    >
      <div class="tr-uikit-demo-padded">
        <h3 class="tr-card__title">Свойства</h3>
        <p class="tr-muted">
          Демонстрация штатной боковой панели Buefy, открытой через
          общий <code>useModalStore()</code>.
        </p>
        <b-button class="mt-4" @click="modalStore.close('uikit-sidebar')">
          Закрыть
        </b-button>
      </div>
    </b-sidebar>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Модальное окно</h2>
    <p class="tr-muted mb-4">
      Штатный <code>b-modal</code>, открытый через тот же
      <code>useModalStore()</code>.
    </p>
    <b-button type="is-primary" @click="modalStore.open('uikit-create-agent')">
      Открыть модальное окно
    </b-button>

    <b-modal
      :model-value="modalStore.isOpen('uikit-create-agent')"
      has-modal-card
      trap-focus
      :destroy-on-hide="false"
      @update:model-value="(value) => (value ? modalStore.open('uikit-create-agent') : modalStore.close('uikit-create-agent'))"
    >
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Новый агент</p>
          <button
            class="delete"
            aria-label="Закрыть"
            @click="modalStore.close('uikit-create-agent')"
          />
        </header>

        <section class="modal-card-body">
          <b-field label="Название">
            <b-input v-model="newAgentName" />
          </b-field>
        </section>

        <footer class="modal-card-foot">
          <b-button @click="modalStore.close('uikit-create-agent')">
            Отмена
          </b-button>
          <b-button
            type="is-primary"
            @click="modalStore.close('uikit-create-agent')"
          >
            Создать
          </b-button>
        </footer>
      </div>
    </b-modal>
  </section>
</template>

<script setup>
import { ref } from "vue";

import { useModalStore } from "../../stores/modal";
import { useToasterStore } from "../../stores/toaster";
import { PageHeader } from "@iam3xtr/vue/navigation";

const modalStore = useModalStore();
const toaster = useToasterStore();

const isOverlayLoading = ref(false);
const newAgentName = ref("Консультант");

function confirmDeleteAgent() {
  modalStore.confirm({
    title: "Удалить агента",
    message: "Действие необратимо. Продолжить?",
    confirmText: "Удалить",
    cancelText: "Отмена",
    type: "is-danger",
    hasIcon: true,
    onConfirm: () => toaster.error("Агент удалён"),
  });
}

function showSavedToast() {
  toaster.success("Изменения сохранены");
}
</script>
