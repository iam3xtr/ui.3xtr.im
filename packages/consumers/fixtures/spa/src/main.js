import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import Buefy from "buefy";
import { provideIconRegistry } from "@iam3xtr/vue";
import App from "./App.vue";

// Consumer-side responsibility, exactly as documented by the packages:
// install Buefy once, provide a router instance, and provide the
// custom-icon registry (empty here — this fixture has no LLM vendor icons)
// before mounting.
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/", component: { template: "<div />" } }],
});

const app = createApp(App).use(Buefy).use(router);
provideIconRegistry(app, {});
app.mount("#app");
