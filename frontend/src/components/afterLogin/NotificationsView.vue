<template>
  <q-layout>
    <q-page padding>
      <h1 class="q-pb-md" style="margin-top: -10px; text-align: center">Notifications</h1>
      <div v-for="(entry, i) in notifs" :key="i" class="q-my-md">
        <div class="row justify-center items-start q-pa-md">
          <div class="col-3 text-center">
            <q-tooltip anchor="bottom middle" self="top middle">
              <template #activator="{ on }">
                <strong class="mt-2 d-block grey--text" v-on="on">{{ fromNow(entry.date) }}</strong>
              </template>
              <span>{{ formatTime(entry.date) }}</span>
            </q-tooltip>
          </div>
          <div style="font-family: 'Elliane' !important" class="col-9">
            <q-card class="notif_bubble" clickable @click="openNotification(entry)">
              <q-card-section>
                <div class="row items-center">
                  <div class="avatar-presence">
                    <q-avatar>
                      <img :src="entryImg(entry.profile_image)" :alt="entry.username" />
                    </q-avatar>
                    <span :class="['presence-dot', presenceClass(entry)]"></span>
                  </div>
                  <div class="q-ml-md">
                    <span class="text-h6 text-weight-bold timeline_link">{{ entry.username }}</span>
                    <q-icon small style="font-size: 16px !important" class="mr-2 q-ml-xl">
                      <span :class="getNotifIcon(entry.type)"></span>&nbsp;
                    </q-icon>
                    <div class="subtitle">
                      <span class="text-weight-bold">{{ getNotifMsg(entry) }}</span>
                      <span class="text-weight-bold">{{
                        ' on ' + moment(entry.date).format('D MMMM, YYYY, h:mm A')
                      }}</span>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
      <div class="my-4 q-mx-auto q-mb-md flex justify-center">
        <q-btn
          v-if="moreToLoad"
          block
          color="primary"
          class="my-4"
          style="text-align: center !important"
          @click="increaseLimit"
        >
          Show more
        </q-btn>
      </div>
    </q-page>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import axios from 'axios'
import utility from '@/utility.js'
import moment from 'moment'
import { getSocket } from '@/boot/socketClient'

const store = useStore()
const router = useRouter()
const page = ref(1)
const limit = ref(15)
const hasMore = ref(true)
// Utiliser les getters pour récupérer le vrai user (fusion auth/user)
const currentUser = computed(() => store.getters.user)
// Récupérer la liste des notifications depuis les getters (root state)
const notif = computed(() => store.getters.notif)
// Afficher TOUTES les notifications (y compris 'chat'), triées décroissant par date
const notifs = computed(() => {
  const arr = Array.isArray(notif.value) ? notif.value : []
  return [...arr].sort((a, b) => new Date(b.date) - new Date(a.date))
})
const { fromNow, formatTime, getNotifMsg, getNotifIcon } = utility
const base = import.meta.env.BASE_URL || '/'
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const entryImg = (img) =>
  utility.getImageSrc
    ? utility.getImageSrc(img, utility.getCachedDefault?.('profile') || defaultProfileTxt)
    : utility.getFullPath
    ? utility.getFullPath(img)
    : defaultProfileTxt

// Presence dot based on connected users list in store
const connectedUsers = computed(() => store.state.connectedUsers || [])
const presenceClass = (entry) => {
  try {
    const id = entry && entry.id_from
    if (id === null || id === undefined) return 'offline'
    const set = new Set((Array.isArray(connectedUsers.value) ? connectedUsers.value : []).map((x) => String(x)))
    return set.has(String(id)) ? 'online' : 'offline'
  } catch (_) {
    return 'offline'
  }
}

const loadMore = async () => {
  page.value += 1
  const items = await store.dispatch('getNotifPage', { limit: limit.value, page: page.value })
  if (!Array.isArray(items) || items.length < limit.value) hasMore.value = false
}

// Compatibilité avec l'ancien template qui utilisait `increaseLimit`
// On délègue simplement à la nouvelle pagination côté serveur
const increaseLimit = () => {
  return loadMore()
}

// Quand on utilise DISTINCT ON côté backend, la pagination renvoie d'autres expéditeurs
// On ne peut pas savoir la fin côté client sans total; on garde le bouton tant que la page renvoie des items
const moreToLoad = computed(() => hasMore.value)

const logout = async (userId) => {
  try {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_APP_API_URL}/api/auth/logout`
    const headers = { 'x-auth-token': token }
    await axios.get(url, { headers })
  } catch (err) {
    console.error('err logout in frontend/NotificationsView.vue 2 ===> ', err)
  } finally {
    store.dispatch('logout')
  }
}

watch(
  currentUser,
  async (newUser) => {
    const token = newUser?.token || localStorage.getItem('token')
    if (token) {
      try {
        const url = `${import.meta.env.VITE_APP_API_URL}/api/auth/isloggedin`
        const headers = { 'x-auth-token': token }
        const res = await axios.get(url, { headers })
        if (!res.data.msg) return
      } catch (err) {
        console.error('err watch user in frontend/NotificationsView.vue ===> ', err)
      }
    }
    if (newUser?.id) await logout(newUser.id)
  },
  { immediate: true }
)

onMounted(async () => {
  // Récupère la page 1 au montage puis marque tout comme lu
  const items = await store.dispatch('getNotifPage', { limit: limit.value, page: page.value })
  if (!Array.isArray(items) || items.length < limit.value) hasMore.value = false
  if (currentUser.value?.id) store.dispatch('seenNotif', { id: currentUser.value.id })
  // Si la socket est active, toute nouvelle notif pendant que la page est ouverte sera aussitôt marquée lue
  try {
    const s = getSocket && getSocket()
    if (s) {
      s.on('notif:new', async () => {
        await store.dispatch('getNotifPage', { limit: limit.value, page: 1 })
        if (currentUser.value?.id) await store.dispatch('seenNotif', { id: currentUser.value.id })
      })
    }
  } catch (_) {}
})

// Fallback: si le push temps réel ne passe pas, on rafraîchit périodiquement
let refreshTimer = null
onMounted(() => {
  refreshTimer = setInterval(() => {
    store.dispatch('getNotifPage', { limit: limit.value, page: 1 }).then(() => {
      if (currentUser.value?.id) store.dispatch('seenNotif', { id: currentUser.value.id })
    })
  }, 4000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
  try {
    const s = getSocket && getSocket()
    if (s && s.off) s.off('notif:new')
  } catch (_) {}
})

const openNotification = async (entry) => {
  try {
    const senderId = entry.id_from ?? entry.from
    if (!senderId) return
    await store.dispatch('seenNotifFrom', { id_from: senderId, id_to: currentUser.value?.id })
    router.push(`/user/${senderId}`)
  } catch (e) {
    console.error('openNotification error:', e)
  }
}
</script>

<style scoped>
.avatar-presence {
  position: relative;
  display: inline-block;
}
.presence-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}
.presence-dot.online { background: #21ba45; }
.presence-dot.offline { background: #9e9e9e; }
.timeline_link {
  text-decoration: none;
}

.bubble.grey {
  border-radius: 5rem;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease-out;
}

.bubble.grey:hover {
  border: 1px solid rgba(0, 0, 0, 0.25) !important;
}

.notif_bubble {
  margin-top: -0.6rem;
}
</style>
