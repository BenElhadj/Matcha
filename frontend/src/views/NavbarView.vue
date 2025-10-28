<template>
  <q-header class="black-text">
    <q-toolbar>
      <div v-if="connected" @click="drawer = true">
        <q-item>
          <q-btn flat round dense>
            <q-avatar size="60px">
              <q-img :src="image" alt="Photo de profil" />
            </q-avatar>
          </q-btn>
          <q-toolbar-title>
            <q-item-label>{{ user.username }}</q-item-label>
          </q-toolbar-title>
        </q-item>
      </div>

      <div v-else>
        <q-toolbar-title>
          <span>MATCHA </span>
        </q-toolbar-title>
      </div>

      <q-space></q-space>

      <div v-if="connected" justify-end class="search-notif-msg">
        <div>
          <q-btn ripple flat round dense class="icon-size">
            <img
              src="@/assets/Navbar/notification.png"
              :nudge-width="250"
              alt="notifMenu"
              class="icon-size"
            />
            <q-badge v-if="unreadNotifCount" :value="!!unreadNotifCount" color="primary" floating>
              <span>{{ unreadNotifLabel }}</span>
            </q-badge>
          </q-btn>
          <q-menu
            v-model="notifMenu"
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
                  <q-avatar>
                    <img :src="resolveImg(item.profile_image)" />
                  </q-avatar>
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
          <q-btn ripple flat round dense class="icon-size">
            <img
              src="@/assets/Navbar/chat.png"
              :nudge-width="250"
              alt="Messages"
              class="icon-size"
            />
            <q-badge v-if="newMsgNum" :value="!!newMsgNum" color="primary" floating>
              <span>{{ newMsgNum }}</span>
            </q-badge>
          </q-btn>
          <q-menu
            v-model="msgMenu"
            style="font-family: 'Elliane' !important; font-size: 16px !important"
          >
            <q-list padding class="notif-msg">
              <q-item
                v-for="(item, i) in menuConvos"
                :key="i"
                clickable
                @click="toUserChat(item)"
                style="align-items: initial !important"
              >
                <q-item-section avatar>
                  <q-avatar>
                    <img :src="resolveImg(item.profile_image)" />
                  </q-avatar>
                </q-item-section>
                <div>
                  <q-badge small :color="item.is_read == 0 ? 'blue' : 'grey'" />
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
                      >{{ item.message }}</span
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
            <q-btn flat round dense>
              <q-avatar size="60px">
                <q-img :src="image" alt="Photo de profil" />
              </q-avatar>
            </q-btn>
            <q-item-section>
              <q-item-label>{{ user.username }}</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <q-separator></q-separator>
        <div v-for="link in links" :key="link.text">
          <q-item v-if="link.public || connected" clickable @click="$router.push(link.route)">
            <img :src="link.image" alt="Icon" class="icon-size" />
            <q-item-section>
              <q-item-label>{{ link.text }}</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <q-item clickable @click="logout">
          <img src="@/assets/Navbar/deconnexion.png" alt="Déconnexion" class="icon-size" />
          <q-item-section>
            <q-item-label>Sign out</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>
  </q-header>
</template>

<script setup>
import utility from '@/utility.js'
import { ref, onMounted, onUnmounted, onBeforeUnmount, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import axios from 'axios'
// Realtime sockets disabled here (server rejects WS); using lightweight polling instead

import acceilImage from '@/assets/Navbar/acceil.png'
import decouvrirImage from '@/assets/Navbar/decouvrir.png'
import chatImage from '@/assets/Navbar/chat.png'
import notificationImage from '@/assets/Navbar/notification.png'
import parametreImage from '@/assets/Navbar/parametre.png'

const store = useStore()
const router = useRouter()
const searchText = ref('')
const drawer = ref(false)
const image = computed(() => store.getters.profileImage)
const links = [
  {
    text: 'Homepage',
    route: '/',
    public: true,
    image: acceilImage
  },
  {
    text: 'Discover',
    route: '/discover',
    public: false,
    image: decouvrirImage
  },
  {
    text: 'Chat',
    route: '/chat',
    public: false,
    image: chatImage
  },
  {
    text: 'Notifications',
    route: '/notifications',
    public: false,
    image: notificationImage
  },
  {
    text: 'Settings',
    route: '/settings',
    public: false,
    image: parametreImage
  }
]
let notifMenu = ref(false)
let msgMenu = ref(false)
// Unread notifications (excluding chat) badge count
const unreadNotifCount = computed(() => {
  const arr = store.getters.notif
  if (!Array.isArray(arr)) return 0
  return arr.filter((n) => n && n.type !== 'chat' && !n.is_read).length
})
let newMsgNum = ref(0)
const user = computed(() => store.getters.user)
const connected = computed(() => store.getters.status)
const profileImage = computed(() => store.getters.profileImage)

let notif = ref([])
notif.value = store.getters.notif
let convos = ref([])
convos.value = store.getters.convos
let notifs = ref([])
const computeMenuNotifs = (src) => {
  if (!Array.isArray(src)) return []
  return src
    .filter((n) => n && n.type !== 'chat')
    .sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read - b.is_read
      return new Date(b.date) - new Date(a.date)
    })
    .slice(0, 5)
}
notifs.value = computeMenuNotifs(notif.value)
const unreadNotifLabel = computed(() => {
  const n = unreadNotifCount.value || 0
  return n > 99 ? '99+' : String(n)
})

