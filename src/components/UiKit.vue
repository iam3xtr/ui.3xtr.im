<template>
  <!-- Интерактивная витрина компонентов и состояний UI-kit. -->
          <div class="tr-page-header">
            <div>
              <h1 class="tr-page-title">Trickster UI Kit</h1>
              <p class="tr-page-subtitle">
                Основные Buefy-компоненты и состояния.
              </p>
            </div>

            <div class="buttons">
              <b-button>Отмена</b-button>
              <b-button type="is-primary">Сохранить</b-button>
            </div>
          </div>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Кнопки</h2>
            <div class="buttons">
              <b-button type="is-primary">Основная</b-button>
              <b-button type="is-primary" outlined>Outlined</b-button>
              <b-button type="is-primary" light>Light</b-button>
              <b-button type="is-success">Успех</b-button>
              <b-button type="is-warning">Предупреждение</b-button>
              <b-button type="is-danger">Удалить</b-button>
              <b-button disabled>Недоступна</b-button>
            </div>
          </section>

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

          <section class="tr-grid tr-grid--2 mb-5">
            <article class="tr-card">
              <h2 class="tr-card__title">Теги</h2>
              <b-taglist>
                <b-tag type="is-primary">Активен</b-tag>
                <b-tag>Черновик</b-tag>
                <b-tag type="is-success">Проиндексировано</b-tag>
                <b-tag type="is-warning">Ожидает</b-tag>
                <b-tag type="is-danger">Ошибка</b-tag>
              </b-taglist>
            </article>

            <article class="tr-card">
              <h2 class="tr-card__title">Уведомления</h2>
              <b-notification type="is-primary" :closable="false">
                Конфигурация агента сохранена.
              </b-notification>
              <b-notification type="is-warning" :closable="false">
                Лимит хранилища использован на 82%.
              </b-notification>
            </article>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Лимиты</h2>

            <div class="tr-stack">
              <div>
                <div class="tr-row tr-row--between">
                  <span>Месячный бюджет</span>
                  <span class="tr-muted">38%</span>
                </div>
                <b-progress :value="38" type="is-primary" />
              </div>

              <div>
                <div class="tr-row tr-row--between">
                  <span>Хранилище знаний</span>
                  <span class="tr-muted">51%</span>
                </div>
                <b-progress :value="51" type="is-primary" />
              </div>
            </div>
          </section>

          <section class="tr-card mb-5">
            <h2 class="tr-card__title">Вкладки</h2>

            <b-tabs v-model="activeTab" type="is-boxed">
              <b-tab-item label="Обзор">
                Содержимое обзора.
              </b-tab-item>
              <b-tab-item label="Настройки">
                Содержимое настроек.
              </b-tab-item>
              <b-tab-item label="Каналы">
                Подключённые каналы.
              </b-tab-item>
              <b-tab-item label="Тест-сессии">
                История тестовых запусков.
              </b-tab-item>
            </b-tabs>
          </section>

          <section class="tr-card mb-5">
            <div class="tr-row tr-row--between mb-4">
              <h2 class="tr-card__title mb-0">Таблица</h2>
              <b-button type="is-primary" icon-left="plus">
                Добавить
              </b-button>
            </div>

            <b-table
              :data="agents"
              striped
              hoverable
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
                <b-dropdown position="is-bottom-left" aria-role="list">
                  <template #trigger>
                    <b-button
                      icon-left="dots-vertical"
                      size="is-small"
                      aria-label="Действия"
                    />
                  </template>
                  <b-dropdown-item aria-role="listitem">
                    Редактировать {{ row.name }}
                  </b-dropdown-item>
                  <b-dropdown-item aria-role="listitem">
                    Дублировать
                  </b-dropdown-item>
                </b-dropdown>
              </b-table-column>
            </b-table>
          </section>

          <section class="tr-card has-text-centered">
            <div class="tr-icon-tile" style="margin: 0 auto 12px">◇</div>
            <h2 class="tr-card__title">Здесь пока пусто</h2>
            <p class="tr-muted">
              Создайте первый объект, чтобы он появился в списке.
            </p>
            <b-button
              class="mt-4"
              type="is-primary"
              @click="isModalOpen = true"
            >
              Создать
            </b-button>
          </section>

          <b-modal
            v-model="isModalOpen"
            has-modal-card
            trap-focus
            :destroy-on-hide="false"
          >
            <div class="modal-card" style="width: min(520px, 92vw)">
              <header class="modal-card-head">
                <p class="modal-card-title">Новый агент</p>
                <button
                  class="delete"
                  aria-label="Закрыть"
                  @click="isModalOpen = false"
                />
              </header>

              <section class="modal-card-body">
                <b-field label="Название">
                  <b-input v-model="form.name" />
                </b-field>
              </section>

              <footer class="modal-card-foot">
                <b-button @click="isModalOpen = false">Отмена</b-button>
                <b-button type="is-primary" @click="isModalOpen = false">
                  Создать
                </b-button>
              </footer>
            </div>
          </b-modal>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";

const activeTab = ref(0);
const isModalOpen = ref(false);

const form = reactive({
  name: "Консультант",
  description: "",
  model: "gpt-4o",
  endpoint: "http://example.test",
  active: true,
});

const agents = [
  {
    name: "Консультант",
    status: "Активен",
    owner: "Иван Петров",
    updated: "2 часа назад",
  },
  {
    name: "Sales Assistant",
    status: "Черновик",
    owner: "Анна Смирнова",
    updated: "Вчера",
  },
];
</script>
