<template>
  <section class="tr-help">
    <PageHeader
      title="Помощь"
      subtitle="Термины кабинета и типовые сценарии — доступно в любой момент из меню профиля."
    />

    <div class="tr-card mb-5">
      <h2 class="tr-card__title">Термины</h2>
      <dl class="tr-help__glossary">
        <div v-for="term in glossary" :key="term.title" class="tr-help__glossary-item">
          <dt>{{ term.title }}</dt>
          <dd>{{ term.description }}</dd>
        </div>
      </dl>
    </div>

    <div class="tr-card">
      <h2 class="tr-card__title">Частые задачи</h2>
      <ul class="tr-help__scenarios">
        <li v-for="scenario in scenarios" :key="scenario.title" class="tr-help__scenario">
          <b-icon :icon="scenario.icon" size="is-small" />
          <div>
            <strong>{{ scenario.title }}</strong>
            <p class="tr-muted">{{ scenario.description }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { PageHeader } from "@iam3xtr/vue/navigation";

// Route-backed «Помощь» (Task A10.8, `.plan` item 7: "Контекстная помощь
// доступна из постоянного пункта меню профиля/помощи и соответствующего
// экрана после закрытия первого показа"). This is that permanent screen —
// a static reference (no fixture/store, nothing to load/error/empty), always
// reachable from the profile menu regardless of any one-off first-visit tip
// elsewhere in the kit. Content stays in plain Russian per "профессиональную
// лексику массово не заменять" — примеры объясняют термины and actions,
// they do not rename `Агент`/`Песочница`/`Знания`/`Пространство`.
const glossary = [
  {
    title: "Агент",
    description: "Настроенный ассистент с собственными инструкциями, "
      + "знаниями и каналами связи. Отвечает от имени пространства.",
  },
  {
    title: "Песочница",
    description: "Внутренний диалог с агентом для проверки ответов до "
      + "того, как их увидят реальные пользователи каналов.",
  },
  {
    title: "Знания",
    description: "Файлы, ссылки и тексты, на основе которых агент отвечает. "
      + "Собраны в коллекции; один материал может использоваться "
      + "несколькими агентами.",
  },
  {
    title: "Пространство",
    description: "Общий контекст команды: агенты, знания, каналы, тариф и "
      + "участники. У пользователя может быть несколько пространств.",
  },
];

const scenarios = [
  {
    icon: "book-edit-outline",
    title: "Агент отвечает неправильно",
    description: "Откройте карточку агента → «Знания» и обновите или "
      + "добавьте материал, затем проверьте ответ в «Песочнице».",
  },
  {
    icon: "connection",
    title: "Канал перестал отвечать",
    description: "В настройках агента откройте вкладку «Каналы» — там "
      + "видно, какой канал недоступен, и причина.",
  },
  {
    icon: "hand-front-right-outline",
    title: "Нужно вмешаться в диалог",
    description: "В «Диалогах» откройте нужный диалог и нажмите "
      + "«Взять диалог» — после этого сообщения отправляются от вашего "
      + "имени, пока вы не вернёте диалог агенту.",
  },
  {
    icon: "gauge",
    title: "Похоже, пространство упирается в лимит",
    description: "На вкладке «Пространство → Тариф» видно, какой именно "
      + "ресурс близок к пределу и что делать — сменить тариф или "
      + "освободить место.",
  },
  {
    icon: "bell-check-outline",
    title: "Не могу найти прочитанное уведомление",
    description: "Оно не удаляется при прочтении — откройте "
      + "«История уведомлений» в меню профиля и переключитесь на «Все».",
  },
  {
    icon: "robot-outline",
    title: "Нужен ещё один агент",
    description: "Кнопка «Создать агента» доступна на любом экране "
      + "кабинета и ведёт в тот же мастер, что и при первом агенте.",
  },
];
</script>
