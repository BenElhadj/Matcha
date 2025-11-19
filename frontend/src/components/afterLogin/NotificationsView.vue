<template>
  <q-layout>
    <q-page padding>
      <AlertView v-if="alert.state" :alert="alert" />
      <h1 class="q-pb-md" style="margin-top: -10px; text-align: center">Notifications</h1>
      <div class="notif-list-outer">
        <!-- Onglets de notifications -->
        <NotifFilterTabs v-model="activeTab">
          <template #all>
            <div class="notif-list">
              <template v-for="(entry, i) in notifTabs.all.items" :key="entry.id || i">
                <NotifTooltip
                  :notif="entry"
                  :avatar-src="getNotifProfileSrc(entry)"
                  @click="openNotification(entry)"
                />
              </template>
            </div>
            <div v-if="isLoadingAll" class="q-my-md flex items-center justify-center">
              <LoaderView />
            </div>
            <div v-if="!notifTabs.all.hasMore && notifTabs.all.items.length" class="end-history">
              <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
              <div class="text-subtitle1">
                <span v-if="notifTabs.all.items.length === 1"
                  >First notification — no previous history.</span
                >
                <span v-else>You've reached the start of your notification history.</span>
              </div>
            </div>
            <div
              v-else-if="!notifTabs.all.hasMore && !notifTabs.all.items.length"
              class="end-history"
            >
              <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
              <div class="text-subtitle1">No notifications yet.</div>
            </div>

          </template>

          <template #like>
            <div class="notif-list">
              <template v-for="(entry, i) in notifTabs.like.items" :key="entry.id || i">
                <NotifTooltip
                  :notif="entry"
                  :avatar-src="getNotifProfileSrc(entry)"
                  @click="openNotification(entry)"
                />
              </template>
            </div>
            <div v-if="isLoadingLike" class="q-my-md flex items-center justify-center">
              <LoaderView />
            </div>
            <div
              v-if="!notifTabs.like.hasMore && !notifTabs.like.items.length"
              class="end-history"
            >
              <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
              <div class="text-subtitle1">Aucune notification de like.</div>
            </div>
          </template>

          <template #visit>
            <div class="notif-list">
              <template v-for="(entry, i) in notifTabs.visit.items" :key="entry.id || i">
                <NotifTooltip
                  :notif="entry"
                  :avatar-src="getNotifProfileSrc(entry)"
                  @click="openNotification(entry)"
                />
              </template>
            </div>
            <div v-if="isLoadingVisit" class="q-my-md flex items-center justify-center">
              <LoaderView />
            </div>
            <div
              v-if="!notifTabs.visit.hasMore && !notifTabs.visit.items.length"
              class="end-history"
            >
              <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
              <div class="text-subtitle1">Aucune notification de visite.</div>
            </div>
          </template>

          <template #block>
            <div class="notif-list">
              <template v-for="(entry, i) in notifTabs.block.items" :key="entry.id || i">
                <NotifTooltip
                  :notif="entry"
                  :avatar-src="getNotifProfileSrc(entry)"
                  @click="openNotification(entry)"
                />
              </template>
            </div>
            <div v-if="isLoadingBlock" class="q-my-md flex items-center justify-center">
              <LoaderView />
            </div>
            <div
              v-if="!notifTabs.block.hasMore && !notifTabs.block.items.length"
              class="end-history"
            >
              <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
              <div class="text-subtitle1">Aucun blocage ou signalement.</div>
            </div>
          </template>
        </NotifFilterTabs>
      </div>
    </q-page>
  </q-layout>
</template>

<script setup>
import { API_URL, BASE_URL } from '@/utility.js'
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import utility from '@/utility.js'
import NotifFilterTabs from './NotifFilterTabs.vue'
import NotifTooltip from './NotifTooltip.vue'
import LoaderView from '@/views/LoaderView.vue'