let menuConvos = ref([])
let newMessage = ref([])

const base = import.meta.env.BASE_URL || '/'
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
    updateOneNotif(id_from, user.value.id)
    router.push(`/user/${id_from}`)
  } catch (err) {
    console.error('err toUserProfile in frontend/NavbarView.view ===> ', err)
  }
}

const toUserChat = (convo) => {
  try {
    syncConvo(convo)
  } catch (err) {
    console.error('err toUserChat in frontend/NavbarView.view ===> ', err)
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

// Auth bootstrap now happens before app mount in main.js to avoid flicker/races
onMounted(() => {
  // After mount, just refresh counters/menus if already connected
  if (connected.value) updateNotifAndMsg()
})

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
    const url = `${import.meta.env.VITE_APP_API_URL}/api/auth/logout`
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

function sortAndFilterMessages(messages) {
  if (!Array.isArray(messages)) {
    messages = []
  }
  messages.sort((a, b) => {
    if (a.is_read !== b.is_read) {
      return a.is_read - b.is_read
    } else if (a.id_conversation === b.id_conversation) {
      const dateA = new Date(a.last_update)
      const dateB = new Date(b.last_update)
      return dateB - dateA
    } else {
      return b.id_conversation - a.id_conversation
    }
  })

  const uniqueConversations = new Set()
  const uniqueMessages = []

  for (const message of messages) {
    if (!uniqueConversations.has(message.id_conversation)) {
      uniqueMessages.push(message)
      uniqueConversations.add(message.id_conversation)
    }
  }

  return uniqueMessages.slice(0, 5)
}

menuConvos.value = sortAndFilterMessages(newMessage.value)

const getNewMsg = async () => {
  try {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_APP_API_URL}/api/chat/getInChat`
    const headers = { 'x-auth-token': token }
    const result = await axios.get(url, { headers })
    return result.data
  } catch (err) {
    console.error('Error fetching new messages:', err)
  }
}

const updateNotifAndMsg = async () => {
  if (connected.value !== null) {
    // Poll latest notifications (page 1) to keep badge/menu updated
    try {
      await store.dispatch('getNotifPage', { limit: 50, page: 1 })
      // Réappliquer l'overlay des notifications vues localement (ne pas dépasser 5 à chaque ouverture)
      try {
        store.commit('applyLocalSeen')
      } catch (_) {}
    } catch (_) {
      /* silent */
    }
    convos.value = store.getters.convos
    notif.value = store.getters.notif
    // Ne pas faire défiler pendant que le menu est ouvert
    if (!notifMenu.value) {
      notifs.value = computeMenuNotifs(notif.value)
    }
    newMessage.value = await getNewMsg()
    if (Array.isArray(newMessage.value)) {
      menuConvos.value = sortAndFilterMessages(newMessage.value)
      newMsgNum.value = newMessage.value.filter((cur) => !cur.is_read).length
    } else {
      menuConvos.value = []
      newMsgNum.value = 0
    }
  }
}

function refreshMethods() {
  updateNotifAndMsg()
}

const refreshInterval = setInterval(refreshMethods, 3000)

onBeforeUnmount(() => {
  clearInterval(refreshInterval)
})

// No local socket; polling keeps the UI in sync when server WS is unavailable

// Quand le menu des notifications s'ouvre, marquer les notifs visibles (max 5) comme lues
watch(
  notifMenu,
  async (isOpen) => {
    try {
      if (!isOpen) return
      const uid = user.value?.id
      if (!uid) return
      // Fixer l'instantané des 5 visibles à l'ouverture
      notifs.value = computeMenuNotifs(store.getters.notif)
      // Notifications affichées (max 5) et non lues (hors chat)
      const visible = Array.isArray(notifs.value)
        ? notifs.value.filter((n) => n && n.type !== 'chat' && !n.is_read).slice(0, 5)
        : []
      if (!visible.length) return

      // IDs réellement visibles (donc <= 5)
      const ids = visible.map((v) => v.id).filter(Boolean)
      // 1) Marquage local exact: ne baisse que ce qui est affiché
      try {
        store.commit('seenNotifIds', ids)
        store.commit('markNotifIdsLocally', ids)
      } catch (_) {}

      // 2) Pas d'appel backend ici: on reste 100% local à l'ouverture du menu
    } catch (_) {}
  },
  { immediate: false }
)
</script>

<style scoped>
* {
  font-weight: bold;
  font-size: x-large;
  font-family: 'Elliane' !important;
  align-items: center;
  color: black;
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
  margin: 7px;
}

.q-header {
  background: linear-gradient(to bottom, #000 0%, #fff 91%, rgba(255, 255, 255, 0) 100%) !important;
  box-shadow: none !important;
  border: none !important;
  padding: 7px;
}

.circular-icon {
  border-radius: 50%;
}

.text-link {
  cursor: pointer;
  color: black;
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
