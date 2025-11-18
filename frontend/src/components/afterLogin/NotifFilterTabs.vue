import { API_URL, BASE_URL } from '@/utility.js';
<template>
  <q-tabs
    v-model="tab"
    class="notif-tabs"
    dense
    align="justify"
    active-color="primary"
    indicator-color="primary"
  >
    <q-tab name="all" label="Tout" />
    <q-tab name="likes" label="Likes" />
    <q-tab name="views" label="Vues" />
    <q-tab name="block" label="Block/Report" />
  </q-tabs>
  <q-separator class="full-width-separator" spacing></q-separator>
  <div>
    <slot name="all" v-if="tab === 'all'"></slot>
    <slot name="likes" v-else-if="tab === 'likes'"></slot>
    <slot name="views" v-else-if="tab === 'views'"></slot>
    <slot name="block" v-else-if="tab === 'block'"></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const tab = ref('all')
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
