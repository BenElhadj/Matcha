<template>
  <div class="q-pa-md" style="max-width: 350px">
    <q-list style="background-color: WhiteSmoke">

      <q-item>
        <q-item-section>Recent Discussions</q-item-section>
      </q-item>
      <q-item v-if="sortedConvos.length == 0" style="align-items: center; justify-content: center; display: flex;">
        <q-item-section>No conversations</q-item-section>
      </q-item>

      <q-item clickable v-ripple v-for="(convo) in sortedConvos"
        :key="convo.id_conversation" @click="syncConvo(convo)"
        :class="{ 'selected-convo': convo === selectedConvo }">

        <q-item-section :value="!!unRead(convo)" overlap color="primary" class="mx-2" left>
            <template v-slot:badge>
              <span>{{ unRead(convo) }}</span>
            </template>
            <div class="avatar-presence">
              <q-avatar>
                <img :src="entryImg(convo.profile_image)">
                <span :class="['presence-dot', presenceClassConvo(convo)]"></span>
              </q-avatar>
            </div>
        </q-item-section>
        
        <q-item-section class="hidden-sm-and-down">
          <q-item-label class="truncate-text">{{ convo.username }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-tooltip bottom class="status_container">
            <span>{{ lastSeen[convo.user_id] }}</span>
          </q-tooltip>
          <div v-if="!notTyping(convo)" class="typing">
            <q-spinner-dots size="2rem" />
          </div>
        </q-item-section>

      </q-item>

    </q-list>
  </div>
</template>

<script setup>
import utility from '@/utility.js'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import moment from 'moment'

const store = useStore()
const convos = computed(() => store.state.convos)
const online = computed(() => store.state.online)
const notif = computed(() => store.state.notif)
const typingSec = computed(() => store.state.typingSec)
const convosStatus = ref([])
const lastSeen = ref([])
const connectedUsers = computed(() => store.state.connectedUsers)
const selectedConvo = ref(null)

// Unified image resolver to support filenames, external URLs, data URIs and plain base64
const base = import.meta.env.BASE_URL || '/'
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const entryImg = (img) =>
  utility.getImageSrc
    ? utility.getImageSrc(img, utility.getCachedDefault?.('profile') || defaultProfileTxt)
    : utility.getFullPath
    ? utility.getFullPath(img)
    : defaultProfileTxt

const presenceClassConvo = (convo) => {
  try {
    const id = convo && (convo.user_id || convo.id_from)
    if (id === null || id === undefined) return 'offline'
    const list = Array.isArray(connectedUsers.value) ? connectedUsers.value : []
    const set = new Set(list.map((x) => String(x)))
    return set.has(String(id)) ? 'online' : 'offline'
  } catch (_) {
    return 'offline'
  }
}

const syncConvo = (convo) => {
  store.dispatch('syncConvo', convo)
  selectedConvo.value = convo
}

const unRead = (convo) => {
  if (notif.value.length) {
    let sum = 0
    notif.value.forEach(cur => {
      if (cur.type === 'chat' && cur.id_conversation === convo.id_conversation) {
        sum++
      }
    })
    return sum
  }
}

const notTyping = (convo) => {
  if (typingSec.value.status) {
    const conv = typingSec.value.convos.find(cur => cur.id_conversation === convo.id_conversation)
    return !conv
  }
  return true
}

function updateConnectedUsers() {
  try {
    const list = Array.isArray(connectedUsers.value) ? connectedUsers.value : []
    const set = new Set(list.map((x) => String(x)))
    convos.value.forEach((cur) => {
      const uid = String(cur.user_id)
      if (set.has(uid)) {
        lastSeen.value[cur.user_id] = 'online'
        convosStatus.value[cur.user_id] = true
      } else {
        // Fallback to relative time from convo.status if available
        lastSeen.value[cur.user_id] = cur?.status ? moment(cur.status).utc().fromNow() : 'offline'
        convosStatus.value[cur.user_id] = false
      }
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la présence :', error)
  }
}

onMounted(async () => {
  const selected = store.state.selectedConvo
  if (selected) {
    sortedConvos.value.forEach((convo) => {
      if (
        (selected.id_conversation && convo.id_conversation === selected.id_conversation) ||
        (selected.user_id && convo.user_id === selected.user_id)
      ) {
        selectedConvo.value = convo
      }
    })
  }
})

watch([online, convos, connectedUsers], updateConnectedUsers, { immediate: true })

const sortByLastSeen = (a, b) => {
  if (lastSeen.value[a.user_id] === 'online' && lastSeen.value[b.user_id] !== 'online') {
    return -1
  } else if (lastSeen.value[a.user_id] !== 'online' && lastSeen.value[b.user_id] === 'online') {
    return 1
  } else {
    return 0
  }
}

const sortedConvos = computed(() => {
  const uniqueConvos = Array.from(new Set(convos.value.map(convo => convo.user_id)))
    .map(user_id => convos.value.find(convo => convo.user_id === user_id))

  return uniqueConvos.sort(sortByLastSeen)
})

function refreshMethods() {
  updateConnectedUsers()
  sortedConvos.value.forEach(convo => {
    if (convo.id_conversation === store.state.selectedConvo.id_conversation) {
      selectedConvo.value = convo
    }
  })
}

// Reduce refresh cadence to limit background work
const refreshInterval = setInterval(refreshMethods, 5000)

onBeforeUnmount(() => {
  clearInterval(refreshInterval)
})

</script>

<style scoped>
.avatar-presence {
  position: relative;
  display: inline-block;
}
.avatar-presence .q-avatar {
  position: relative;
  width: 44px;
  height: 44px;
}
.presence-dot {
  position: absolute;
  bottom: 0px;
  right: 0px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}
.presence-dot.online { background: #21ba45; }
.presence-dot.offline { background: #9e9e9e; }
.typing_point {
  background: var(--color-primary);
}
.selected-convo {
  background-color: silver;
}
.truncate-text {
  min-width: 40px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Responsive sizes */
@media (max-width: 600px) {
  .avatar-presence .q-avatar { width: 36px; height: 36px; }
  .presence-dot { width: 10px; height: 10px; }
}
@media (min-width: 1024px) {
  .avatar-presence .q-avatar { width: 48px; height: 48px; }
  .presence-dot { width: 14px; height: 14px; }
}
</style>
