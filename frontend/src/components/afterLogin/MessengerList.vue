<template>
  <div class="q-pa-md" style="max-width: 280px">
    <q-list style="background-color: WhiteSmoke">
      <q-item>
        <q-item-section style="padding-left: -5px; !important">Discussions</q-item-section>
      </q-item>
      <q-item
        v-if="sortedConvos.length == 0"
        style="align-items: center; justify-content: center; display: flex"
      >
        <q-item-section>No conversations</q-item-section>
      </q-item>

      <q-item
        clickable
        v-ripple
        v-for="convo in sortedConvos"
        :key="convo.id_conversation"
        @click="syncConvo(convo)"
        :class="{ 'selected-convo': convo === selectedConvo }"
      >
        <q-item-section :value="!!unRead(convo)" overlap color="primary" class="mr-1" left>
          <template v-slot:badge>
            <span>{{ unRead(convo) }}</span>
          </template>
          <q-avatar class="avatar-presence" size="50px">
            <img :src="getConvoAvatar(convo)" />
            <span :class="['presence-dot', presenceClass(convo)]"></span>
          </q-avatar>
        </q-item-section>

        <q-item-section class="hidden-md-and-down name-section">
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
import axios from 'axios'

const store = useStore()
const convos = computed(() => store.state.convos)
const online = computed(() => store.state.online)
const notif = computed(() => store.state.notif)
const typingSec = computed(() => store.state.typingSec)
const convosStatus = ref([])
const lastSeen = ref([])
const connectedUsers = computed(() => store.state.connectedUsers)
const selectedConvo = ref(null)

// Avatar rendering handled by AppAvatar (resolves URLs, filenames, data URIs, base64)
// If the convo item doesn't include a usable profile_image, prefetch by user id (same as Navbar)
const base = import.meta.env.BASE_URL || '/'
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const resolveImg = (img) =>
  utility.getImageSrc
    ? utility.getImageSrc(img, utility.getCachedDefault?.('profile') || defaultProfileTxt)
    : utility.getFullPath(img)
// Global avatars module replaces local cache logic

const getConvoProfileSrc = (convo) => {
  try {
    const id = convo?.user_id
    const cached = id ? store.state?.avatars?.byId?.[id] || '' : ''
    return cached || resolveImg(convo?.profile_image)
  } catch (_) {
    return resolveImg(convo?.profile_image)
  }
}

// Simple wrapper to align with the desired template API
const getConvoAvatar = (convo) => getConvoProfileSrc(convo)

// Prefetch images for visible convos (unique by user_id)
// NOTE: placed after sortedConvos is defined to avoid TDZ errors

const syncConvo = (convo) => {
  store.dispatch('syncConvo', convo)
  selectedConvo.value = convo
}

const unRead = (convo) => {
  if (notif.value.length) {
    let sum = 0
    notif.value.forEach((cur) => {
      if (cur.type === 'chat' && cur.id_conversation === convo.id_conversation) {
        sum++
      }
    })
    return sum
  }
}

const notTyping = (convo) => {
  if (typingSec.value.status) {
    const conv = typingSec.value.convos.find((cur) => cur.id_conversation === convo.id_conversation)
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
  const uniqueConvos = Array.from(new Set(convos.value.map((convo) => convo.user_id))).map(
    (user_id) => convos.value.find((convo) => convo.user_id === user_id)
  )

  return uniqueConvos.sort(sortByLastSeen)
})

// Now that sortedConvos exists, watch it to prefetch missing avatars
watch(
  () => sortedConvos.value,
  async (list) => {
    const ids = Array.from(
      new Set((Array.isArray(list) ? list : []).map((c) => c?.user_id).filter(Boolean))
    )
    for (const id of ids) {
      try {
        const item = (Array.isArray(list) ? list : []).find((c) => c?.user_id === id)
        await store.dispatch('ensureAvatar', { id, imageHint: item?.profile_image })
      } catch (_) {}
    }
  },
  { deep: true, immediate: true }
)

// Presence class for the avatar overlay
const presenceClass = (convo) =>
  lastSeen.value[convo.user_id] === 'online' ? 'online' : 'offline'

function refreshMethods() {
  updateConnectedUsers()
  sortedConvos.value.forEach((convo) => {
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
.typing_point {
  background: var(--color-primary);
}
.selected-convo {
  background-color: #e8f0ff; /* light highlight */
  border-left: 4px solid var(--q-primary);
}
.selected-convo .truncate-text {
  font-weight: 700;
}
.q-item:hover {
  background-color: #f6f9ff;
}
.truncate-text {
  min-width: 40px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* Bring the name closer to the avatar */
.name-section {
  margin-left: 4px;
}
/* Presence dot overlay like Navbar */
.avatar-presence {
  position: relative;
  display: inline-block;
}
.presence-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  z-index: 1;
}
.presence-dot.online {
  background: #21ba45; /* green */
}
.presence-dot.offline {
  background: #9e9e9e; /* grey */
}
</style>