const router = useRouter()
// --- Qui m'a bloqué ou signalé ---
const blockedOrReportedBy = ref([])
const loadingBlockedOrReportedBy = ref(false)
const pageBlockedOrReportedBy = ref(1)
const limitBlockedOrReportedBy = 25
const hasMoreBlockedOrReportedBy = ref(true)
// Utiliser les getters pour récupérer le vrai user (fusion auth/user)
// currentUser supprimé : on utilisera localStorage.getItem('userId') si besoin
// Supprimer le rafraîchissement périodique qui cassait la pagination et causait des lags.
let refreshTimer = null
// Quand on utilise DISTINCT ON côté backend, la pagination renvoie d'autres expéditeurs
// On ne peut pas savoir la fin côté client sans total; on garde le bouton tant que la page renvoie des items
const moreToLoad = computed(() => hasMore.value)
// Ensure avatars are cached globally for all senders

// --- Scroll natif pour notifications (comme dans ProfileHistory.vue) ---
const isLoadingAll = computed(() => notifTabs.all.loading)
const isLoadingLike = computed(() => notifTabs.like.loading)
const isLoadingVisit = computed(() => notifTabs.visit.loading)
const isLoadingBlock = computed(() => notifTabs.block.loading)

function handleScrollNotif(tab) {
  const state = notifTabs[tab]
  if (state.loading || !state.hasMore) return
  const scrollY = window.scrollY || window.pageYOffset
  const viewport = window.innerHeight
  const fullHeight = document.documentElement.scrollHeight
  if (scrollY + viewport >= fullHeight - 100) {
    onLoadMoreTab(tab, () => {})
  }
}

function globalScrollHandler() {
  // Détecte le tab actif et déclenche le scroll natif pour ce tab
  if (activeTab.value === 'all') handleScrollNotif('all')
  else if (activeTab.value === 'like') handleScrollNotif('like')
  else if (activeTab.value === 'visit') handleScrollNotif('visit')
  else if (activeTab.value === 'block') handleScrollNotif('block')
}

onMounted(() => {
  window.addEventListener('scroll', globalScrollHandler)
})
onUnmounted(() => {
  window.removeEventListener('scroll', globalScrollHandler)
})


async function fetchBlockedOrReportedBy(page = 1) {
  loadingBlockedOrReportedBy.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      blockedOrReportedBy.value = []
      hasMoreBlockedOrReportedBy.value = false
      loadingBlockedOrReportedBy.value = false
      return []
    }
    const res = await axios.get(
      `http://localhost:3000/api/users/blocked-or-reported-by?page=${page}&limit=${limitBlockedOrReportedBy}`,
      {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }
    )
    return res.data.items || []
  } catch (e) {
    return []
  } finally {
    loadingBlockedOrReportedBy.value = false
  }
}

async function onLoadMoreBlockedOrReportedBy(_index, done) {
  if (!hasMoreBlockedOrReportedBy.value) {
    done(true)
    return
  }
  const items = await fetchBlockedOrReportedBy(pageBlockedOrReportedBy.value)
  if (Array.isArray(items) && items.length) {
    blockedOrReportedBy.value.push(...items)
    pageBlockedOrReportedBy.value += 1
    if (items.length < limitBlockedOrReportedBy) hasMoreBlockedOrReportedBy.value = false
    done(false)
  } else {
    hasMoreBlockedOrReportedBy.value = false
    done(true)
  }
}

onMounted(() => {
  blockedOrReportedBy.value = []
  pageBlockedOrReportedBy.value = 1
  hasMoreBlockedOrReportedBy.value = true
  onLoadMoreBlockedOrReportedBy(0, () => {})
})

// --- Notifications Tabs State ---
const notifTabs = {
  all: reactive({ items: [], page: 1, hasMore: true, loading: false, limit: 25 }),
  like: reactive({ items: [], page: 1, hasMore: true, loading: false, limit: 25 }),
  visit: reactive({ items: [], page: 1, hasMore: true, loading: false, limit: 25 }),
  block: reactive({ items: [], page: 1, hasMore: true, loading: false, limit: 25 })
}
const activeTab = ref('all')
const notifTypeMap = { all: 'all', like: 'like', visit: 'visit', block: 'block' }
const { fromNow, formatTime, getNotifMsg, getNotifIcon } = utility

