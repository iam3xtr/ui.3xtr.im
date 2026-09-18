<template>
  <!--
    Таблицы (Task A8.6): b-table модификаторы и пагинация — часть прежней
    единой `/kit` (Task A5.3), разделённой на маршрутные подразделы.
  -->
  <PageHeader
    title="Таблицы"
    subtitle="Табличные модификаторы и постраничная навигация."
  />

  <section class="tr-card mb-5">
    <div class="tr-row tr-row--between mb-4">
      <h2 class="tr-card__title mb-0">Таблица</h2>
      <b-button type="is-primary" icon-left="plus">
        Добавить
      </b-button>
    </div>

    <b-table
      :data="agents"
      hoverable
      mobile-cards
      paginated
      :per-page="5"
      pagination-size="is-small"
    >
      <b-table-column field="name" label="Название" v-slot="{ row }">
        <strong>{{ row.name }}</strong>
      </b-table-column>

      <b-table-column field="status" label="Статус" v-slot="{ row }">
        <b-tag :type="row.status === 'Активен' ? 'is-primary' : undefined">
          {{ row.status }}
        </b-tag>
      </b-table-column>

      <b-table-column field="owner" label="Владелец" v-slot="{ row }">
        {{ row.owner }}
      </b-table-column>

      <b-table-column field="updated" label="Обновлено" v-slot="{ row }">
        {{ row.updated }}
      </b-table-column>

      <b-table-column v-slot="{ row }" width="80">
        <b-dropdown
          position="is-bottom-left"
          aria-role="list"
          append-to-body
        >
          <template #trigger>
            <b-button
              icon-left="dots-vertical"
              size="is-small"
              aria-label="Действия"
            />
          </template>
          <b-dropdown-item aria-role="listitem" @click="openEditDrawer(row)">
            Редактировать {{ row.name }}
          </b-dropdown-item>
          <b-dropdown-item aria-role="listitem">
            Дублировать
          </b-dropdown-item>
        </b-dropdown>
      </b-table-column>
    </b-table>

    <p class="tr-muted mt-4 mb-2">
      Модификатор <code>--compact</code> — плотные списки без
      построчных действий.
    </p>
    <b-table :data="limitsBreakdown" class="tr-table--compact" hoverable mobile-cards>
      <b-table-column field="label" label="Лимит" v-slot="{ row }">
        {{ row.label }}
      </b-table-column>
      <b-table-column field="caption" label="Использовано" v-slot="{ row }">
        {{ row.caption }}
      </b-table-column>
    </b-table>

    <p class="tr-muted mt-4 mb-2">
      Модификатор <code>--breakdown</code> — сводка «строка: значение»
      без шапки, например разбивка стоимости.
    </p>
    <b-table :data="costBreakdown" class="tr-table--breakdown" mobile-cards>
      <b-table-column field="label" label="Статья" v-slot="{ row }">
        {{ row.label }}
      </b-table-column>
      <b-table-column field="value" label="Сумма" v-slot="{ row }">
        {{ row.value }}
      </b-table-column>
    </b-table>
  </section>

  <section class="tr-card mb-5">
    <div class="tr-row tr-row--between mb-4">
      <h2 class="tr-card__title mb-0">Пагинация</h2>
      <span class="tr-muted">Страница {{ paginationPage }} из 5</span>
    </div>
    <b-pagination
      v-model="paginationPage"
      :total="50"
      :per-page="10"
      order="is-centered"
    />
  </section>

  <!--
    Редактирование в контексте страницы (Handoff.2, .todo строки 761-828):
    `FormDrawer` открывается построчным действием таблицы выше — не отдельной
    кнопкой-витриной, как раньше в `DialogsOverlays.vue`. Realistic fields,
    required-валидация, pending submit и dirty-exit boundary воспроизводят
    контракт `FormDrawer`/`useDirtyExitGuard`-стиля тем же способом, что
    реальные экраны (`profile/Settings.vue`, `WorkspaceSettings.vue`) — без
    сетевого API, только fixture-мутация локального массива `agents`.
  -->
  <FormDrawer
    :model-value="isEditDrawerOpen"
    title="Редактирование агента"
    :busy="isSaving"
    :disabled="!!nameError"
    @update:model-value="handleDrawerVisibilityChange"
    @submit="submitEditDrawer"
  >
    <div class="tr-stack">
      <b-field
        label="Название агента"
        :type="nameError ? 'is-danger' : undefined"
        :message="nameError"
      >
        <b-input v-model="editFields.name" maxlength="64" />
      </b-field>

      <b-field label="Статус">
        <b-select v-model="editFields.status" expanded>
          <option value="Активен">Активен</option>
          <option value="Черновик">Черновик</option>
          <option value="Отключён">Отключён</option>
        </b-select>
      </b-field>

      <b-field label="Владелец">
        <b-input v-model="editFields.owner" />
      </b-field>

      <b-field label="Системная инструкция">
        <b-input
          v-model="editFields.instructions"
          type="textarea"
          rows="16"
          placeholder="Опишите роль, тон ответа и границы компетенции агента"
        />
      </b-field>

      <b-field label="Внутренняя заметка">
        <b-input v-model="editFields.note" type="textarea" rows="6" />
      </b-field>
    </div>

    <template #footer="{ busy, disabled }">
      <b-button class="mr-2" :disabled="busy" @click="requestCloseEditDrawer">
        Отмена
      </b-button>
      <b-button
        type="is-primary"
        native-type="submit"
        :loading="busy"
        :disabled="disabled"
      >
        Сохранить
      </b-button>
    </template>
  </FormDrawer>

  <DirtyExitModal
    :active="isDirtyExitModalActive"
    @save="confirmDirtyExitSave"
    @discard="confirmDirtyExitDiscard"
    @stay="stayInEditDrawer"
  />
