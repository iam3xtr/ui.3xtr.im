import { createApp } from "vue";
import Buefy from "buefy";
import "@mdi/font/css/materialdesignicons.css";
import "@iam3xtr/ui/styles/theme.css";
import { provideIconRegistry } from "@iam3xtr/vue";
import { icons } from "@iam3xtr/ui/icons";
import App from "./App.vue";
import "./fixture.css";
import { applyTheme, modeFromSearch } from "./theme.js";

// Theme is applied synchronously before the first mount, so nothing visible
// is ever rendered with the default theme. The same entry serves standalone
// and iframe use; only the `embedded` flag differs.
const mode = modeFromSearch(location.search);
applyTheme(mode);

const embedded = window.self !== window.top || new URLSearchParams(location.search).has("embed");
const app = createApp(App, { initialMode: mode, embedded }).use(Buefy);
provideIconRegistry(app, icons);
app.mount("#app");
