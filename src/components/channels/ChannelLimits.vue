<template>
  <section class="tr-channel-limits">
    <div class="tr-channel-limits__header">
      <h3 class="tr-channel-limits__title">Лимиты</h3>
      <b-button
        size="is-small"
        type="is-text"
        @click="toggleEditing"
      >
        {{ editing ? "Готово" : "Изменить" }}
      </b-button>
    </div>

    <b-table v-if="!editing" :data="channel.limits" class="tr-table--compact" mobile-cards>
      <b-table-column field="label" label="Параметр" v-slot="{ row }">
        {{ row.label }}
      </b-table-column>

      <b-table-column field="effective" label="Значение" v-slot="{ row }">
        {{ row.effective }}
      </b-table-column>

      <b-table-column field="source" label="Источник" v-slot="{ row }">
        {{ sourceLabel(row.source) }}
      </b-table-column>
    </b-table>

    <form v-else class="tr-form" @submit.prevent="editing = false">
      <b-field
        v-for="limit in overridableLimits"
        :key="limit.key"
        :label="limit.label"
      >
        <b-input
          v-model.number="draftValues[limit.key]"
          type="number"
          min="0"
          :placeholder="limit.effective"
          @blur="applyLimit(limit.key)"
        />
      </b-field>
    </form>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, reactive, ref } from "vue";

import { useChannelsStore } from "../../stores/channels";
import { useWorkspaceStore } from "../../stores/workspace";

// Демо-панель лимитов канала (Task A5.5), эквивалент
// `get.3xtr.im/src/modules/channels/components/ChannelLimits.vue` без
// серверной пагинации/конфликтов версий — здесь всё синхронный fixture-стор.
// Показывает только эффективное значение и его источник в режиме просмотра;
// редактирование ограничено полями `overridable` и применяется сразу, как и
// другие формы кита (AgentSettings.vue, WorkspaceSettings.vue).
const props = defineProps({
  channel: { type: Object, required: true },
  agentId: { type: [String, Number], required: true },
});

const editing = ref(false);

const channelsStore = useChannelsStore();
const workspaceStore = useWorkspaceStore();
const { activeWorkspaceId } = storeToRefs(workspaceStore);

const overridableLimits = computed(
  () => props.channel.limits.filter((limit) => limit.overridable),
);

const draftValues = reactive({});

function toggleEditing() {
  if (!editing.value) {
    for (const limit of overridableLimits.value) {
      draftValues[limit.key] = limit.configured ?? null;
    }
  }

  editing.value = !editing.value;
}

function sourceLabel(source) {
  return { default: "По умолчанию", workspace: "Пространство", plan: "Тариф" }[source]
    ?? source;
}

function applyLimit(key) {
  channelsStore.updateLimits(
    activeWorkspaceId.value,
    props.agentId,
    props.channel.id,
    { [key]: draftValues[key] ?? null },
  );
}
</script>
