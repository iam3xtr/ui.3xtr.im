import { createApp } from "vue";
import Buefy from "buefy";
import { createPinia } from "pinia";

import { Icon, provideIconRegistry } from "@iam3xtr/vue";

import App from "./App.vue";
import router from "./router";

const pagesFallbackRouteKey = "trickster-ui-kit:pages-fallback-route";

function restorePagesFallbackRoute() {
  const requestedUrl = window.sessionStorage.getItem(pagesFallbackRouteKey);
  if (!requestedUrl) {
    return;
  }
  window.sessionStorage.removeItem(pagesFallbackRouteKey);

  const requested = new URL(requestedUrl, window.location.origin);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path =
    base && requested.pathname.startsWith(`${base}/`)
      ? requested.pathname.slice(base.length) || "/"
      : requested.pathname;

  router.replace(`${path}${requested.search}${requested.hash}`);
}

// Полная тема из @iam3xtr/ui (Task A11.4): собственной копии Bulma/Buefy
// SCSS в ките больше нет — единственная редактируемая реализация живёт в
// packages/ui. Не подключайте одновременно buefy/dist/css/buefy.css.
import "@iam3xtr/ui/styles/theme.scss";
import "@mdi/font/css/materialdesignicons.css";

// Реестр кастомных SVG-иконок (вендоры LLM, fallback вендора, виды моделей) —
// файлы теперь живут в @iam3xtr/ui, кит резолвит их статическими импортами
// через собственный asset-пайплайн (vite-svg-loader) и один раз регистрирует
// через `provideIconRegistry`, как документирует @iam3xtr/vue/README.md
// ("Icon registry"). Список обязан совпадать с реестром 26 иконок в
// docs/design-system.md#иконки — при добавлении/удалении иконки правьте оба
// места.
import anthropicIcon from "@iam3xtr/ui/assets/icons/anthropic.svg";
import brainIcon from "@iam3xtr/ui/assets/icons/brain.svg";
import cerebrasIcon from "@iam3xtr/ui/assets/icons/cerebras.svg";
import cohereIcon from "@iam3xtr/ui/assets/icons/cohere.svg";
import deepseekIcon from "@iam3xtr/ui/assets/icons/deepseek.svg";
import fireworksIcon from "@iam3xtr/ui/assets/icons/fireworks.svg";
import geminiIcon from "@iam3xtr/ui/assets/icons/gemini.svg";
import gigachatIcon from "@iam3xtr/ui/assets/icons/gigachat.svg";
import googleIcon from "@iam3xtr/ui/assets/icons/google.svg";
import grokIcon from "@iam3xtr/ui/assets/icons/grok.svg";
import groqIcon from "@iam3xtr/ui/assets/icons/groq.svg";
import ionosIcon from "@iam3xtr/ui/assets/icons/ionos.svg";
import jinaIcon from "@iam3xtr/ui/assets/icons/jina.svg";
import kindChatIcon from "@iam3xtr/ui/assets/icons/kind-chat.svg";
import kindEmbeddingIcon from "@iam3xtr/ui/assets/icons/kind-embedding.svg";
import kindRerankIcon from "@iam3xtr/ui/assets/icons/kind-rerank.svg";
import mistralIcon from "@iam3xtr/ui/assets/icons/mistral.svg";
import nvidiaIcon from "@iam3xtr/ui/assets/icons/nvidia.svg";
import openaiIcon from "@iam3xtr/ui/assets/icons/openai.svg";
import openrouterIcon from "@iam3xtr/ui/assets/icons/openrouter.svg";
import perplexityIcon from "@iam3xtr/ui/assets/icons/perplexity.svg";
import sambanovaIcon from "@iam3xtr/ui/assets/icons/sambanova.svg";
import scalewayIcon from "@iam3xtr/ui/assets/icons/scaleway.svg";
import togetherIcon from "@iam3xtr/ui/assets/icons/together.svg";
import xaiIcon from "@iam3xtr/ui/assets/icons/xai.svg";
import yandexIcon from "@iam3xtr/ui/assets/icons/yandex.svg";

const iconRegistry = {
  anthropic: anthropicIcon,
  brain: brainIcon,
  cerebras: cerebrasIcon,
  cohere: cohereIcon,
  deepseek: deepseekIcon,
  fireworks: fireworksIcon,
  gemini: geminiIcon,
  gigachat: gigachatIcon,
  google: googleIcon,
  grok: grokIcon,
  groq: groqIcon,
  ionos: ionosIcon,
  jina: jinaIcon,
  "kind-chat": kindChatIcon,
  "kind-embedding": kindEmbeddingIcon,
  "kind-rerank": kindRerankIcon,
  mistral: mistralIcon,
  nvidia: nvidiaIcon,
  openai: openaiIcon,
  openrouter: openrouterIcon,
  perplexity: perplexityIcon,
  sambanova: sambanovaIcon,
  scaleway: scalewayIcon,
  together: togetherIcon,
  xai: xaiIcon,
  yandex: yandexIcon,
};

const app = createApp(App);

app.use(createPinia());
// `app.use(Buefy)` registers the entire library in one pass — Table, Field,
// Modal, Dialog, Toast, Loading, Pagination, Skeleton, Upload, Tabs, Message,
// Sidebar included — so the Buefy-first registry in
// docs/design-system.md#собственный-компонент-или-buefy is satisfied by this
// single call; no per-component registration is needed. Do not switch to
// selective component imports without updating that registry and the smoke
// examples under src/components/kit/** that exercise it.
app.use(Buefy, {
  defaultIconPack: "mdi",
  defaultContainerElement: "#app",
});
app.use(router);
restorePagesFallbackRoute();

provideIconRegistry(app, iconRegistry);
// Имя "icon" совпадает с кабинетом, чтобы разметка <icon name="..."> в
// доменных экранах переносилась без правки импортов.
app.component("icon", Icon);

app.mount("#app");
