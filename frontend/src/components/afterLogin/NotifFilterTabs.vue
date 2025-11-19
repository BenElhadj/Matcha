import { API_URL, BASE_URL } from '@/utility.js';
<template>
  <q-tabs
    v-model="tabProxy"
    class="notif-tabs"
    dense
    align="justify"
    active-color="primary"
    indicator-color="primary"
  >
    <q-tab name="all" label="Tout" />
    <q-tab name="like" label="Likes" />
    <q-tab name="visit" label="Vues" />
    <q-tab name="block" label="Block/Report" />
  </q-tabs>
  <q-separator class="full-width-separator" spacing></q-separator>
  <div>
    <slot name="all" v-if="tabProxy === 'all'"></slot>
    <slot name="like" v-else-if="tabProxy === 'like'"></slot>
    <slot name="visit" v-else-if="tabProxy === 'visit'"></slot>
    <slot name="block" v-else-if="tabProxy === 'block'"></slot>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  modelValue: { type: String, default: 'all' }
})
const emit = defineEmits(['update:modelValue'])
const tabProxy = ref(props.modelValue)
watch(tabProxy, (v) => emit('update:modelValue', v))
watch(
  () => props.modelValue,
  (v) => {
    if (v !== tabProxy.value) tabProxy.value = v
  }
)
</script>

<style scoped>
.full-width-separator {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  z-index: 1;
  margin-bottom: 17px;
}
</style>
