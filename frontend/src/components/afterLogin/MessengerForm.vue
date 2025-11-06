<template>
  <q-layout
    v-if="selectedConvo"
    align="center"
    justify="center"
    class="messenger_form px-3 chat_layout"
  >
    <q-input
      class="custom-q-input"
      rows="1"
      outlined
      bottom-slots
      filled
      dense
      @click:append="sendMsg"
      label="Type a message..."
      v-model="msg"
      @keyup.enter="sendMsg"
    >
      <q-btn
        @click="sendMsg"
        @keyup.enter="sendMsg"
        flat
        round
        style="width: 10px"
        color="primary"
        icon="mdi-send"
      />
    </q-input>
  </q-layout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { getSocket, connectSocket } from '@/boot/socketClient'

const props = defineProps({
  toId: {
    type: Number,
    default: -1
  }
})

let socket = getSocket()
if (!socket) {
  // Ensure a single shared connection; will also emit 'auth' in connectSocket
  const userId = useStore().getters?.user?.id || null
  socket = connectSocket(userId)
}
const store = useStore()
const $q = useQuasar()
const msg = ref(null)
const user = store.getters['user']
const selectedConvo = store.getters['selectedConvo']
// let socket = null

// onMounted(() => {
//   socket = io(`${import.meta.env.VITE_APP_API_URL}`)
// })

watch(msg, () => {
  if (msg.value && msg.value.length) {
    const data = {
      id_conversation: selectedConvo,
      id_from: user.id,
      id_to: props.toId
    }
    socket.emit('typing', data)
  }
})

const sendMsg = async (e) => {
  if (msg.value && msg.value.trim()) {
    if (!e.shiftKey) {
      try {
        // Forbid sending a message to yourself (previous behavior)
        if (String(user.id) === String(props.toId)) {
          $q.notify({ type: 'negative', message: 'Vous ne pouvez pas vous envoyer un message.' })
          msg.value = ''
          return
        }
        const url = `${import.meta.env.VITE_APP_API_URL}/api/chat/send`
        const headers = { 'x-auth-token': user.token }
        const data = {
          id_conversation: store.state.selectedConvo,
          id_from: user.id,
          id_to: props.toId,
          message: msg.value
        }
        const result = await axios.post(url, data, { headers })
        if (result?.data?.status === 'success') {
          msg.value = ''
          store.dispatch('updateConvos', data)
          socket.emit('chat', data)
        }
      } catch (err) {
        console.error('err sendMsg in frontend/MessengerForm.vue ===> ', err)
      }
    }
  } else {
    msg.value = ''
  }
}
</script>

<style>
.q-field--filled.q-field--dense input {
  margin-top: 5 !important;
}

.send_msg > .q-field__control > .q-field__append > textarea {
  resize: none !important;
  overflow-y: none !important;
  margin-top: 5px;
}
.custom-q-input {
  position: fixed;
  bottom: 140px;
  left: 24%;
  right: 10%;
  z-index: 10;
  border-radius: 10px;
  padding: 10px;
  border: 5% solid white !important;
  background: white;
}
</style>
