<template>
  <q-layout>
    <q-page v-if="loaded" class="messenger pa-3">
      <div class="parent row">
        <div class="left-scroll col-md-3 col-sm-1">
          <div class="left">
            <MessengerList />
          </div>
        </div>
        <div class="right-scroll col-md-9 col-sm-11">
          <div class="chat_layout column justify-start">
            <div class="top_chat col-xs-9">
              <MessengerChat ref="chat" />
            </div>
            <div class="bottom col-xs-3">
              <MessengerForm :to-id="getToId()" @msgSent="messageSent" />
            </div>
          </div>
        </div>
      </div>
    </q-page>
    <LoaderView v-else />
  </q-layout>
</template>

<script setup>
import { onBeforeUnmount, ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { API_URL } from '@/utility.js'
import { useRouter } from 'vue-router'
import axios from 'axios'
import LoaderView from '@/views/LoaderView.vue'
import MessengerList from '@/components/afterLogin/MessengerList.vue'
import MessengerChat from '@/components/afterLogin/MessengerChat.vue'
import MessengerForm from '@/components/afterLogin/MessengerForm.vue'

const store = useStore()
const router = useRouter()
const loaded = ref(false)
// avoid recursive logout loops triggered by watchers reacting to state resets
const wasLoggedOut = ref(false)
const user = computed(() => store.state.user)
const convos = computed(() => store.state.convos)
const selectedConvo = computed(() => store.state.selectedConvo)
const data = ref(null)

const getToId = () => {
  for (const cur of convos.value) {
    if (cur.id_conversation === selectedConvo.value) {
      return cur.user_id
    }
  }
}

const messageSent = (msg) => {
  store.dispatch('updateConvosOrder', msg.id_conversation)
}

watch(
  user,
  async (newUser) => {
    const token = newUser?.token || localStorage.getItem('token')
    const isConnected = !!store.getters.status
    // If connected, render quickly and validate in background
    if (token && isConnected) {
      loaded.value = true
      try {
        const url = `${API_URL}/api/auth/isloggedin`
        const headers = { 'x-auth-token': token }
        const res = await axios.get(url, { headers })
        data.value = res.data
        if (res?.data?.msg && store.getters.status) {
          // token invalid -> perform a single logout then redirect
          try {
            await store.dispatch('logout', newUser?.id)
          } catch (_) {}
          loaded.value = false
          wasLoggedOut.value = true
          router.push('/login')
        }
      } catch (err) {
        // Non-fatal; keep UI responsive
        console.error('err watch user in frontend/MessengerView.vue ===> ', err)
      }
      return
    }
    // If already logged out, just redirect once without dispatching logout again
    if (!isConnected && !token) {
      if (!wasLoggedOut.value) {
        wasLoggedOut.value = true
        loaded.value = false
        router.push('/login')
      }
      return
    }
  },
  { immediate: true }
)

watch(
  convos,
  (newConvos) => {
    if (newConvos.length && !selectedConvo.value) {
      store.dispatch('syncConvo', newConvos[0])
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  store.dispatch('syncConvo', null)
})
</script>

<style scoped>
.messenger {
  height: calc(100vh - 4.75rem);
  /* prevent chat from wrapping under the list: enforce a minimum content width */
  min-width: 980px;
  overflow-x: auto;
}

.left-scroll {
  height: 100%;
  overflow-y: auto;
}

.right-scroll {
  height: 100%;
  overflow-y: auto;
}

.top_chat {
  flex: 0% 20% 100% !important;
}

.top_chat::-webkit-scrollbar {
  width: 10px;
}

.top_chat::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 5px;
}

.left {
  padding: 0 !important;
  margin: 0 !important;
  max-width: 270px;
  /* allow the list content to shrink; the column itself enforces the true min */
  min-width: 0;
}

.right,
.chat_layout,
.parent {
  height: 100% !important;
}

/* keep list + chat side-by-side regardless of viewport width */
.parent.row {
  flex-wrap: nowrap !important;
}
.left-scroll {
  /* Allow shrinking down close to avatar size while preserving avatar visibility */
  flex: 0 0 clamp(92px, 18vw, 270px) !important;
  min-width: 92px;
  max-width: 270px;
}
.right-scroll {
  min-width: 640px;
}

.bottom {
  flex: 0 0 100% !important;
}

.left-scroll {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  width: clamp(92px, 18vw, 270px);
  min-width: 92px;
}

.right-scroll {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.left-scroll::-webkit-scrollbar,
.right-scroll::-webkit-scrollbar {
  width: 5px;
}

.left-scroll::-webkit-scrollbar-thumb,
.right-scroll::-webkit-scrollbar-thumb {
  background-color: transparent;
}

.left-scroll::-webkit-scrollbar-track,
.right-scroll::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
