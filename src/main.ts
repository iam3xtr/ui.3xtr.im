import { createApp } from "vue";
import Buefy from "buefy";

import App from "./App.vue";
import router from "./router";

// Импортируем собственную сборку Bulma + Buefy.
// Не подключайте одновременно buefy/dist/css/buefy.css.
import "./styles/trickster-buefy.scss";
import "@mdi/font/css/materialdesignicons.css";

const app = createApp(App);

app.use(Buefy, {
  defaultIconPack: "mdi",
  defaultContainerElement: "#app",
});
app.use(router);

app.mount("#app");
