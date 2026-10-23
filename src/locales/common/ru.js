// Русский словарь общих cross-cutting элементов A10 (Task A10.9): диалог
// несохранённых изменений и сводка ошибок формы, которые переиспользуют все
// savable-формы в scope (`agents/AgentSettings.vue`, `knowledge/Settings.vue`,
// `profile/Settings.vue`, `WorkspaceSettings.vue` — см. комментарий в
// `common/DirtyExitModal.vue`). Ключи здесь — контракт: `en.js`/`es.js`
// обязаны нести ровно тот же набор путей, проверяется тестом полноты
// (`tests/unit/locales/common.test.js`), как и `locales/wizard/**` для A9.
export default {
  packageCopy: {
    loading: "Загрузка",
    close: "Закрыть",
    openFilters: "Открыть фильтры",
    filters: "Фильтры",
    previousTabs: "Предыдущие вкладки",
    nextTabs: "Следующие вкладки",
    copy: "Копировать",
    copied: "Скопировано!",
    dropFiles: "Отпустите файлы, чтобы загрузить",
    plan: "Тариф",
  },

  dirtyExit: {
    title: "Есть несохранённые изменения",
    body: "Изменения на этой форме не сохранены. Их можно сохранить сейчас, "
      + "выйти без сохранения или остаться и продолжить редактирование.",
    stay: "Остаться",
    discard: "Выйти без сохранения",
    save: "Сохранить",
  },
  formErrorSummary: {
    title: "Проверьте поля перед сохранением:",
  },
};
