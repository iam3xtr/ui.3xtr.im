<script setup>
// Consumer example for `FormDrawer shell`: a real vee-validate `<Form>` is the
// only form element and wraps the drawer body and footer through the `shell`
// slot. vee-validate is a fixture dependency only, never a package peer.
import { ref } from "vue";
import { Form, Field } from "vee-validate";
import { FormDrawer } from "@iam3xtr/vue";

const props = defineProps({
  onSave: { type: Function, required: true },
  beforeClose: { type: Function, default: null },
  width: { type: String, default: null },
});
const open = ref(true);
defineExpose({ open });

const requiredName = (value) => (value && value.trim() ? true : "Name is required");
</script>

<template>
  <FormDrawer
    v-model="open"
    shell
    title="Add member"
    close-aria-label="Close"
    :before-close="props.beforeClose"
    :width="props.width"
  >
    <template #shell="{ content: DrawerContent }">
      <Form class="tr-consumer-shell__form" @submit="props.onSave">
        <component :is="DrawerContent" />
      </Form>
    </template>
    <Field v-slot="{ field, errorMessage }" name="name" :rules="requiredName">
      <input v-bind="field" class="tr-consumer-shell__name" aria-label="Name">
      <p v-if="errorMessage" class="tr-consumer-shell__error">{{ errorMessage }}</p>
    </Field>
    <template #footer="{ requestClose }">
      <button type="button" class="tr-consumer-shell__cancel" @click="requestClose('programmatic')">
        Cancel
      </button>
      <button type="submit" class="tr-consumer-shell__save">Save</button>
    </template>
  </FormDrawer>
</template>
