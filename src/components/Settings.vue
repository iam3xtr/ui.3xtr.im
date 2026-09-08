<template>
  <section class="tr-settings">
    <header class="tr-settings__header">
      <div>
        <h1>Настройки пространства</h1>
        <p>Параметры интерфейса текущего браузера.</p>
      </div>
    </header>

    <div class="tr-settings__panel">
          <div class="tr-settings__panel-header">
            <h2>Элементы навигации</h2>
            <p>Настройте состав верхней панели. Изменения применяются сразу.</p>
          </div>

          <div class="tr-settings__option">
            <span class="tr-settings__option-copy">
              <strong>Поиск</strong>
              <small>Показывать глобальную строку поиска в navbar.</small>
            </span>
            <b-switch v-model="showSearch" aria-label="Показывать поиск" />
          </div>

          <div class="tr-settings__option">
            <span class="tr-settings__option-copy">
              <strong>Дополнительное меню</strong>
              <small>Показывать ссылки «Новости», «API» и «Документация».</small>
            </span>
            <b-switch
              v-model="showResourceMenu"
              aria-label="Показывать дополнительное меню"
            />
          </div>

          <div class="tr-settings__option">
            <span class="tr-settings__option-copy">
              <strong>Уведомления</strong>
              <small>Показывать колокольчик и доступ к событиям.</small>
            </span>
            <b-switch
              v-model="showNotifications"
              aria-label="Показывать уведомления"
            />
          </div>

          <footer class="tr-settings__panel-footer">
            <b-button @click="settings.reset()">
              Восстановить значения
            </b-button>
          </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useSiteSettingsStore } from "../stores/siteSettings";

const settings = useSiteSettingsStore();
const {
  showSearch,
  showResourceMenu,
  showNotifications,
} = storeToRefs(settings);
</script>
