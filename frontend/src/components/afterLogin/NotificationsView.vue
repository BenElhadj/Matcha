<template>
  <q-layout>
    <q-page padding>
      <h1 class="q-pb-md" style="margin-top: -10px; text-align: center">Notifications</h1>
      <div class="notif-list-outer">
        <NotifFilterTabs>
          <template #all>
            <q-infinite-scroll @load="onLoadMore" :offset="300">
              <div class="notif-list">
                <template v-for="(entry, i) in notifs" :key="entry.id || i">
                  <NotifTooltip
                    :notif="entry"
                    :avatar-src="getNotifProfileSrc(entry)"
                    @click="openNotification(entry)"
                  />
                </template>
              </div>
              <div v-if="!hasMore && notifs.length" class="end-history">
                <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
                <div class="text-subtitle1">
                  <span v-if="notifs.length === 1">First notification — no previous history.</span>
                  <span v-else>You’ve reached the start of your notification history.</span>
                </div>
              </div>
              <div v-else-if="!hasMore && !notifs.length" class="end-history">
                <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
                <div class="text-subtitle1">No notifications yet.</div>
              </div>
              <template #loading>
                <div class="q-my-md flex items-center justify-center">
                  <LoaderView />
                </div>
              </template>
            </q-infinite-scroll>
          </template>
          <template #likes>
            <q-infinite-scroll @load="onLoadMore" :offset="300">
              <div class="notif-list">
                <template v-for="(entry, i) in notifsLikes" :key="entry.id || i">
                  <NotifTooltip
                    :notif="entry"
                    :avatar-src="getNotifProfileSrc(entry)"
                    @click="openNotification(entry)"
                  />
                </template>
              </div>
            </q-infinite-scroll>
          </template>
          <template #views>
            <q-infinite-scroll @load="onLoadMore" :offset="300">
              <div class="notif-list">
                <template v-for="(entry, i) in notifsViews" :key="entry.id || i">
                  <NotifTooltip
                    :notif="entry"
                    :avatar-src="getNotifProfileSrc(entry)"
                    @click="openNotification(entry)"
                  />
                </template>
              </div>
            </q-infinite-scroll>
          </template>
          <template #block>
            <q-infinite-scroll @load="onLoadMore" :offset="300">
              <div class="notif-list">
                <template v-for="(entry, i) in notifsBlock" :key="entry.id || i">
                  <NotifTooltip
                    :notif="entry"
                    :avatar-src="getNotifProfileSrc(entry)"
                    @click="openNotification(entry)"
                  />
                </template>
              </div>
            </q-infinite-scroll>
          </template>
        </NotifFilterTabs>
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
import NotifFilterTabs from './NotifFilterTabs.vue'
import NotifTooltip from './NotifTooltip.vue'
import moment from 'moment'
import { getSocket } from '@/boot/socketClient'
import LoaderView from '@/views/LoaderView.vue'

const store = useStore()
const router = useRouter()
const page = ref(1)
const limit = ref(15)
const hasMore = ref(true)
const isLoading = ref(false)
// Utiliser les getters pour récupérer le vrai user (fusion auth/user)
const currentUser = computed(() => store.getters.user)
// Récupérer la liste des notifications depuis les getters (root state)
const notif = computed(() => store.getters.notif)
// Garder l'ordre tel que renvoyé par le store (pagination + append non saccadé)
const notifs = computed(() => (Array.isArray(notif.value) ? notif.value : []))
// Filtres par type
const likeTypes = [
  'like',
  'like_back',
  'unlike',
  'you_like',
  'he_like',
  'you_like_back',
  'he_like_back',
  'you_unlike',
  'he_unlike'
]
const viewTypes = ['visit', 'you_visit', 'he_visit']
const blockTypes = ['block', 'you_block', 'he_block', 'signal', 'report']
const notifsLikes = computed(() => notifs.value.filter((n) => likeTypes.includes(n.type)))
const notifsViews = computed(() => notifs.value.filter((n) => viewTypes.includes(n.type)))
const notifsBlock = computed(() => notifs.value.filter((n) => blockTypes.includes(n.type)))
const { fromNow, formatTime, getNotifMsg, getNotifIcon } = utility

