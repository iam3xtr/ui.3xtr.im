<template>
  <!--
    Формы (Task A8.6): поля формы и загрузка файлов — часть прежней единой
    `/kit` (Task A5.3), разделённой на маршрутные подразделы.
  -->
  <PageHeader
    title="Формы"
    subtitle="Поля ввода, валидация и загрузка файлов."
  />

  <section class="tr-card mb-5">
    <h2 class="tr-card__title">Поля формы</h2>

    <div class="tr-grid tr-grid--2">
      <div>
        <b-field
          label="Название агента"
          message="До 64 символов"
        >
          <b-input
            v-model="form.name"
            maxlength="64"
            placeholder="Например, Консультант"
          />
        </b-field>

        <b-field label="Описание">
          <b-input
            v-model="form.description"
            type="textarea"
            placeholder="Кратко опишите назначение"
          />
        </b-field>
      </div>

      <div>
        <b-field label="Модель">
          <b-select v-model="form.model" expanded>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </b-select>
        </b-field>

        <b-field
          label="API endpoint"
          type="is-danger"
          message="Укажите корректный HTTPS URL"
        >
          <b-input
            v-model="form.endpoint"
            type="url"
            icon="link"
          />
        </b-field>

        <b-checkbox v-model="form.active">
          Активировать после сохранения
        </b-checkbox>
      </div>
    </div>
  </section>

  <section class="tr-card mb-5">
    <div class="tr-row tr-row--between mb-4">
      <h2 class="tr-card__title mb-0">Загрузка файлов</h2>
      <b-button size="is-small" @click="resetUploadDemo">
        Повторить демо
      </b-button>
    </div>

    <b-upload v-model="uploadPickedFile" drag-drop expanded>
      <div class="has-text-centered tr-uikit-demo-padded">
        <p><b-icon icon="upload" size="is-medium" /></p>
        <p>
          Перетащите файл сюда или нажмите для выбора — он встанет в
          очередь ниже
        </p>
      </div>
    </b-upload>

    <div class="tr-stack mt-4">
      <div v-for="item in uploadQueue" :key="item.id">
        <div class="tr-row tr-row--between mb-2">
          <span>
            {{ item.name }}
            <span class="tr-muted">({{ item.size }})</span>
          </span>
          <span class="tr-muted">{{ uploadStatusLabel(item.status) }}</span>
        </div>
        <b-progress
          v-if="item.status === 'queued' || item.status === 'uploading'"
          :value="item.progress"
          size="is-small"
          show-value
        />
        <b-message
          v-else-if="item.status === 'success'"
          type="is-success"
          :closable="false"
        >
          Файл «{{ item.name }}» загружен успешно.
        </b-message>
        <b-message v-else type="is-danger" :closable="false">
          Не удалось загрузить «{{ item.name }}»: {{ item.errorReason }}.
        </b-message>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onUnmounted, reactive, ref, watch } from "vue";

import PageHeader from "../common/PageHeader.vue";

const form = reactive({
  name: "Консультант",
  description: "",
  model: "gpt-4o",
  endpoint: "http://example.test",
  active: true,
});

// Демо-поток b-upload: локальная fixture-state machine без сети и без
// собственного компонента загрузки — очередь, прогресс, успех и ошибка
// воспроизводятся таймерами поверх статичных данных. См. Task A4.6.
const UPLOAD_STATUS_LABELS = {
  queued: "В очереди",
  uploading: "Загрузка",
  success: "Готово",
  error: "Ошибка",
};
const DEFAULT_UPLOAD_ERROR_REASON = "сервис вернул ошибку при обработке файла";
const UPLOAD_DEMO_FIXTURES = [
  { name: "brand-guidelines.pdf", size: "2.4 МБ", outcome: "success" },
  {
    name: "corrupted-archive.zip",
    size: "1.1 МБ",
    outcome: "error",
    errorReason: "архив повреждён и не может быть распакован",
  },
];

const uploadPickedFile = ref(null);
const uploadQueue = ref([]);
let uploadQueueNextId = 0;

function uploadStatusLabel(status) {
  return UPLOAD_STATUS_LABELS[status] || status;
}

function formatUploadFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex > 0 && value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function runUploadDemoStep(item) {
  // Задержка перед стартом загрузки нужна, чтобы стадия "queued" была
  // реально видна на экране, а не перезаписывалась в "uploading" в тот же
  // тик рендера (Task A4.6 review finding). Id таймера складывается на сам
  // item, чтобы resetUploadDemo/размонтирование могли его отменить и не
  // мутировать уже отсоединённый объект.
  item.timerId = setTimeout(() => {
    item.status = "uploading";
    const tick = () => {
      item.progress = Math.min(100, item.progress + 25);
      if (item.progress < 100) {
        item.timerId = setTimeout(tick, 400);
        return;
      }
      item.status = item.outcome;
    };
    item.timerId = setTimeout(tick, 400);
  }, 500);
}

function clearUploadTimers(items) {
  items.forEach((item) => clearTimeout(item.timerId));
}

function enqueueUpload(name, size, outcome, errorReason) {
  const item = reactive({
    id: ++uploadQueueNextId,
    name,
    size,
    outcome,
    errorReason: outcome === "error" ? errorReason || DEFAULT_UPLOAD_ERROR_REASON : null,
    status: "queued",
    progress: 0,
  });
  uploadQueue.value.push(item);
  runUploadDemoStep(item);
}

function resetUploadDemo() {
  clearUploadTimers(uploadQueue.value);
  uploadQueue.value = [];
  UPLOAD_DEMO_FIXTURES.forEach((fixture) =>
    enqueueUpload(fixture.name, fixture.size, fixture.outcome, fixture.errorReason),
  );
}

watch(uploadPickedFile, (file) => {
  if (!file) return;
  const outcome = uploadQueue.value.length % 2 === 0 ? "success" : "error";
  enqueueUpload(file.name, formatUploadFileSize(file.size), outcome);
  uploadPickedFile.value = null;
});

resetUploadDemo();
onUnmounted(() => clearUploadTimers(uploadQueue.value));
</script>
