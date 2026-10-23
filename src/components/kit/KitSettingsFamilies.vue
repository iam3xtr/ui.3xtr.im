<template>
  <!--
    Settings families on the shared anatomy (Task S2-07, Issue #22): Workspace,
    Profile, Security, Agent, Channel, Knowledge, Model, Provider, Tariff,
    User and AdminWorkspace each render as an independent savable panel. The
    inventory (`FAMILIES`) records whether a family maps to an existing demo
    screen or is a bounded kit-only reference; nothing here invents a
    production admin feature or API. Save is fixture-only.
  -->
  <section class="tr-card mb-5" data-testid="settings-families">
    <h2 class="tr-card__title">Settings families</h2>
    <p class="tr-muted mb-4">
      Одна anatomy для всех семейств настроек. Каждое семейство сохраняется
      независимой транзакцией; смена записи сбрасывает черновик.
    </p>

    <div class="tr-stack mb-4">
      <b-field label="Сценарий сохранения">
        <b-radio-button
          v-for="item in SCENARIOS"
          :key="item"
          v-model="scenario"
          :native-value="item"
          size="is-small"
        >
          {{ item }}
        </b-radio-button>
      </b-field>
      <b-field label="Запись">
        <b-radio-button
          v-for="item in ENTITIES"
          :key="item"
          v-model="entityKey"
          :native-value="item"
          size="is-small"
        >
          {{ item }}
        </b-radio-button>
      </b-field>
      <b-field label="Язык подписей">
        <b-radio-button
          v-for="code in LANGS"
          :key="code"
          v-model="lang"
          :native-value="code"
          size="is-small"
        >
          {{ code }}
        </b-radio-button>
      </b-field>
    </div>

    <p class="tr-muted mb-3" data-testid="families-status">Сохранений: {{ saveCount }}</p>

    <div class="tr-stack">
      <FamilyPanel
        v-for="family in FAMILIES"
        :key="family.id"
        :family="family"
        :copy="copy"
        :records="records[family.id]"
        :entity-key="entityKey"
        :scenario="scenario"
        @saved="saveCount += 1"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from "vue";

import FamilyPanel from "./KitSettingsFamilyPanel.vue";

const SCENARIOS = ["ok", "error", "conflict", "unknown"];
const ENTITIES = ["a", "b"];
const LANGS = ["ru", "en", "es"];

// disposition: "screen" — an existing demo route; "reference" — bounded kit
// reference without a local route (not a production admin feature).
const f = (key, extra = {}) => ({ key, ...extra });
const FAMILIES = [
  { id: "workspace", disposition: "screen", fields: [f("id", { readonly: true }), f("name", { required: true })], danger: true },
  { id: "profile", disposition: "screen", fields: [f("name", { required: true }), f("email", { required: true }), f("locale")] },
  { id: "security", disposition: "screen", fields: [f("password", { secret: true, required: true })], danger: true },
  { id: "agent", disposition: "screen", fields: [f("name", { required: true }), f("description", { multiline: true }), f("model")], danger: true },
  { id: "channel", disposition: "screen", fields: [f("name", { required: true }), f("token", { secret: true }), f("welcome", { multiline: true })] },
  { id: "knowledge", disposition: "screen", fields: [f("name", { required: true }), f("description", { multiline: true })] },
  { id: "model", disposition: "screen", fields: [f("name", { required: true }), f("limit")] },
  { id: "provider", disposition: "screen", fields: [f("name", { required: true }), f("url", { required: true })] },
  { id: "tariff", disposition: "screen", fields: [f("name", { required: true }), f("limit")], canEdit: false },
  { id: "user", disposition: "reference", fields: [f("name", { required: true }), f("email", { required: true }), f("role")], canEdit: false },
  { id: "adminWorkspace", disposition: "reference", fields: [f("id", { readonly: true }), f("name", { required: true }), f("owner")] },
];

const LONG = "VeryLongUnbrokenValueWithoutAnySpaces".repeat(3);

function makeRecords() {
  const base = {
    workspace: { id: "workspace-7f3a", name: "Main workspace" },
    profile: { name: "Ann Lee", email: "ann@example.test", locale: "ru" },
    security: { password: "secret-demo" },
    agent: { name: "Consultant", description: "Answers customer questions.", model: "demo-model" },
    channel: { name: "Support bot", token: "demo-token", welcome: "Hello!" },
    knowledge: { name: "Product docs", description: "Public documentation." },
    model: { name: "demo-model", limit: "1000" },
    provider: { name: "Demo provider", url: "https://provider.example.test" },
    tariff: { name: "Team", limit: "50000" },
    user: { name: "Bob Ray", email: "bob@example.test", role: "operator" },
    adminWorkspace: { id: "workspace-9c1e", name: "Customer workspace", owner: "bob@example.test" },
  };
  const result = {};
  for (const [id, record] of Object.entries(base)) {
    const long = { ...record };
    for (const key of Object.keys(long)) {
      if (key !== "id" && key !== "password") long[key] = `${long[key]} B ${LONG}`;
    }
    result[id] = { a: { ...record }, b: long };
  }
  return result;
}

const records = reactive(makeRecords());
const scenario = ref("ok");
const entityKey = ref("a");
const lang = ref("ru");
const saveCount = ref(0);

const COPY = {
  ru: {
    edit: "Изменить", save: "Сохранить", cancel: "Отмена", close: "Закрыть",
    openDrawer: "В панели", required: "Заполните поле", unsaved: "Есть несохранённые изменения.",
    denied: "Нет прав на изменение. Только чтение.", saveError: "Не удалось сохранить. Данные не изменены.",
    conflict: "Значение изменено в другом месте.", reload: "Перечитать", keepMine: "Оставить мой вариант",
    retry: "Повторить", unknown: "Результат неизвестен.", verify: "Сверить состояние",
    dangerTitle: "Необратимое действие", dangerText: "Действие нельзя отменить.",
    dangerAction: "Удалить", dangerConfirm: "Требуется подтверждение (демо).",
    disposition: { screen: "Есть экран демо.", reference: "Только kit-референс." },
    families: { workspace: "Пространство", profile: "Профиль", security: "Безопасность", agent: "Агент", channel: "Канал", knowledge: "Знания", model: "Модель", provider: "Провайдер", tariff: "Тариф", user: "Пользователь", adminWorkspace: "Пространство (админ)" },
    fields: { id: "Идентификатор", name: "Название", email: "Email", locale: "Язык", password: "Пароль", description: "Описание", model: "Модель", token: "Токен", welcome: "Приветствие", limit: "Лимит", url: "URL", role: "Роль", owner: "Владелец" },
  },
  en: {
    edit: "Edit", save: "Save", cancel: "Cancel", close: "Close",
    openDrawer: "In drawer", required: "Fill in this field", unsaved: "Unsaved changes.",
    denied: "You cannot change this. Read only.", saveError: "Could not save. Nothing was changed.",
    conflict: "The value was changed elsewhere.", reload: "Reload", keepMine: "Keep my version",
    retry: "Retry", unknown: "The result is unknown.", verify: "Check state",
    dangerTitle: "Irreversible action", dangerText: "This cannot be undone.",
    dangerAction: "Delete", dangerConfirm: "Confirmation required (demo).",
    disposition: { screen: "Has a demo screen.", reference: "Kit reference only." },
    families: { workspace: "Workspace", profile: "Profile", security: "Security", agent: "Agent", channel: "Channel", knowledge: "Knowledge", model: "Model", provider: "Provider", tariff: "Tariff", user: "User", adminWorkspace: "Workspace (admin)" },
    fields: { id: "Identifier", name: "Name", email: "Email", locale: "Language", password: "Password", description: "Description", model: "Model", token: "Token", welcome: "Welcome", limit: "Limit", url: "URL", role: "Role", owner: "Owner" },
  },
  es: {
    edit: "Editar", save: "Guardar", cancel: "Cancelar", close: "Cerrar",
    openDrawer: "En panel", required: "Rellena este campo", unsaved: "Cambios sin guardar.",
    denied: "No puedes cambiar esto. Solo lectura.", saveError: "No se pudo guardar. No se cambió nada.",
    conflict: "El valor se cambió en otro lugar.", reload: "Recargar", keepMine: "Mantener mi versión",
    retry: "Reintentar", unknown: "Resultado desconocido.", verify: "Comprobar estado",
    dangerTitle: "Acción irreversible", dangerText: "No se puede deshacer.",
    dangerAction: "Eliminar", dangerConfirm: "Se requiere confirmación (demo).",
    disposition: { screen: "Tiene pantalla de demo.", reference: "Solo referencia del kit." },
    families: { workspace: "Espacio", profile: "Perfil", security: "Seguridad", agent: "Agente", channel: "Canal", knowledge: "Conocimiento", model: "Modelo", provider: "Proveedor", tariff: "Tarifa", user: "Usuario", adminWorkspace: "Espacio (admin)" },
    fields: { id: "Identificador", name: "Nombre", email: "Email", locale: "Idioma", password: "Contraseña", description: "Descripción", model: "Modelo", token: "Token", welcome: "Bienvenida", limit: "Límite", url: "URL", role: "Rol", owner: "Propietario" },
  },
};
const copy = computed(() => COPY[lang.value]);
</script>