// Resolve an image value (string/object) into a usable src
const base = import.meta.env.BASE_URL || '/'
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const resolveImg = (img) =>
  utility.getImageSrc
    ? utility.getImageSrc(img, utility.getCachedDefault?.('profile') || defaultProfileTxt)
    : utility.getFullPath(img)

// Use global avatars store (id -> optimized src)

const getNotifProfileSrc = (entry) => {
  try {
    const id = entry?.id_from
    const cached = id ? store.state?.avatars?.byId?.[id] || '' : ''
    return cached || resolveImg(entry?.profile_image)
  } catch (_) {
    return resolveImg(entry?.profile_image)
  }
}

const loadMore = async () => {
  page.value += 1
  const items = await store.dispatch('getNotifPage', { limit: limit.value, page: page.value })
  if (Array.isArray(items) && items.length) {
    // Prefetch avatars for new batch to avoid image jank
    try {
      const ids = Array.from(new Set(items.map((n) => n && n.id_from).filter(Boolean)))
      for (const id of ids) {
        const entry = items.find((n) => n && n.id_from === id)
        await store.dispatch('ensureAvatar', { id, imageHint: entry?.profile_image })
      }
    } catch (_) {}
  }
  if (!Array.isArray(items) || items.length < limit.value) hasMore.value = false
}

// Compatibilité avec l'ancien template qui utilisait `increaseLimit`
// On délègue simplement à la nouvelle pagination côté serveur
const increaseLimit = () => loadMore()

// Infinite scroll loader hook
const onLoadMore = async (_index, done) => {
  if (isLoading.value || !hasMore.value) {
    done(true)
    return
  }
  isLoading.value = true
  try {
    await loadMore()
    done(!hasMore.value)
  } catch (_) {
    done(false)
  } finally {
    isLoading.value = false
  }
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
        // Soft-refresh top notifications without resetting appended pages
        try {
          const fresh = await utility.syncNotif({
            limit: limit.value,
            page: 1,
            mode: 'all',
            includeBlocked: 1
          })
          if (Array.isArray(fresh) && fresh.length) {
            store.commit('appendNotif', fresh)
            if (currentUser.value?.id)
              await store.dispatch('seenNotif', { id: currentUser.value.id })
            // Prefetch avatars for new heads
            const ids = Array.from(new Set(fresh.map((n) => n && n.id_from).filter(Boolean)))
            for (const id of ids) {
              const entry = fresh.find((n) => n && n.id_from === id)
              await store.dispatch('ensureAvatar', { id, imageHint: entry?.profile_image })
            }
          }
        } catch (_) {}
      })
    }
  } catch (_) {}
})

// Supprimer le rafraîchissement périodique qui cassait la pagination et causait des lags.
let refreshTimer = null

// Ensure avatars are cached globally for all senders
const prefetchNotifProfilePhotos = async () => {
  const arr = Array.isArray(notifs.value) ? notifs.value : []
  const ids = Array.from(new Set(arr.map((n) => n && n.id_from).filter(Boolean)))
  for (const id of ids) {
    const entry = arr.find((n) => n && n.id_from === id)
    try {
      await store.dispatch('ensureAvatar', { id, imageHint: entry?.profile_image })
    } catch (_) {}
  }
}
watch(
  () => notifs.value,
  () => {
    prefetchNotifProfilePhotos()
  },
  { deep: true, immediate: true }
)

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
.notif-list-outer {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.notif-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 420px;
  margin: 0 auto;
}
.end-history {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 12px 34px;
  opacity: 0.9;
  font-family: 'Elliane';
  color: black;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.9), 0 0 4px rgba(255, 255, 255, 0.85),
    0 0 6px rgba(255, 255, 255, 0.55), 0 0 8px rgba(255, 255, 255, 0.35);
}
</style>
