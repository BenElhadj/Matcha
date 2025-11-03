<template>
  <div class="q-pa-md" style="max-width: 280px">
    <q-list style="background-color: WhiteSmoke">
      <q-item>
        <q-item-section>Discussions</q-item-section>
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
        :class="{ 'selected-convo': convo.id_conversation === selectedConvoId }"
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
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import utility from '@/utility.js'
import axios from 'axios'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useStore, mapActions } from 'vuex'
import moment from 'moment'

const store = useStore()
const convos = computed(() => store.state.convos)
const online = computed(() => store.state.online)
const notif = computed(() => store.state.notif)
const typingSec = computed(() => store.state.typingSec)
const convosStatus = ref([])
const lastSeen = ref([])
const updateTimer = ref(null)
const connectedUsers = computed(() => store.state.connectedUsers)
// Selected conversation id from store (number)
const selectedConvoId = computed(() => store.state.selectedConvo)
// Unread counts per conversation (received & not opened)
const unreadCountsByConv = ref({})

// Avatar resolution
const base = import.meta.env.BASE_URL || '/'
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const profilePhotosById = ref({})

const fetchUserProfileImage = async (id) => {
  try {
    const token = localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const url = `${import.meta.env.VITE_APP_API_URL}/api/users/show/${id}`
    const res = await axios.get(url, { headers })
    const images = Array.isArray(res.data?.images) ? res.data.images : []
    const profileImg =
      images.find((img) => img && (img.profile === 1 || img.profile === true)) || images[0]
    if (!profileImg) return ''
    const fallback = utility.getCachedDefault?.('profile') || defaultProfileTxt
    const src = utility.getImageSrc
      ? utility.getImageSrc(profileImg, fallback)
      : utility.getFullPath
      ? utility.getFullPath(profileImg?.name || profileImg?.link || profileImg?.data || '')
      : fallback
    return src || ''
  } catch (_) {
    return ''
  }
}

const getConvoAvatar = (convo) => {
  try {
    const id = convo?.user_id
    const cached = id ? profilePhotosById.value[id] : ''
    if (cached) return cached
    // fallback to whatever the convo carries
    return utility.getImageSrc
      ? utility.getImageSrc(
          convo?.profile_image,
          utility.getCachedDefault?.('profile') || defaultProfileTxt
        )
      : utility.getFullPath
      ? utility.getFullPath(convo?.profile_image)
      : defaultProfileTxt
  } catch (_) {
    return defaultProfileTxt
  }
}

const syncConvo = async (convo) => {
  try {
    // Mark as read on server so counters drop
    const token = localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const url = `${import.meta.env.VITE_APP_API_URL}/api/chat/update`
    await axios.post(url, { id: convo?.id_conversation }, { headers })
  } catch (_) {}
  // Optimistic local update
  if (convo?.id_conversation) {
    const map = { ...unreadCountsByConv.value }
    map[convo.id_conversation] = 0
    unreadCountsByConv.value = map
  }
  store.dispatch('syncConvo', convo)
}

// Unread received messages count for this conversation
const unRead = (convo) => unreadCountsByConv.value[convo?.id_conversation] || 0

const notTyping = (convo) => {
  if (typingSec.value.status) {
    const conv = typingSec.value.convos.find((cur) => cur.id_conversation === convo.id_conversation)
    return !conv
  }
  return true
}

function updateConnectedUsers() {
  utility
    .getConnectedUsers()
    .then((data) => {
      const connectedUserIds = data
      convos.value.forEach((cur) => {
        if (connectedUserIds.includes(cur.user_id.toString())) {
          lastSeen.value[cur.user_id] = 'online'
          convosStatus.value[cur.user_id] = true
        } else {
          lastSeen.value[cur.user_id] = moment(cur.status).utc().fromNow()
          convosStatus.value[cur.user_id] = false
        }
      })
    })
    .catch((error) => {
      console.error('Erreur lors de la récupération des données :', error)
    })
}

onMounted(async () => {
  // Fetch initial unread counts
  try {
    const token = localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const url = `${import.meta.env.VITE_APP_API_URL}/api/chat/notSeen`
    const res = await axios.get(url, { headers })
    const arr = Array.isArray(res?.data?.data) ? res.data.data : []
    const map = {}
    for (const r of arr) {
      if (r && r.id_conversation) map[r.id_conversation] = Number(r.count) || 0
    }
    unreadCountsByConv.value = map
  } catch (_) {}

  // no-op: selection is driven by store.selectedConvoId
  // Prefetch avatars for visible convos
  try {
    const ids = Array.from(new Set(sortedConvos.value.map((c) => c && c.user_id).filter(Boolean)))
    for (const id of ids) {
      if (!profilePhotosById.value[id]) {
        const src = await fetchUserProfileImage(id)
        if (src) profilePhotosById.value = { ...profilePhotosById.value, [id]: src }
      }
    }
  } catch (_) {}
})

watch([online, convos], updateConnectedUsers, { immediate: true })
// Also prefetch when convos change
watch(
  () => convos.value,
  async () => {
    try {
      const ids = Array.from(new Set(sortedConvos.value.map((c) => c && c.user_id).filter(Boolean)))
      for (const id of ids) {
        if (!profilePhotosById.value[id]) {
          const src = await fetchUserProfileImage(id)
          if (src) profilePhotosById.value = { ...profilePhotosById.value, [id]: src }
        }
      }
    } catch (_) {}
  },
  { deep: true }
)

const sortByStatusAndDate = (a, b) => {
  const aOnline = lastSeen.value[a.user_id] === 'online'
  const bOnline = lastSeen.value[b.user_id] === 'online'
  if (aOnline !== bOnline) return aOnline ? -1 : 1
  const da = new Date(a.last_update || a.created_at || 0)
  const db = new Date(b.last_update || b.created_at || 0)
  return db - da
}

const sortedConvos = computed(() => {
  // unique by other user
  const uniqueConvos = Array.from(new Set(convos.value.map((convo) => convo.user_id))).map(
    (user_id) => convos.value.find((convo) => convo.user_id === user_id)
  )
  // base sort: online first, then by recency
  let arr = uniqueConvos.sort(sortByStatusAndDate)
  // pin selected conversation to the very top if present
  const selId = selectedConvoId.value
  if (selId) {
    const idx = arr.findIndex((c) => c && c.id_conversation === selId)
    if (idx > 0) {
      const [sel] = arr.splice(idx, 1)
      arr.unshift(sel)
    }
  }
  return arr
})

const presenceClass = (convo) => (lastSeen.value[convo.user_id] === 'online' ? 'online' : 'offline')

function refreshMethods() {
  updateConnectedUsers()
  // Periodically refresh unread counts
  ;(async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { 'x-auth-token': token }
      const url = `${import.meta.env.VITE_APP_API_URL}/api/chat/notSeen`
      const res = await axios.get(url, { headers })
      const arr = Array.isArray(res?.data?.data) ? res.data.data : []
      const map = {}
      for (const r of arr) {
        if (r && r.id_conversation) map[r.id_conversation] = Number(r.count) || 0
      }
      unreadCountsByConv.value = map
    } catch (_) {}
  })()
  // selection highlight is reactive via selectedConvoId
}

const refreshInterval = setInterval(refreshMethods, 2000)

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
