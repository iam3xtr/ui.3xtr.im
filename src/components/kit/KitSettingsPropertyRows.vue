<template>
  <!--
    Общие строки свойств для трёх host-вариантов (Task S2-05). Нативные input/textarea дают корректную связь label for. Презентационный
    фрагмент kit: без валидации, сохранения и прав — состояние приходит снаружи,
    подписи принадлежат consumer'у.
  -->
  <dl class="tr-property-list" data-testid="property-list">
    <div class="tr-property" :class="{ 'tr-property--readonly': !editable }">
      <dt class="tr-property__label">{{ copy.id }}</dt>
      <dd class="tr-property__value">{{ idValue }}</dd>
    </div>

    <div class="tr-property" :class="{ 'tr-property--error': !!nameError }">
      <dt class="tr-property__label">
        <label :for="`${idPrefix}-name`">{{ copy.name }}</label>
      </dt>
      <dd v-if="editable" class="tr-property__control">
        <input
          :id="`${idPrefix}-name`"
          v-model="draft.name"
          class="input"
          type="text"
          :disabled="busy"
          :aria-invalid="nameError ? 'true' : undefined"
          :aria-describedby="nameError ? `${idPrefix}-name-hint` : undefined"
        />
        <p v-if="nameError" :id="`${idPrefix}-name-hint`" class="tr-property__hint" role="alert">
          {{ nameError }}
        </p>
      </dd>
      <dd v-else class="tr-property__value">{{ draft.name }}</dd>
    </div>

    <div class="tr-property" :class="{ 'tr-property--readonly': !editable }">
      <dt class="tr-property__label">
        <label :for="`${idPrefix}-description`">{{ copy.description }}</label>
      </dt>
      <dd v-if="editable" class="tr-property__control">
        <textarea
          :id="`${idPrefix}-description`"
          v-model="draft.description"
          class="textarea"
          rows="3"
          :disabled="busy"
        />
      </dd>
      <dd v-else class="tr-property__value">{{ draft.description || "—" }}</dd>
    </div>

    <div
      v-for="row in extraRows"
      :key="row.key"
      class="tr-property tr-property--readonly"
    >
      <dt class="tr-property__label">{{ row.label }}</dt>
      <dd class="tr-property__value">{{ row.value }}</dd>
    </div>
  </dl>
</template>

<script setup>
defineProps({
  copy: { type: Object, required: true },
  draft: { type: Object, required: true },
  idPrefix: { type: String, required: true },
  idValue: { type: String, default: "" },
  editable: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  nameError: { type: String, default: "" },
  extraRows: { type: Array, default: () => [] },
});
</script>
