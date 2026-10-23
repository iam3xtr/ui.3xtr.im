<template>
  <!-- Presentation-only property rows for one Settings family (Task S2-07). -->
  <dl class="tr-property-list">
    <div
      v-for="field in family.fields"
      :key="field.key"
      class="tr-property"
      :class="{
        'tr-property--readonly': !editable || field.readonly,
        'tr-property--error': !!errors[field.key],
      }"
    >
      <dt class="tr-property__label">
        <label v-if="editable && !field.readonly" :for="`${idPrefix}-${field.key}`">
          {{ copy.fields[field.key] }}
        </label>
        <template v-else>{{ copy.fields[field.key] }}</template>
      </dt>
      <dd v-if="editable && !field.readonly" class="tr-property__control">
        <textarea
          v-if="field.multiline"
          :id="`${idPrefix}-${field.key}`"
          v-model="draft[field.key]"
          class="textarea"
          rows="3"
          :disabled="busy"
        />
        <input
          v-else
          :id="`${idPrefix}-${field.key}`"
          v-model="draft[field.key]"
          class="input"
          :type="field.secret ? 'password' : 'text'"
          :autocomplete="field.secret ? 'new-password' : 'off'"
          :disabled="busy"
          :aria-invalid="errors[field.key] ? 'true' : undefined"
          :aria-describedby="errors[field.key] ? `${idPrefix}-${field.key}-hint` : undefined"
        />
        <p
          v-if="errors[field.key]"
          :id="`${idPrefix}-${field.key}-hint`"
          class="tr-property__hint"
          role="alert"
        >
          {{ errors[field.key] }}
        </p>
      </dd>
      <dd v-else class="tr-property__value">
        {{ field.secret ? "••••••••" : draft[field.key] || "—" }}
      </dd>
    </div>
  </dl>
</template>

<script setup>
defineProps({
  copy: { type: Object, required: true },
  family: { type: Object, required: true },
  draft: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  idPrefix: { type: String, required: true },
});
</script>
