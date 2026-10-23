<template>
  <!-- Save outcome notices for one Settings family (Task S2-07): conflict, error, unknown. -->
  <div v-if="form.isConflict.value" data-testid="family-conflict">
    <b-message type="is-warning" :closable="false">
      {{ copy.conflict }}
      <div class="tr-form__footer mt-2">
        <b-button size="is-small" data-testid="family-reload" @click="form.reloadRemote()">
          {{ copy.reload }}
        </b-button>
        <b-button size="is-small" type="is-primary" data-testid="family-keep" @click="form.keepLocal()">
          {{ copy.keepMine }}
        </b-button>
      </div>
    </b-message>
  </div>
  <b-message v-else-if="form.isError.value" type="is-danger" :closable="false" data-testid="family-error">
    {{ form.errorMessage.value }}
    <div class="tr-form__footer mt-2">
      <b-button size="is-small" data-testid="family-retry" @click="form.retry()">{{ copy.retry }}</b-button>
    </div>
  </b-message>
  <b-message v-else-if="form.isUnknown.value" type="is-warning" :closable="false" data-testid="family-unknown">
    {{ copy.unknown }}
    <div class="tr-form__footer mt-2">
      <b-button size="is-small" data-testid="family-verify" @click="form.verify()">{{ copy.verify }}</b-button>
    </div>
  </b-message>
</template>

<script setup>
defineProps({
  copy: { type: Object, required: true },
  form: { type: Object, required: true },
});
</script>
