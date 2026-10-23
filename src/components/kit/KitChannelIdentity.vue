<template>
  <!--
    Channel identity reference (Task S2-13, Issue #29). Six visual kinds plus the
    honest unknown path, mono/brand and compact/header sizes, icon-only (named)
    and labelled (decorative icon) semantics. Labels are consumer copy.
    MAX is a neutral symbol: official logo usage is not authorized.
  -->
  <section class="tr-card mb-5" data-testid="channel-identity-reference">
    <h2 class="tr-card__title">Тип канала: иконки и подписи</h2>
    <b-table :data="rows" narrowed>
      <b-table-column field="type" label="type" v-slot="{ row }"><code>{{ row.type }}</code></b-table-column>
      <b-table-column label="mono compact, только иконка" v-slot="{ row }">
        <ChannelTypeIcon :type="row.type" :label="row.label" />
      </b-table-column>
      <b-table-column label="brand header, только иконка" v-slot="{ row }">
        <ChannelTypeIcon :type="row.type" :label="row.label" size="header" variant="brand" />
      </b-table-column>
      <b-table-column label="с подписью (иконка декоративна)" v-slot="{ row }">
        <ChannelTypeIcon :type="row.type" :label="row.label" decorative />
        <span class="ml-1">{{ row.label }}</span>
      </b-table-column>
    </b-table>
  </section>
</template>

<script setup>
import { ChannelTypeIcon } from "@iam3xtr/vue";

const rows = [
  { type: "web", label: "Web-чат" },
  { type: "widget", label: "Виджет" },
  { type: "telegram", label: "Telegram" },
  { type: "email", label: "Электронная почта" },
  { type: "whatsapp", label: "WhatsApp" },
  { type: "max", label: "MAX" },
  { type: "sms-gateway", label: "sms-gateway" },
  { type: "<b>x</b>", label: "<b>x</b>" },
  { type: null, label: "Тип не указан" },
];
</script>
