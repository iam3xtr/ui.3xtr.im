import { createApp } from "vue";
import Buefy from "buefy";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import Icon from "./components/common/Icon.vue";

// Импортируем собственную сборку Bulma + Buefy.
// Не подключайте одновременно buefy/dist/css/buefy.css.
import "./styles/trickster-buefy.scss";
import "@mdi/font/css/materialdesignicons.css";

const app = createApp(App);

app.use(createPinia());
app.use(Buefy, {
  defaultIconPack: "mdi",
  defaultContainerElement: "#app",
});
app.use(router);

// Кастомный набор иконок (вендоры LLM, виды моделей) — см.
// docs/design-system.md#иконки. Имя "icon" совпадает с кабинетом, чтобы
// разметка <icon name="..."> переносилась без правки импортов.
app.component("icon", Icon);

app.mount("#app");
