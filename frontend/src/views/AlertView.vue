<template>
  <div>
    <q-dialog
      v-model="alert.state"
      persistent
      transition-show="flip-down"
      transition-hide="flip-up"
      style="bottom: 100%"
    >
      <q-card :class="`bg-${alert.color} text-white`" style="width: 320px">
        <q-card-section>
          <div class="text-h6">Alert</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          {{ alert.text }}
        </q-card-section>
        <q-card-actions align="right" class="bg-white text-teal">
          <template v-if="alert && alert.confirm === true">
            <q-btn flat :label="alert.noLabel || 'Non'" color="green" @click="onNo"></q-btn>
            <q-btn flat :label="alert.yesLabel || 'Oui'" color="red" @click="onYes"></q-btn>
          </template>
          <template v-else>
            <q-btn flat label="OK" @click="onOk"></q-btn>
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
const props = defineProps({ alert: Object })
const emit = defineEmits(['yes', 'no'])

function onNo() {
  emit('no')
  if (props.alert) props.alert.state = false
}
function onYes() {
  emit('yes')
  if (props.alert) props.alert.state = false
}
function onOk() {
  if (props.alert) props.alert.state = false
}
</script>
