<template>
  <div>
    <Loader v-if="loading" size="section" class="tr-loader--standalone" />

    <AsyncState
      v-else-if="demoStore.isPermissionDenied"
      variant="permission-denied"
      v-bind="demoStore.permissionDeniedState"
    />

    <AsyncState
      v-else-if="demoStore.isError"
      variant="error"
      :icon="demoStore.listAsyncState.errorIcon"
      :title="demoStore.listAsyncState.errorTitle"
      :message="demoStore.listAsyncState.errorMessage"
    />

    <RouterLink
      v-else-if="agents.length === 0 || demoStore.isEmpty"
      :to="{ name: 'agent-wizard' }"
      class="tr-card tr-card--interactive tr-dashboard-create"
    >
      <span class="tr-icon-tile tr-icon-tile--plain tr-dashboard-create__icon">
        <b-icon icon="robot-excited-outline" size="is-large" />
      </span>
      <strong>{{ emptyCtaLabel }}</strong>
      <span>{{ emptyCtaCaption }}</span>
    </RouterLink>

    <template v-else>
      <b-message
        v-if="demoStore.isPartial"
        type="is-warning"
        :closable="false"
      >
        Показан не весь обзор: часть виджетов недоступна из-за временной
        ошибки. Остальные ниже — актуальны.
      </b-message>

      <!--
        S2 "Требует внимания" (Task A10.4, `.plan` "Ежедневный dashboard и
        диагностика агента"), turned into a session-scoped queue by Issue
        #13.1 (`.todo` "Dashboard attention queue"): incomplete setup,
        knowledge, channel, handoff and limit reasons are still each a real
        fixture derivation (see `attentionItems` below) with its own
        concrete route/action — only the presentation changed, to at most
        one active card at a time via `useDashboardAttentionQueue`. No
        section title (aria-label carries the same name for assistive
        tech); an empty derivation renders nothing at all, same as before.
      -->
      <section
        v-if="attentionItems.length > 0"
        class="tr-dashboard-attention mb-5"
        aria-label="Требует внимания"
      >
        <template v-if="attentionActiveItem">
          <div v-if="attentionTotal > 1" class="tr-dashboard-attention__nav">
            <b-button
              icon-left="chevron-left"
              size="is-small"
              :disabled="!attentionHasPrevious"
              aria-label="Предыдущее уведомление"
              @click="goToPreviousAttentionItem"
            />
            <span class="tr-muted" aria-live="polite">
              {{ attentionPosition }} из {{ attentionTotal }}
            </span>
            <b-button
              icon-left="chevron-right"
              size="is-small"
              :disabled="!attentionHasNext"
              aria-label="Следующее уведомление"
              @click="goToNextAttentionItem"
            />
          </div>

          <div class="tr-card tr-dashboard-attention__item">
            <span class="tr-icon-tile tr-icon-tile--plain tr-dashboard-attention__icon">
              <b-icon :icon="attentionActiveItem.icon" size="is-medium" />
            </span>

            <div class="tr-dashboard-attention__body">
              <strong>{{ attentionActiveItem.title }}</strong>
              <span class="tr-muted">{{ attentionActiveItem.message }}</span>
            </div>

            <div class="tr-dashboard-attention__controls">
              <b-button
                tag="router-link"
                :to="attentionActiveItem.to"
                type="is-primary"
                size="is-small"
                class="tr-dashboard-attention__action"
              >
                {{ attentionActiveItem.actionLabel }}
              </b-button>

              <b-button
                size="is-small"
                aria-label="Скрыть до конца сессии"
                @click="dismissActiveAttentionItem"
              >
                Скрыть
              </b-button>
            </div>
          </div>
        </template>

        <p v-else class="tr-muted tr-dashboard-attention__restore">
          Скрыто уведомлений в этой сессии: {{ attentionHiddenCount }}.
          <b-button type="is-text" size="is-small" @click="restoreHiddenAttentionItems">
            Показать
          </b-button>
        </p>
      </section>

      <section class="tr-grid tr-grid--3 tr-dashboard-grid mb-5">
        <RouterLink
          v-for="item in dashboardNavigationItems"
          :key="item.routeName"
          :to="{ name: item.routeName }"
          class="tr-card tr-card--interactive tr-dashboard-link"
        >
          <div class="tr-dashboard-link__header">
            <div>
              <h2 class="tr-card__title mb-0">{{ item.label }}</h2>
            </div>

            <span class="tr-icon-tile tr-icon-tile--plain tr-dashboard-icon">
              <b-icon :icon="item.icon" size="is-medium" />
            </span>
          </div>

          <div class="tr-dashboard-link__metric">
            <strong>{{ item.value }}</strong>
            <span v-if="item.caption">{{ item.caption }}</span>
          </div>
        </RouterLink>
      </section>

      <section class="tr-grid tr-grid--2 mb-5">
        <article class="tr-card">
          <div class="tr-row tr-row--between mb-4">
            <h2 class="tr-card__title mb-0">Последние агенты</h2>
            <b-button tag="router-link" :to="{ name: 'agents' }" size="is-small">
              Все агенты
            </b-button>
          </div>

          <b-table :data="recentAgents" hoverable mobile-cards>
            <b-table-column field="name" label="Название" v-slot="{ row }">
              <strong>{{ row.name }}</strong>
            </b-table-column>

            <b-table-column field="status" label="Статус" v-slot="{ row }">
              <b-tag :type="agentBadge(row).badgeType">
                {{ agentBadge(row).badgeLabel }}
              </b-tag>
            </b-table-column>

            <b-table-column field="updated" label="Обновлено" v-slot="{ row }">
              {{ row.updated }}
            </b-table-column>
          </b-table>
        </article>

        <article class="tr-card">
          <div class="tr-row tr-row--between mb-4">
            <h2 class="tr-card__title mb-0">Последние диалоги</h2>
            <b-button tag="router-link" :to="{ name: 'conversations' }" size="is-small">
              Все диалоги
            </b-button>
          </div>

          <b-table :data="recentConversations" hoverable mobile-cards>
            <b-table-column field="contact" label="Контакт" v-slot="{ row }">
              <strong>{{ row.contact }}</strong>
              <span v-if="row.awaitingOperator" class="tr-muted">
                — ожидает оператора
              </span>
            </b-table-column>

            <b-table-column field="channel" label="Канал" v-slot="{ row }">
              {{ row.channel }}
            </b-table-column>

            <b-table-column field="status" label="Статус" v-slot="{ row }">
              <b-tag :type="row.status === 'Активен' ? 'is-primary' : undefined">
                {{ row.status }}
              </b-tag>
            </b-table-column>

            <b-table-column field="updated" label="Обновлено" v-slot="{ row }">
              {{ row.updated }}
            </b-table-column>
          </b-table>
        </article>
      </section>

      <!--
        Метрики (Task A10.4 acceptance: "Цифры имеют период и время
        обновления, unknown отличается от 0"): `deliveryRate` shows "—" when
        nothing has actually been sent yet (unknown), not a fabricated 0% —
        and is explicitly framed as delivery, not answer quality (`.plan`:
        "техническую доставку не называть качеством помощи"). Tariff limits
        reuse the real seven-key contract from `stores/workspace.js`, where
        `progress: null` means unlimited, not unknown.
      -->
      <section class="tr-card">
        <div class="tr-row tr-row--between mb-4">
          <h2 class="tr-card__title mb-0">Метрики</h2>
          <span class="tr-muted">Обновлено: {{ updatedAt }}</span>
        </div>

        <div class="tr-grid tr-grid--3 mb-5">
          <div>
            <div class="tr-dashboard-link__metric">
              <strong>{{ conversationsToday }}</strong>
              <span>диалогов за сегодня</span>
            </div>
          </div>

          <div>
            <div class="tr-dashboard-link__metric">
              <strong>{{ deliveryRate === null ? "—" : `${deliveryRate}%` }}</strong>
              <span>доставлено успешно</span>
            </div>
            <span class="tr-muted">{{ deliveryRateCaption }}</span>
          </div>
        </div>

        <div class="tr-stack">
          <div v-for="limit in tariffLimits" :key="limit.key">
            <div class="tr-row tr-row--between">
              <span>{{ limit.label }}</span>
              <span class="tr-muted">{{ limit.caption }}</span>
            </div>
            <b-progress
              v-if="limit.progress !== null"
              :value="limit.progress"
              type="is-primary"
              size="is-small"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import { useDashboardAttentionQueue } from "../composables/useDashboardAttentionQueue";
import { useSimulatedLoading } from "../composables/useSimulatedLoading";
import { getAgentStatusProjection, useAgentsStore } from "../stores/agents";
import { getChannelsNeedingAttention, useChannelsStore } from "../stores/channels";
import { needsOperatorAttention, useConversationsStore } from "../stores/conversations";
import { useDemoStore } from "../stores/demo";
import { getCollectionAttentionReason, useKnowledgeStore } from "../stores/knowledge";
import { useProfileStore } from "../stores/profile";
import { getLimitsNeedingAttention, useWorkspaceStore } from "../stores/workspace";
import { useWizardStore, WIZARD_STEPS } from "../stores/wizard";

import { AsyncState, Loader } from "@iam3xtr/vue";

// Demo-режим (Stage A7, Task A7.5): та же схема, что у каталогов Task A7.3 —
// `Loader` на загрузку, прямой `AsyncState` на permission-denied/error,
// `b-message`-баннер на partial поверх виджетов. `empty` переиспользует уже
// существующую CTA-карточку «Создать первого агента» (реальный
// эквивалент AsyncState-empty для этого экрана), а не заводит второй
// empty-контракт — она срабатывает и когда агентов правда нет, и когда
// demo-режим форсирует пустоту.
const { isLoading } = useSimulatedLoading();
const demoStore = useDemoStore();
const loading = computed(() => isLoading.value || demoStore.isLoading);

const agentsStore = useAgentsStore();
const channelsStore = useChannelsStore();
const knowledgeStore = useKnowledgeStore();
const conversationsStore = useConversationsStore();
const wizardStore = useWizardStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId, activeWorkspaceTariff } = storeToRefs(workspaceStore);

const agents = computed(() => agentsStore.listByWorkspace(activeWorkspaceId.value));
const conversations = computed(
  () => conversationsStore.listByWorkspace(activeWorkspaceId.value),
);

// Task A10.4 (`.plan`: "Пустой dashboard сохраняет вход A9; draft
// продолжается, новый агент создаётся тем же мастером"): the CTA always
// routes to the same `agent-wizard` entry, whose own `ensureDraft`
// (`AgentWizard.vue`) resumes an in-progress draft transparently — the
// label here only sets the right expectation before that happens.
const emptyDraft = computed(() => wizardStore.getDraft(activeWorkspaceId.value));
const emptyCtaLabel = computed(() => (
  emptyDraft.value?.status === "in_progress"
    ? "Продолжить настройку агента"
    : "Создать первого агента"
));
const emptyCtaCaption = computed(() => (
  emptyDraft.value?.status === "in_progress"
    ? "Черновик уже начат — мастер откроется на том же шаге."
    : "Настройте агента и начните тестирование в песочнице"
));

const STEP_LABELS = {
  pain: "Боль",
  context: "Контекст бизнеса",
  rules: "Правила ответов",
  knowledge: "Знания",
  sandbox: "Песочница",
  telegram: "Telegram",
  review: "Проверка и запуск",
};

/**
 * S2 "Требует внимания" (Task A10.4): собирает конкретные причины из
 * реальных fixture-хранилищ — черновик мастера, коллекции с ошибками
 * индексации, каналы без доставки, диалоги, ожидающие оператора, и
 * измеренные (не unlimited) лимиты тарифа у порога. Каждая причина — чистая
 * производная существующего состояния соответствующего стора, не второй
 * источник истины; ошибка одного канала добавляет отдельную карточку и не
 * скрывает работающих агентов/каналы рядом (`.plan`: "сбой одного канала не
 * скрывает работу остальных").
 */
const attentionItems = computed(() => {
  const workspaceId = activeWorkspaceId.value;
  const items = [];

  const draft = wizardStore.getDraft(workspaceId);
  if (draft?.status === "in_progress") {
    items.push({
      key: "wizard-draft",
      icon: "robot-confused-outline",
      title: "Настройка агента не завершена",
      message: `Черновик остановился на шаге «${STEP_LABELS[draft.step] ?? draft.step}».`,
      actionLabel: "Продолжить",
      to: { name: "agent-wizard" },
    });
  }

  for (const collection of knowledgeStore.listByWorkspace(workspaceId)) {
    const reason = getCollectionAttentionReason(collection);

    if (reason) {
      items.push({
        key: `knowledge-${collection.id}`,
        icon: "book-alert-outline",
        title: `Коллекция «${collection.name}» требует внимания`,
        message: reason,
        actionLabel: "Открыть материалы",
        to: { name: "knowledge-collection", params: { id: collection.id } },
      });
    }
  }

  for (const agent of agentsStore.listByWorkspace(workspaceId)) {
    const channels = channelsStore.listByAgent(workspaceId, agent.id);

    for (const channel of getChannelsNeedingAttention(channels)) {
      items.push({
        key: `channel-${channel.id}`,
        icon: "connection",
        title: `Канал «${channel.name}» не отвечает`,
        message: `Агент «${agent.name}»: ${channel.runtimeReason ?? "требуется проверка подключения."}`,
        actionLabel: "Открыть канал",
        to: { name: "agent-channels", params: { id: agent.id } },
      });
    }
  }

  for (const conversation of conversationsStore.listByWorkspace(workspaceId)) {
    if (needsOperatorAttention(conversation)) {
      items.push({
        key: `handoff-${conversation.id}`,
        icon: "account-voice",
        title: `Диалог с ${conversation.contact} передан оператору`,
        message: conversation.operatorNote ?? "Требуется участие оператора.",
        actionLabel: "Открыть диалог",
        to: {
          name: "conversation",
          params: { agentId: conversation.agentId, conversationId: conversation.id },
        },
      });
    }
  }

  for (const limit of getLimitsNeedingAttention(activeWorkspaceTariff.value.limits)) {
    // Stage A10 review fix: `getLimitsNeedingAttention` surfaces both an
    // already-`exhausted` limit and a near-threshold `ok` one — the title
    // must not say "почти" ("almost") for the former, it would contradict
    // `limit.caption` right below it ("лимит исчерпан").
    items.push({
      key: `limit-${limit.key}`,
      icon: "gauge-full",
      title: limit.state === "exhausted"
        ? `Лимит «${limit.label}» исчерпан`
        : `Лимит «${limit.label}» почти исчерпан`,
      message: limit.caption,
      actionLabel: "Перейти к тарифу",
      to: { name: "workspace-plans" },
    });
  }

  return items;
});

// Issue #13.1 (`.todo` "Dashboard attention queue"): the derivation above
// stays a plain array of reasons; this composable owns only the
// presentation — one active card, manual previous/next and a dismiss
// scoped to `workspace + browser session` — see
// `composables/useDashboardAttentionQueue.js` for the session-storage
// isolation and the key-stable active-item rule.
const {
  activeItem: attentionActiveItem,
  position: attentionPosition,
  total: attentionTotal,
  hasPrevious: attentionHasPrevious,
  hasNext: attentionHasNext,
  hiddenCount: attentionHiddenCount,
  goPrevious: goToPreviousAttentionItem,
  goNext: goToNextAttentionItem,
  dismissActive: dismissActiveAttentionItem,
  restoreHidden: restoreHiddenAttentionItems,
} = useDashboardAttentionQueue(attentionItems, activeWorkspaceId);

// Tile set and order mirror get.3xtr.im's Dashboard.vue tiles (Task A5.3):
// conversations, agents, knowledge, workspace settings/plan, then the
// account tile. Task A10.4: every value below is a real count derived from
// the domain stores — the former ad hoc `dashboards`/`emptyDashboard`
// fixtures (fabricated deltas, a made-up "из 500 GB" knowledge cap and
// "Успешные ответы" quality claim) are gone; see "Метрики" below for the
// period-scoped numbers instead.
const dashboardSections = [
  { routeName: "conversations", icon: "forum-outline", label: "Диалоги" },
  { routeName: "agents", icon: "robot-outline", label: "Агенты" },
  { routeName: "knowledge", icon: "book-open-page-variant-outline", label: "Знания" },
  { routeName: "workspace-settings", icon: "office-building-cog-outline", label: "Пространство" },
  { routeName: "workspace-plans", icon: "credit-card-outline", label: "Тариф" },
  { routeName: "profile", icon: "account-outline", label: "Профиль" },
];

const profileStore = useProfileStore();
const { profile } = storeToRefs(profileStore);
const activeWorkspace = computed(
  () => workspaceStore.workspaces.find((item) => item.id === activeWorkspaceId.value),
);

const dashboardNavigationItems = computed(() => {
  const knowledgeCollections = knowledgeStore.listByWorkspace(activeWorkspaceId.value);
  const totalKnowledgeObjects = knowledgeCollections
    .reduce((sum, collection) => sum + collection.objects.length, 0);
  const activeAgents = agents.value.filter((agent) => agent.status === "Активен").length;
  const activeConversations = conversations.value
    .filter((conversation) => conversation.status === "Активен").length;

  const valuesByRoute = {
    conversations: { value: String(conversations.value.length), caption: `${activeConversations} активных` },
    agents: { value: String(agents.value.length), caption: `${activeAgents} активных` },
    knowledge: { value: String(knowledgeCollections.length), caption: `${totalKnowledgeObjects} материалов` },
    "workspace-settings": { value: activeWorkspace.value?.name ?? "—", caption: activeWorkspace.value?.role ?? "" },
    "workspace-plans": { value: activeWorkspaceTariff.value.displayName, caption: "текущий тариф" },
    profile: {
      value: profile.value.name,
      caption: profile.value.emailVerified ? "Email подтверждён" : "Email не подтверждён",
    },
  };

  return dashboardSections.map((section) => ({
    ...section,
    ...valuesByRoute[section.routeName],
  }));
});

const RECENT_LIMIT = 5;

// Fixtures carry no real timestamp for `updated` (Task A10.4/A10.5's own
// comments note the store has no clock/`setInterval` anywhere) — only a
// human-readable relative string ("5 мин", "Вчера", "2 д", "Сейчас"), shared
// verbatim by `agents.js` and `conversations.js`. Stage A10 review fix:
// "Последние агенты"/"Последние диалоги" must actually show the most recent
// records, not just the first N in fixture-array order, so this parses that
// string into a comparable "minutes ago" for sorting only — it is never
// rendered, the screen still displays the original `updated` text.
const RECENCY_UNIT_MINUTES = { мин: 1, ч: 60, д: 1440 };

function parseRecencyMinutesAgo(updated) {
  if (updated === "Сейчас") {
    return 0;
  }
  if (updated === "Вчера") {
    return 24 * 60;
  }
  const match = /^(\d+)\s*(мин|ч|д)$/u.exec(String(updated ?? "").trim());
  if (!match) {
    // Unrecognized/missing value: sort as the oldest rather than guessing —
    // consistent with the rest of A10.4's "unknown ≠ zero" rule for metrics.
    return Number.POSITIVE_INFINITY;
  }
  const [, amount, unit] = match;
  return Number(amount) * RECENCY_UNIT_MINUTES[unit];
}

function byRecency(a, b) {
  return parseRecencyMinutesAgo(a.updated) - parseRecencyMinutesAgo(b.updated);
}

const recentAgents = computed(() => [...agents.value].sort(byRecency).slice(0, RECENT_LIMIT));
const recentConversations = computed(
  () => [...conversations.value].sort(byRecency).slice(0, RECENT_LIMIT),
);

/**
 * S2 badge for the "Последние агенты" table — same projection as the
 * catalog card (`components/Agents.vue`), so a channel failure reads the
 * same way here as it does there instead of the table's own plain status
 * string.
 *
 * @param {import("../stores/agents").Agent} agent
 */
function agentBadge(agent) {
  return getAgentStatusProjection(
    agent,
    channelsStore.listByAgent(activeWorkspaceId.value, agent.id),
  );
}

// Метрики: период + время обновления (Task A10.4 acceptance). `updatedAt` —
// снимок момента открытия обзора (тот же приём, что "только что" в
// `stores/knowledge.js`), не пересчитывается на каждый ререндер.
const updatedAt = ref(
  new Intl.DateTimeFormat("ru", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
);

const conversationsToday = computed(
  () => conversations.value.filter((conversation) => conversation.created.startsWith("Сегодня")).length,
);

/**
 * Доля исходящих сообщений, реально доставленных/прочитанных, а не
 * абстрактная «успешность ответов» (`.plan`: "техническую доставку не
 * называть качеством помощи"). `null`, когда сегодня ничего не отправлялось
 * — не путается с «0%», у которого другой смысл (см. `deliveryRateCaption`).
 */
const deliveryStats = computed(() => {
  let delivered = 0;
  let total = 0;

  for (const conversation of conversations.value) {
    for (const message of conversation.messages) {
      if (message.outgoing && message.delivery) {
        total += 1;
        if (message.delivery.status === "delivered" || message.delivery.status === "read") {
          delivered += 1;
        }
      }
    }
  }

  return { delivered, total };
});
const deliveryRate = computed(() => {
  const { delivered, total } = deliveryStats.value;
  return total === 0 ? null : Math.round((delivered / total) * 100);
});
const deliveryRateCaption = computed(() => {
  const { delivered, total } = deliveryStats.value;
  return total === 0
    ? "Нет отправленных сообщений"
    : `${delivered} из ${total} исходящих сообщений`;
});

const tariffLimits = computed(() => activeWorkspaceTariff.value.limits);
</script>
