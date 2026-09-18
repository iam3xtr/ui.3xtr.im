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
    <p class="tr-muted mb-4">
      Прямой <code>b-sidebar</code> — для неформовых панелей (свойства,
      details), а не для редактирования. Форма в правой панели — раздел
      «Форма в правой панели» ниже.
    </p>
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
    <h2 class="tr-card__title">Форма в правой панели</h2>
    <p class="tr-muted mb-4">
      <code>FormDrawer</code> из <code>@iam3xtr/vue</code> — эталон для
      редактирования в правой панели: длинный form body, фиксированные
      footer-действия и busy submit. Presentation-only — поля и сохранение
      здесь fixture state, не API. Короткая форма без длинного body — обычно
      <code>b-modal</code> (раздел «Модальное окно» ниже); подтверждение
      действия — <code>b-dialog</code> (раздел «Диалог подтверждения» выше).
    </p>
    <b-button type="is-primary" @click="isFormDrawerOpen = true">
      Открыть форму в панели
    </b-button>

    <FormDrawer
      v-model="isFormDrawerOpen"
      title="Правило уведомления"
      :busy="isFormDrawerBusy"
      @submit="handleFormDrawerSubmit"
    >
      <div class="tr-stack">
        <b-field label="Название правила">
          <b-input v-model="formDrawerFields.name" />
        </b-field>
        <b-field label="Канал">
          <b-select v-model="formDrawerFields.channel" expanded>
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
            <option value="webhook">Webhook</option>
          </b-select>
        </b-field>
        <b-field label="Условие срабатывания">
          <b-input v-model="formDrawerFields.condition" />
        </b-field>
        <b-field label="Описание">
          <b-input
            v-model="formDrawerFields.description"
            type="textarea"
            rows="12"
          />
        </b-field>
      </div>

      <template #footer="{ busy, disabled }">
        <b-button class="mr-2" :disabled="busy || disabled" @click="isFormDrawerOpen = false">
          Отмена
        </b-button>
        <b-button
          type="is-primary"
          native-type="submit"
          :loading="busy"
          :disabled="disabled || busy"
        >
          Сохранить
        </b-button>
      </template>
    </FormDrawer>
  </section>

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Модальное окно</h2>
    <p class="tr-muted mb-4">
      Штатный <code>b-modal</code>, открытый через тот же
      <code>useModalStore()</code> — короткая форма без длинного body и без
      фиксированного footer, в отличие от <code>FormDrawer</code> выше.
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
import { onUnmounted, ref } from "vue";

import { useModalStore } from "../../stores/modal";
import { useToasterStore } from "../../stores/toaster";
import { PageHeader } from "@iam3xtr/vue/navigation";
import { FormDrawer } from "@iam3xtr/vue";

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

// FormDrawer showcase (Issue #4.3): presentation-only fixture state — no
// store/API. `handleFormDrawerSubmit` simulates a save the same way other
// kit demo forms do (see `kit/Forms.vue`), so the busy state is real enough
// to demonstrate the footer's `:loading`/`:disabled` binding.
const isFormDrawerOpen = ref(false);
const isFormDrawerBusy = ref(false);
const formDrawerFields = ref({
  name: "Молчание в нерабочие часы",
  channel: "telegram",
  condition: "severity >= warning",
  description:
    "Правило подавляет повторные уведомления по одному инциденту, пока " +
    "статус не изменится. Действует для всех агентов рабочего пространства " +
    "и учитывает локальное время получателя канала.",
});
let formDrawerTimerId = null;

function handleFormDrawerSubmit() {
  isFormDrawerBusy.value = true;
  formDrawerTimerId = setTimeout(() => {
    isFormDrawerBusy.value = false;
    isFormDrawerOpen.value = false;
    toaster.success("Правило сохранено");
  }, 600);
}

onUnmounted(() => {
  if (formDrawerTimerId) clearTimeout(formDrawerTimerId);
});
</script>
