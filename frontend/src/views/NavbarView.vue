<template>
  <q-header class="black-text">
    <q-toolbar>
      <div v-if="connected" @click="drawer = true">
        <q-item>
          <div class="navbar-avatar-btn avatar-wrapper" aria-hidden="true">
            <AppAvatar :image="image" size="medium" :showPresence="false" />
          </div>
          <q-toolbar-title>
            <q-item-label class="text-glow">{{ user.username }}</q-item-label>
          </q-toolbar-title>
        </q-item>
      </div>

      <div v-else>
        <q-toolbar-title class="text-glow">
          <span>MATCHA </span>
        </q-toolbar-title>
      </div>

      <q-space />

      <div v-if="connected" justify-end class="search-notif-msg">
        <div>
          <!-- Notifications button + menu (YouTube-style) -->
          <button
            ref="notifBtnEl"
            class="yt-btn"
            type="button"
            aria-label="Notifications"
            @click="notifMenu = !notifMenu"
          >
            <img :src="notificationImage" alt="Notifications (YT)" class="yt-icon icon-shadow" />
            <q-badge v-if="unreadNotifCount" class="yt-badge" color="primary">
              <span>{{ unreadNotifLabel }}</span>
            </q-badge>
          </button>
          <q-menu
            v-if="notifBtnEl"
            v-model="notifMenu"
            :target="notifBtnEl"
            anchor="bottom right"
            self="top right"
            no-parent-event
            style="font-family: 'Elliane' !important; font-size: 16px !important"
          >
            <q-list padding class="notif-msg">
              <q-item
                v-for="(item, i) in notifs"
                :key="i"
                clickable
                @click="toUserProfile(item.id_from)"
                style="align-items: initial !important"
              >
                <q-item-section avatar>
                  <AppAvatar
                    :image="getNotifProfileSrc(item)"
                    :userId="item.id_from"
                    :showPresence="true"
                    size="small"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="notif_msg">
                    <strong class="notif_username" style="font-size: 16px !important">{{
                      item.username
                    }}</strong
                    >&nbsp;
                    <span class="ml-auto chat_time" style="font-size: 16px !important">{{
                      getNotifMsg(item)
                    }}</span>
                  </q-item-label>
                  <q-item-label>
                    <q-icon small style="font-size: 16px !important" class="mr-2 q-ml-xl">
                      <span :class="getNotifIcon(item.type)"></span>&nbsp;
                    </q-icon>
                    &nbsp;<span class="ml-auto chat_time" style="font-size: 16px !important">{{
                      formatNotifDate(item.date)
                    }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item class="flex justify-center" clickable @click="$router.push('/notifications')">
                <q-item-label class="see_all" style="font-size: 24px !important">
                  Show all notifications
                </q-item-label>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <div>
          <!-- Messages button + menu (YouTube-style) -->
          <button
            ref="msgBtnEl"
            class="yt-btn"
            type="button"
            aria-label="Messages"
            @click="msgMenu = !msgMenu"
          >
            <img :src="chatImage" alt="Messages (YT)" class="yt-icon icon-shadow" />
            <q-badge v-if="newMsgNum" class="yt-badge" color="primary">
              <span>{{ newMsgNum > 99 ? '99+' : newMsgNum }}</span>
            </q-badge>
          </button>
          <q-menu
            v-if="msgBtnEl"
            v-model="msgMenu"
            :target="msgBtnEl"
            anchor="bottom right"
            self="top right"
            no-parent-event
            style="font-family: 'Elliane' !important; font-size: 16px !important"
          >
            <q-list padding class="notif-msg">
              <q-item
                v-for="(item, i) in menuConvos"
                :key="i"
                clickable
                @click="toUserChat(item)"
                :class="['msg-menu-item', { unread: unreadCount(item) > 0 }]"
                style="align-items: initial !important"
              >
                <q-item-section avatar>
                  <AppAvatar
                    :image="getMsgProfileSrc(item)"
                    :userId="otherIdUniversal(item)"
                    :showPresence="true"
                    size="small"
                  />
                </q-item-section>
                <div class="ml-auto q-mr-sm">
                  <q-badge
                    v-if="unreadCount(item) > 0"
                    color="primary"
                    :label="unreadCount(item)"
                  />
                </div>
                <q-item-section>
                  <q-item-label class="notif_msg">
                    <strong class="notif_username" style="font-size: 16px !important"
                      >{{ item.first_name }} {{ item.last_name }}</strong
                    >&nbsp;
                    <span class="ml-auto chat_time" style="font-size: 16px !important">{{
                      formatNotifDate(item.last_update)
                    }}</span>
                  </q-item-label>
                  <q-item-label>
                    <span
                      v-if="item.message_from === user.id"
                      class="notif_username"
                      style="font-size: 16px !important"
                      >You:
                    </span>
                    <span
                      class="ml-auto chat_time text-truncate"
                      style="font-size: 16px !important"
                      >{{ truncateText(item.message, 30) }}</span
                    >
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item class="justify-center" clickable @click="$router.push('/chat')">
                <q-item-label class="see_all" style="font-size: 24px !important">
                  Show all discussions
                </q-item-label>
              </q-item>
            </q-list>
          </q-menu>
        </div>
      </div>

      <div v-else>
        <span class="text-link q-ml-xl" @click="$router.push('/login')">Connection</span>
        <span class="text-link q-ml-xl" @click="$router.push('/register')">Registration</span>
      </div>
    </q-toolbar>

    <q-drawer v-if="connected" v-model="drawer" overlay>
      <div class="drawer-bg"></div>
      <q-list padding>
        <div @click="drawer = !drawer">
          <q-item>
            <div class="avatar-wrapper">
              <AppAvatar :image="image" size="medium" :showPresence="false" />
            </div>
            <q-item-section>
              <q-item-label class="text-glow">{{ user.username }}</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <q-separator />
        <div v-for="link in links" :key="link.text">
          <q-item v-if="link.public || connected" clickable @click="$router.push(link.route)">
            <img :src="link.image" alt="Icon" class="icon-size icon-shadow" />
            <q-item-section>
              <q-item-label>{{ link.text }}</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <q-item clickable @click="logout">
          <img
            src="@/assets/Navbar/deconnexion.png"
            alt="Déconnexion"
            class="icon-size icon-shadow"
          />
          <q-item-section>
            <q-item-label class="text-shadow">Déconnexion</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>
  </q-header>
</template>

<script setup>
import utility from '@/utility.js'
import { API_URL, BASE_URL } from '@/utility.js'
import { ref, onMounted, onUnmounted, onBeforeUnmount, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import axios from 'axios'
import AppAvatar from '@/components/common/AppAvatar.vue'

import acceilImage from '@/assets/Navbar/acceil.png'
import decouvrirImage from '@/assets/Navbar/decouvrir.png'
import chatImage from '@/assets/Navbar/chat.png'
import notificationImage from '@/assets/Navbar/notification.png'
import parametreImage from '@/assets/Navbar/parametre.png'

const store = useStore()
const router = useRouter()
const drawer = ref(false)
const notifBtnEl = ref(null)
const msgBtnEl = ref(null)
const image = computed(() => store.getters.profileImage)

const links = [
  { text: 'Homepage', route: '/', public: true, image: acceilImage },
  { text: 'Discover', route: '/discover', public: false, image: decouvrirImage },
  { text: 'Chat', route: '/chat', public: false, image: chatImage },
  { text: 'Notifications', route: '/notifications', public: false, image: notificationImage },
  { text: 'Settings', route: '/settings', public: false, image: parametreImage }
]

let notifMenu = ref(false)
let msgMenu = ref(false)

// Cache of profile photos for users shown in notifications
const profilePhotosById = ref({})

// Unread notifications (excluding chat) badge count
const unreadNotifCount = computed(() => {
  try {
    const path = router.currentRoute?.value?.path || ''
    if (typeof path === 'string' && path.startsWith('/notifications')) return 0
  } catch (_) {}
  const arr = store.getters.notif
  if (!Array.isArray(arr)) return 0
  return arr.filter((n) => n && n.type !== 'chat' && !n.is_read).length
})

let newMsgNum = ref(0)
const user = computed(() => store.getters.user)
const connected = computed(() => store.getters.status)

let notif = ref([])
notif.value = store.getters.notif
let convos = ref([])
convos.value = store.getters.convos
let notifs = ref([])
notifs.value = Array.isArray(notif.value)
  ? notif.value
      .filter((n) => n.type !== 'chat')
      .sort((a, b) => {
        if (a.is_read !== b.is_read) return a.is_read - b.is_read
        return new Date(b.date) - new Date(a.date)
      })
      .slice(0, 5)
  : []

const unreadNotifLabel = computed(() => {
  const n = unreadNotifCount.value || 0
  return n > 99 ? '99+' : String(n)
})

let menuConvos = ref([])
let newMessage = ref([])
// Track connected users (ids) for presence dots in menus
const connectedUserIds = ref(new Set())
// Track unread counts per conversation for the messages list and total badge
const unreadCountsByConv = ref({})

const base = BASE_URL
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const getFullPath = utility.getFullPath
const resolveImg = (img) =>
  utility.getImageSrc
    ? utility.getImageSrc(img, utility.getCachedDefault?.('profile') || defaultProfileTxt)
    : getFullPath(img)
const getNotifMsg = utility.getNotifMsg
const getNotifIcon = utility.getNotifIcon
const formatNotifDate = utility.formatTime
const updateOneNotif = utility.updateOneNotif

const toUserProfile = (id_from) => {
  try {
    const me = user.value?.id
    updateOneNotif(id_from, me)
    if (me && String(id_from) === String(me)) {
      router.push('/settings')
    } else {
      router.push(`/user/${id_from}`)
    }
  } catch (err) {
    console.error('err toUserProfile in frontend/NavbarView.view ===> ', err)
  }
}

const toUserChat = async (convo) => {
  try {
    // Mark conversation as read immediately to update counters
    const token = localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const url = `${API_URL}/api/chat/update`
    await axios.post(url, { id: convo?.id_conversation }, { headers })
    // Optimistically zero local unread count for this convo and recompute total
    if (convo?.id_conversation) {
      const map = { ...unreadCountsByConv.value }
      map[convo.id_conversation] = 0
      unreadCountsByConv.value = map
      newMsgNum.value = Object.values(unreadCountsByConv.value).reduce(
        (a, b) => a + (Number(b) || 0),
        0
      )
    }
    syncConvo(convo)
  } catch (err) {
    console.error('err toUserChat in frontend/NavbarView.view ===> ', err)
    // Still navigate to chat on error
    try {
      syncConvo(convo)
    } catch (_) {}
  }
}

const handleClickOutside = (e) => {
  const drawerElement = document.querySelector('.q-drawer')
  if (drawerElement && drawer.value && !drawerElement.contains(e.target)) {
    drawer.value = false
  }
}

onMounted(() => {
  document.body.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.body.removeEventListener('click', handleClickOutside, true)
})

// Quand on ouvre le menu des notifications, marquer comme lues seulement les 5 visibles (hors 'chat')
watch(
  () => notifMenu.value,
  async (opened) => {
    if (!connected.value) return
    if (opened) {
      // close the other menu when this opens
      if (msgMenu.value) msgMenu.value = false
      try {
        const visible = Array.isArray(notifs.value) ? notifs.value : []
        const ids = visible
          .filter((n) => n && n.type !== 'chat' && !n.is_read && n.id)
          .map((n) => n.id)
        if (ids.length) store.commit('markNotifsSeenByIds', ids)
        if (ids.length) {
          try {
            await store.dispatch('seenNotifByIds', ids)
          } catch (_) {}
        }
      } catch (_) {}
    }
  }
)

// Ensure mutual exclusivity: open messages menu closes notifications
watch(
  () => msgMenu.value,
  async (opened) => {
    if (!connected.value) return
    if (opened && notifMenu.value) notifMenu.value = false
    // On open, aggressively refresh conversations and unread counts for fastest accuracy
    if (opened) {
      try {
        const [counts, allConvos] = await Promise.all([getUnreadConvoCounts(), getAllConvos()])
        unreadCountsByConv.value = counts
        newMessage.value = allConvos
        menuConvos.value = buildMenuMessages(newMessage.value)
        newMsgNum.value = Object.values(unreadCountsByConv.value).reduce(
          (a, b) => a + (Number(b) || 0),
          0
        )
        // Also hydrate store's convos so Messenger list becomes accurate immediately
        try {
          store.commit('syncConvoAll', allConvos)
        } catch (_) {}
        updateNotifAndMsg._lastAllConvosAt = Date.now()
      } catch (_) {}
    }
  }
)

onMounted(() => {
  if (connected.value) updateNotifAndMsg()
})

// Fetch the profile image for a given user id using the same approach as UserProfile
const fetchUserProfileImage = async (id) => {
  try {
    const token = user.value?.token || localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const url = `${API_URL}/api/users/show/${id}`
    const res = await axios.get(url, { headers })
    const images = Array.isArray(res.data?.images) ? res.data.images : []
    // Prefer the image marked as profile
    const profileImg =
      images.find((img) => img && (img.profile === 1 || img.profile === true)) || images[0]
    if (!profileImg) return ''
    // Use same resolver as elsewhere so it supports data:, external URLs, or backend filenames
    const fallback =
      utility.getCachedDefault?.('profile') || `${BASE_URL}default/defaut_profile.txt`
    const src = utility.getImageSrc
      ? utility.getImageSrc(profileImg, fallback)
      : getFullPath(profileImg?.name || profileImg?.link || profileImg?.data || '')
    return src || ''
  } catch (e) {
    return ''
  }
}

// (removed static prefetch of user 1 and 3 avatars)

// Prefer fetched profile image per notification author; fallback to resolveImg
const getNotifProfileSrc = (item) => {
  try {
    const id = item?.id_from
    const cached = id ? profilePhotosById.value[id] : ''
    return cached || resolveImg(item?.profile_image)
  } catch (_) {
    return resolveImg(item?.profile_image)
  }
}

// Prefetch profile images for users appearing in current top notifs (avoid duplicates)
const prefetchNotifProfilePhotos = async () => {
  const arr = Array.isArray(notifs.value) ? notifs.value : []
  const ids = Array.from(new Set(arr.map((n) => n && n.id_from).filter(Boolean)))
  for (const id of ids) {
    if (!profilePhotosById.value[id]) {
      try {
        const src = await fetchUserProfileImage(id)
        if (src) profilePhotosById.value = { ...profilePhotosById.value, [id]: src }
      } catch (_) {}
    }
  }
}

// Kick off prefetch when notifications list changes or when menu opens
watch(
  () => notifs.value,
  () => {
    if (!connected.value) return
    prefetchNotifProfilePhotos()
  },
  { deep: true, immediate: true }
)
watch(
  () => notifMenu.value,
  (opened) => {
    if (!connected.value) return
    if (opened) prefetchNotifProfilePhotos()
  }
)

// Derive the other participant id for message items (best effort)
const deriveOtherId = (it) => {
  try {
    const me = user.value?.id
    const uid = it?.user_id
    const mf = it?.message_from
    if (uid && uid !== me) return uid
    if (mf && mf !== me) return mf
    return uid || mf || null
  } catch (_) {
    return null
  }
}

// For notifications, use id_from; else fallback to deriveOtherId
const otherIdUniversal = (it) => {
  try {
    if (it && it.id_from !== undefined && it.id_from !== null) return it.id_from
    return deriveOtherId(it)
  } catch (_) {
    return null
  }
}

// Prefer fetched profile image for messages menu items
const getMsgProfileSrc = (item) => {
  try {
    const id = deriveOtherId(item)
    const cached = id ? profilePhotosById.value[id] : ''
    return cached || resolveImg(item?.profile_image)
  } catch (_) {
    return resolveImg(item?.profile_image)
  }
}

const prefetchMsgProfilePhotos = async () => {
  const arr = Array.isArray(menuConvos.value) ? menuConvos.value : []
  const ids = Array.from(new Set(arr.map((n) => deriveOtherId(n)).filter(Boolean)))
  for (const id of ids) {
    if (!profilePhotosById.value[id]) {
      try {
        const src = await fetchUserProfileImage(id)
        if (src) profilePhotosById.value = { ...profilePhotosById.value, [id]: src }
      } catch (_) {}
    }
  }
}

// Truncate helper for message previews (30 chars by default)
const truncateText = (val, limit = 30) => {
  try {
    if (val == null) return ''
    const s = typeof val === 'string' ? val : String(val)
    if (s.length <= limit) return s
    return s.slice(0, limit) + '...'
  } catch (_) {
    return ''
  }
}

watch(
  () => menuConvos.value,
  () => {
    if (!connected.value) return
    prefetchMsgProfilePhotos()
  },
  { deep: true, immediate: true }
)
watch(
  () => msgMenu.value,
  (opened) => {
    if (!connected.value) return
    if (opened) prefetchMsgProfilePhotos()
  }
)

const syncConvo = async (convo) => {
  try {
    store.dispatch('syncConvo', convo)
    router.push('/chat').catch((err) => {
      console.error('err syncConvo router.push in frontend/NavbarView.view ===> ', err)
    })
  } catch (err) {
    console.error('err syncConvo in frontend/NavbarView.view ===> ', err)
  }
}

const logout = async () => {
  try {
    const token = user.value?.token || localStorage.getItem('token')
    const url = `${API_URL}/api/auth/logout`
    const headers = { 'x-auth-token': token }
    await axios.get(url, { headers })
  } catch (err) {
    console.error('err logout in frontend/NavbarView.view ===> ', err)
  } finally {
    await store.dispatch('logout', user.value?.id)
    router.push('/login').catch((err) => {
      console.error('err logout router.push in frontend/NavbarView.view ===> ', err)
    })
  }
}

// Build the menu: prioritize UNREAD by newest, then READ by newest, max 5 total
function buildMenuMessages(messages) {
  const me = user.value?.id
  const all = Array.isArray(messages) ? messages : []
  // Only keep items where the last message is from the other person (received)
  const arr = all.filter((m) => m && m.message_from !== me)
  const byDateDesc = (a, b) =>
    new Date(b.last_update || b.created_at || 0) - new Date(a.last_update || a.created_at || 0)
  const unread = arr.filter((it) => unreadCount(it) > 0).sort(byDateDesc)
  const read = arr.filter((it) => !(unreadCount(it) > 0)).sort(byDateDesc)
  return unread.concat(read).slice(0, 5)
}

menuConvos.value = buildMenuMessages(newMessage.value)

// Fetch all conversations with last message details for the menu
const getAllConvos = async () => {
  try {
    const token = localStorage.getItem('token')
    const url = `${API_URL}/api/chat/all`
    const headers = { 'x-auth-token': token }
    const result = await axios.get(url, { headers })
    return Array.isArray(result?.data?.data) ? result.data.data : []
  } catch (err) {
    console.error('Error fetching conversations (all):', err)
    return []
  }
}

// Fetch unread conversation counts to compute per-item and total badges
const getUnreadConvoCounts = async () => {
  try {
    const token = localStorage.getItem('token')
    const url = `${API_URL}/api/chat/notSeen`
    const headers = { 'x-auth-token': token }
    const result = await axios.get(url, { headers })
    const arr = Array.isArray(result?.data?.data) ? result.data.data : []
    const map = {}
    for (const r of arr) {
      if (r && r.id_conversation) map[r.id_conversation] = Number(r.count) || 0
    }
    return map
  } catch (err) {
    // If backend doesn't expose the route (older deployments), fail soft without console noise
    const status = err?.response?.status
    if (status !== 404) {
      console.error('Error fetching unread counts (notSeen):', err)
    }
    return {}
  }
}

const unreadCount = (item) => unreadCountsByConv.value[item?.id_conversation] || 0
const presenceClass = (item) => {
  try {
    const id = otherIdUniversal(item)
    if (id === null || id === undefined) return 'offline'
    const has =
      connectedUserIds.value instanceof Set
        ? connectedUserIds.value.has(String(id))
        : Array.isArray(connectedUserIds.value) &&
          connectedUserIds.value.map(String).includes(String(id))
    return has ? 'online' : 'offline'
  } catch (_) {
    return 'offline'
  }
}

const updateNotifAndMsg = async () => {
  if (!connected.value) return
  try {
    const path = router.currentRoute?.value?.path || ''
    if ((typeof path === 'string' && path.startsWith('/notifications')) || notifMenu.value) return
  } catch (_) {}
  // Prevent re-entrancy while periodic refresh is in-flight
  if (updateNotifAndMsg._inFlight) return
  updateNotifAndMsg._inFlight = true
  try {
    await store.dispatch('getNotifPage', { limit: 50, page: 1 })
    convos.value = store.getters.convos
    notif.value = store.getters.notif
    notifs.value = Array.isArray(notif.value)
      ? notif.value
          .filter((n) => n.type !== 'chat')
          .sort((a, b) => {
            if (a.is_read !== b.is_read) return a.is_read - b.is_read
            return new Date(b.date) - new Date(a.date)
          })
          .slice(0, 5)
      : []
    // Always refresh unread counts and presence; fetch all conversations less frequently
    const [counts, connectedList] = await Promise.all([
      getUnreadConvoCounts(),
      (async () => {
        try {
          return await utility.getConnectedUsers()
        } catch (_) {
          return []
        }
      })()
    ])
    unreadCountsByConv.value = counts
    newMsgNum.value = Object.values(unreadCountsByConv.value).reduce(
      (a, b) => a + (Number(b) || 0),
      0
    )
    const set = new Set((Array.isArray(connectedList) ? connectedList : []).map((x) => String(x)))
    connectedUserIds.value = set
    // Fetch full conversations at most every 12s in background to keep menu warm without causing jank
    const now = Date.now()
    if (!updateNotifAndMsg._lastAllConvosAt || now - updateNotifAndMsg._lastAllConvosAt > 12000) {
      try {
        const allConvos = await getAllConvos()
        newMessage.value = allConvos
        menuConvos.value = buildMenuMessages(newMessage.value)
        // Keep store in sync to speed up Messenger list hydration
        try {
          store.commit('syncConvoAll', allConvos)
        } catch (_) {}
        updateNotifAndMsg._lastAllConvosAt = now
      } catch (_) {}
    }
  } catch (e) {
    // Swallow transient errors (e.g., QUIC/HTTP3) to avoid reactive churn
  } finally {
    updateNotifAndMsg._inFlight = false
  }
}

function refreshMethods() {
  updateNotifAndMsg()
}

let refreshIntervalId = null
let boostIntervalId = null
let boostTimeoutId = null
onMounted(() => {
  if (connected.value && !refreshIntervalId) {
    // Immediately refresh, then do a short boost period for quick hydration post-login
    refreshMethods()
    if (!boostIntervalId) boostIntervalId = setInterval(refreshMethods, 1000)
    if (!boostTimeoutId)
      boostTimeoutId = setTimeout(() => {
        if (boostIntervalId) clearInterval(boostIntervalId)
        boostIntervalId = null
        refreshIntervalId = setInterval(refreshMethods, 4000)
      }, 8000)
  }
})
watch(
  () => connected.value,
  (val) => {
    if (val) {
      // Immediate refresh and short boost interval to hydrate quickly
      refreshMethods()
      if (boostIntervalId) clearInterval(boostIntervalId)
      if (boostTimeoutId) clearTimeout(boostTimeoutId)
      boostIntervalId = setInterval(refreshMethods, 1000)
      boostTimeoutId = setTimeout(() => {
        if (boostIntervalId) clearInterval(boostIntervalId)
        boostIntervalId = null
        if (!refreshIntervalId) refreshIntervalId = setInterval(refreshMethods, 4000)
      }, 8000)
    } else {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId)
        refreshIntervalId = null
      }
      if (boostIntervalId) {
        clearInterval(boostIntervalId)
        boostIntervalId = null
      }
      if (boostTimeoutId) {
        clearTimeout(boostTimeoutId)
        boostTimeoutId = null
      }
    }
  }
)