</template>

<script setup>
import { computed, onUnmounted, reactive, ref } from "vue";

import { PageHeader } from "@iam3xtr/vue/navigation";
import { FormDrawer } from "@iam3xtr/vue";
import DirtyExitModal from "../common/DirtyExitModal.vue";
import { useToasterStore } from "../../stores/toaster";

const paginationPage = ref(1);
const toaster = useToasterStore();

const agents = reactive([
  {
    name: "Консультант",
    status: "Активен",
    owner: "Иван Петров",
    updated: "2 часа назад",
    instructions:
      "Консультирует клиентов по тарифам и настройке рабочего пространства. " +
      "Тон — деловой и краткий, без эмодзи. При вопросах вне компетенции " +
      "предлагает передать диалог оператору.",
    note: "",
  },
  {
    name: "Sales Assistant",
    status: "Черновик",
    owner: "Анна Смирнова",
    updated: "Вчера",
    instructions: "Черновик сценария продаж — не публиковать без ревью.",
    note: "Ожидает согласования формулировок с маркетингом.",
  },
]);

// Edit-in-context FormDrawer (Handoff.2, требование "FormDrawer открывается
// действием строки/страницы"): один открытый экземпляр на страницу,
// переиспользуемый для любой строки — `editingRow` хранит ссылку на
// оригинал, `editFields`/`editSnapshot` — рабочую и исходную копию для
// dirty-diff. `isDirtyExitModalActive` управляет тем же `DirtyExitModal`,
// который используют реальные formы (`profile/Settings.vue`).
const isEditDrawerOpen = ref(false);
const isSaving = ref(false);
const isDirtyExitModalActive = ref(false);
let editingRow = null;

const editFields = reactive({
  name: "",
  status: "Активен",
  owner: "",
  instructions: "",
  note: "",
});
let editSnapshot = null;

const nameError = computed(() =>
  editFields.name.trim() === "" ? "Название не может быть пустым" : null,
);

const isEditDirty = computed(
  () => editSnapshot != null && JSON.stringify(editFields) !== editSnapshot,
);

function openEditDrawer(row) {
  editingRow = row;
  Object.assign(editFields, {
    name: row.name,
    status: row.status,
    owner: row.owner,
    instructions: row.instructions ?? "",
    note: row.note ?? "",
  });
  editSnapshot = JSON.stringify(editFields);
  isEditDrawerOpen.value = true;
}

function closeEditDrawer() {
  isEditDrawerOpen.value = false;
  editingRow = null;
  editSnapshot = null;
}

// `b-sidebar`/`FormDrawer` reports every close attempt (header button,
// Escape, outside click) through `update:model-value`; a dirty draft must
// intercept it instead of letting `v-model` close the drawer directly — the
// same three-way boundary («Сохранить / Выйти без сохранения / Остаться»)
// as `useDirtyExitGuard`, but scoped to this drawer's own open state instead
// of route navigation.
function handleDrawerVisibilityChange(value) {
  if (value) {
    isEditDrawerOpen.value = true;
    return;
  }
  requestCloseEditDrawer();
}

function requestCloseEditDrawer() {
  if (isEditDirty.value) {
    isDirtyExitModalActive.value = true;
    return;
  }
  closeEditDrawer();
}

function stayInEditDrawer() {
  isDirtyExitModalActive.value = false;
}

function confirmDirtyExitDiscard() {
  isDirtyExitModalActive.value = false;
  closeEditDrawer();
}

function confirmDirtyExitSave() {
  isDirtyExitModalActive.value = false;
  submitEditDrawer();
}

let saveTimerId = null;

function submitEditDrawer() {
  if (nameError.value || isSaving.value) {
    return;
  }

  isSaving.value = true;
  saveTimerId = setTimeout(() => {
    saveTimerId = null;
    if (editingRow) {
      Object.assign(editingRow, {
        name: editFields.name,
        status: editFields.status,
        owner: editFields.owner,
        instructions: editFields.instructions,
        note: editFields.note,
        updated: "только что",
      });
    }
    isSaving.value = false;
    toaster.success("Изменения агента сохранены");
    closeEditDrawer();
  }, 500);
}

onUnmounted(() => {
  if (saveTimerId) clearTimeout(saveTimerId);
});

const limitsBreakdown = [
  { label: "Месячный бюджет", caption: "38%" },
  { label: "Хранилище знаний", caption: "51%" },
  { label: "API-запросы", caption: "67 240 из 100 000" },
];

const costBreakdown = [
  { label: "Подписка Superior", value: "$33,00" },
  { label: "Дополнительные кредиты", value: "$8,40" },
  { label: "Итого", value: "$41,40" },
];
</script>