// Clean, independent loader for each tab using only syncNotif
function onLoadMoreTab(tab, done) {
  const state = notifTabs[tab]
  const safeDone = typeof done === 'function' ? done : () => {}
  // Protection: ne pas relancer si déjà loading ou plus de page
  if (!state.hasMore || state.loading) {
    safeDone(true)
    return
  }
  state.loading = true
  const currentPage = state.page
  utility
    .syncNotif({
      limit: state.limit,
      page: currentPage,
      type: notifTypeMap[tab]
    })
    .then((items) => {
      // Debug avancé : log IDs récupérés et page courante
      const fetchedIds = Array.isArray(items) ? items.map(e => e.id) : [];
      // window.console.log(`[onLoadMoreTab] tab=${tab} page=${currentPage}`);
      // window.console.log('Fetched notification IDs:', fetchedIds);
      if (Array.isArray(items) && items.length) {
        // Ajoute simplement les nouveaux items à chaque page
        state.items.push(...items)
        state.page += 1
        if (items.length < state.limit) state.hasMore = false
        safeDone(false)
      } else {
        // Si aucune donnée, on considère la pagination terminée
        state.hasMore = false
        safeDone(true)
      }
    })
    .catch((err) => {
      // Ne jamais bloquer le loader sur erreur
      window.console.error(`[onLoadMoreTab] error tab=${tab} page=${currentPage}`, err);
      state.hasMore = false
      safeDone(true)
    })
    .finally(() => {
      state.loading = false
    })
}

onMounted(() => {
  // Reset all tabs state on mount
  Object.keys(notifTabs).forEach((tab) => {
    notifTabs[tab].items = []
    notifTabs[tab].page = 1
    notifTabs[tab].hasMore = true
    notifTabs[tab].loading = false
  })
  // Preload only the first page for the active tab
  onLoadMoreTab(activeTab.value)
})

// Recharge la pagination uniquement quand on change d'onglet
watch(activeTab, (newTab, oldTab) => {
  if (notifTabs[newTab].items.length === 0 && notifTabs[newTab].hasMore) {
    onLoadMoreTab(newTab)
  }
})

// Resolve an image value (string/object) into a usable src
const base = import.meta.env.BASE_URL || '/'
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const resolveImg = (img) =>
  utility.getImageSrc
    ? utility.getImageSrc(img, utility.getCachedDefault?.('profile') || defaultProfileTxt)
    : utility.getFullPath(img)

// Nouvelle version : ne filtre ni ne transforme, laisse AppAvatar/utility gérer
const getNotifProfileSrc = (entry) => {
  let img = entry.avatar || entry.profile_image || entry.link || entry.data || ''
  if (typeof img === 'object' && img !== null) return img
  if (typeof img === 'string') {
    const s = img.trim()
    if (s.startsWith('data:image')) return s
    if (s.startsWith('/9j/') || s.startsWith('iVBOR') || s.length > 100) {
      return { link: false, data: s }
    }
  }
  return img
}

// Plus de logique de store pour charger les notifications : tout passe par onLoadMoreTab/tab state

const logout = async (userId) => {
  try {
    const token = localStorage.getItem('token')
    const url = `${API_URL}/api/auth/logout`
    const headers = { 'x-auth-token': token }
    await axios.get(url, { headers })
  } catch (err) {
    console.error('err logout in frontend/NotificationsView.vue 2 ===> ', err)
  } finally {
    store.dispatch('logout')
  }
}

// Plus de watcher sur currentUser : la logique d'auth doit être gérée globalement dans l'app

// Plus de prefetch avatars via store : AppAvatar/utility gère tout
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
  try {
    const s = getSocket && getSocket()
    if (s && s.off) s.off('notif:new')
  } catch (_) {}
})

import AlertView from '@/views/AlertView.vue'
const alert = ref({ state: false, color: '', text: '' })

const openNotification = async (entry) => {
  try {
    const senderId = entry.id_from ?? entry.from
    if (!senderId) return
    // Check if this user has blocked me (only for blockedOrReportedBy list)
    const blocked = blockedOrReportedBy.value.some(
      (u) =>
        u.user_id === senderId &&
        (u.type === 'block' || u.type === 'he_block' || u.type === 'you_block')
    )
    if (blocked) {
      alert.value = {
        state: true,
        color: 'red',
        text: "You can't access this profile. This user has blocked you."
      }
      return
    }
    // Marquer la notif comme vue via utility (optionnel, à adapter si besoin)
    // await utility.updateOneNotif(senderId, localStorage.getItem('userId'))
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