onBeforeUnmount(() => {
  if (refreshIntervalId) clearInterval(refreshIntervalId)
  refreshIntervalId = null
})
</script>

<style scoped>
* {
  font-weight: bold;
  font-size: x-large;
  font-family: 'Elliane' !important;
  align-items: center;
  color: black;
}

/* presence dot CSS removed; handled by AppAvatar */

/* Highlight unread items in messages menu */
.msg-menu-item.unread {
  background-color: #e8f0ff; /* light blue highlight */
}
.msg-menu-item.unread .notif_username {
  font-weight: 700;
}

q-drawer {
  background-color: transparent;
  border-color: transparent;
}

.drawer-bg {
  background-color: white;
  opacity: 0.9;
  position: absolute;
  width: 100%;
  height: 100%;
}

.search-notif-msg {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  top: 70px;
}

.image-button {
  width: 48px;
  height: 48px;
  object-fit: cover;
}
.search-field {
  max-width: 300px;
  margin-right: 20px;
}

.icon-size {
  width: 42px;
  margin: 10px;
  /* thinner white contour around PNG icons */
  filter: drop-shadow(0.05px 0 0 #fff) drop-shadow(-0.05px 0 0 #fff) drop-shadow(0 0.05px 0 #fff)
    drop-shadow(0 -0.05px 0 #fff) drop-shadow(0 0 0.1px rgba(255, 255, 255, 0.65));
  transition: transform 0.15s ease, filter 0.15s ease;
}

/* YouTube-style raw buttons (no overlay background) */
.yt-btn {
  background: transparent !important;
  border: 0;
  padding: 4px;
  margin: 10px;
  border-radius: 9999px; /* circular hit area like YT */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  position: relative; /* to anchor the floating badge */
}
.yt-btn:before,
.yt-btn:after {
  display: none !important;
}
.yt-btn:focus {
  outline: none;
}
.yt-btn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.55);
  outline-offset: 3px;
}
.yt-icon {
  width: 42px;
  height: 42px;
  user-select: none;
  -webkit-user-drag: none;
  /* white contour around PNG, thin */
  filter: drop-shadow(0.05px 0 0 #fff) drop-shadow(-0.05px 0 0 #fff) drop-shadow(0 0.05px 0 #fff)
    drop-shadow(0 -0.05px 0 #fff) drop-shadow(0 0 0.1px rgba(255, 255, 255, 0.65));
  transition: transform 0.15s ease, filter 0.15s ease;
}
.yt-btn:hover .yt-icon {
  transform: translateZ(0) scale(1.06);
}
.yt-btn:active .yt-icon {
  transform: translateZ(0) scale(0.94);
}

/* Floating badge position for the raw buttons */
.yt-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  pointer-events: none;
}

/* Even thinner contour specifically for Notifications and Messages icons */
.icon-size.notif-icon,
.icon-size.msg-icon {
  filter: drop-shadow(0.04px 0 0 #fff) drop-shadow(-0.04px 0 0 #fff) drop-shadow(0 0.04px 0 #fff)
    drop-shadow(0 -0.04px 0 #fff) drop-shadow(0 0 0.08px rgba(255, 255, 255, 0.6));
}

.q-header {
  /* Keep navbar always visible at the top across all pages */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height, 80px);
  z-index: 1000;
  background: linear-gradient(
    to bottom,
    #000 3%,
    transparent 81%,
    rgba(255, 255, 255, 0) 70%
  ) !important;
  box-shadow: none !important;
  border: none !important;
}

.circular-icon {
  border-radius: 50%;
}

.text-link {
  cursor: pointer;
  /* color: black; */
  /* white contour on text */
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.9), 0 0 4px rgba(255, 255, 255, 0.85),
    0 0 6px rgba(255, 255, 255, 0.55), 0 0 8px rgba(255, 255, 255, 0.35);
  display: inline-block;
  transition: transform 0.15s ease, text-shadow 0.15s ease;
}

/* Remove any hover/active background on buttons in header */
:deep(.q-header .q-btn),
:deep(.q-header .q-btn:before),
:deep(.q-header .q-btn:after),
:deep(.q-header .q-hoverable:before),
:deep(.q-header .q-item.q-hoverable:before),
:deep(.q-header .q-item--active:before) {
  background: transparent !important;
  box-shadow: none !important;
}
/* Forcefully suppress overlay opacity as well (YouTube-like: no hover press bg) */
:deep(.q-header .q-btn:before),
:deep(.q-header .q-btn:after),
:deep(.q-header .q-hoverable:before),
:deep(.q-header .q-item.q-hoverable:before),
:deep(.q-header .q-item--active:before) {
  opacity: 0 !important;
}

/* Also remove any default background on q-avatar/q-img wrappers */
:deep(.q-header .q-avatar),
:deep(.q-header .q-img) {
  background: transparent !important;
  box-shadow: none !important;
}
/* Hide ripple visuals on icon buttons (click) */
:deep(.q-header .q-btn .q-ripple),
:deep(.q-header .q-btn .q-ripple__container),
:deep(.q-header .q-btn .q-focus-helper) {
  display: none !important;
  background: transparent !important;
}

/* Also remove background for drawer/menu items (teleported) */
:deep(.q-drawer .q-item.q-hoverable:before),
:deep(.q-drawer .q-item--active:before),
:deep(.q-menu .q-item.q-hoverable:before),
:deep(.q-menu .q-item--active:before),
:deep(.q-menu .q-btn:before),
:deep(.q-menu .q-btn:after) {
  background: transparent !important;
  box-shadow: none !important;
}
/* And suppress their overlay opacity as well */
:deep(.q-drawer .q-item.q-hoverable:before),
:deep(.q-drawer .q-item--active:before),
:deep(.q-menu .q-item.q-hoverable:before),
:deep(.q-menu .q-item--active:before),
:deep(.q-menu .q-btn:before),
:deep(.q-menu .q-btn:after) {
  opacity: 0 !important;
}

/* Hover enlarge for icons */
.q-btn:hover .icon-size,
.icon-size:hover,
:deep(.q-drawer .q-item:hover img.icon-size),
:deep(.q-menu .q-item:hover img.icon-size),
:deep(.q-drawer .q-item:hover .q-icon.icon-size),
:deep(.q-menu .q-item:hover .q-icon.icon-size) {
  transform: translateZ(0) scale(1.06);
}

/* Click shrink for icons */
.q-btn:active .icon-size,
.icon-size:active,
:deep(.q-drawer .q-item:active img.icon-size),
:deep(.q-menu .q-item:active img.icon-size),
:deep(.q-drawer .q-item:active .q-icon.icon-size),
:deep(.q-menu .q-item:active .q-icon.icon-size) {
  transform: translateZ(0) scale(0.94);
}

/* Username/title contour */
.q-header .q-toolbar-title,
.q-header .q-toolbar-title .q-item-label {
  text-shadow: 0.02px 0 0 #fff, -0.02px 0 0 #fff, 0 0.02px 0 #fff, 0 -0.02px 0 #fff,
    0 0 0.02px rgba(255, 255, 255, 0.85);
}

/* Extra glow for username specifically */
.text-glow {
  /* Static soft white glow only */
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.9), 0 0 4px rgba(255, 255, 255, 0.85),
    0 0 6px rgba(255, 255, 255, 0.55), 0 0 8px rgba(255, 255, 255, 0.35);
}

.icon-shadow {
  /* Subtle white glow for icons and logo */
  filter: drop-shadow(0 0 2px rgb(255, 255, 255)) drop-shadow(0 0 2px rgb(255, 255, 255));
}
/* Lower the avatar slightly for visual breathing space from page top */
/* Lower the avatar slightly for visual breathing space from page top */
.avatar-wrapper {
  margin-top: 6px;
}

/* Drawer & menu labels contour + interactions */
:deep(.q-drawer .q-item-label),
:deep(.q-menu .q-item-label),
.notif_msg,
.notif_username,
.see_all {
  text-shadow: 0.02px 0 0 #fff, -0.02px 0 0 #fff, 0 0.02px 0 #fff, 0 -0.02px 0 #fff,
    0 0 0.02px rgba(255, 255, 255, 0.85);
  transition: transform 0.15s ease, text-shadow 0.15s ease;
}

:deep(.q-drawer .q-item:hover .q-item-label),
:deep(.q-menu .q-item:hover .q-item-label),
.text-link:hover,
.notif_msg:hover,
.notif_username:hover,
.see_all:hover {
  transform: translateZ(0) scale(1.05);
}

:deep(.q-drawer .q-item:active .q-item-label),
:deep(.q-menu .q-item:active .q-item-label),
.text-link:active,
.notif_msg:active,
.notif_username:active,
.see_all:active {
  transform: translateZ(0) scale(0.95);
}

.notif-text {
  line-height: 3.2em !important;
}

.notif-msg {
  font-size: normal !important;
  font-weight: normal !important;
  width: 330px;
  right: 55px;
  top: auto;
  height: auto;
  visibility: visible;
  max-width: 330px;
  overflow: hidden;
}
</style>
