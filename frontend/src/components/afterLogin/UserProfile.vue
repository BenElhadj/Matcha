<template>
  <q-page class="page-container">
    <q-page-container v-if="!loading">
      <div>
        <div class="profile__cover">
          <img :src="coverPhoto" alt="Cover Photo" class="cover__img" />
          <div style="margin-top: 10px">
            <input
              type="file"
              id="cover-upload"
              accept="image/*"
              @change="onCoverChange"
              style="display: none"
            />
            <q-btn label="Changer la cover" color="primary" @click="onCoverBtnClick" />
          </div>
        </div>
      </div>

      <div class="avatar">
        <q-avatar slot="offset" class="profile__avatar mx-auto" size="250px">
          <img :src="profileImage" />
          <div style="margin-top: 10px">
            <input
              type="file"
              id="profile-upload"
              accept="image/*"
              @change="onProfileChange"
              style="display: none"
            />
            <q-btn label="Changer la photo de profil" color="primary" @click="onProfileBtnClick" />
          </div>

          <div class="avatar-content">
            <q-chip outline small text-color="black" style="background: white !important">{{
              distance
            }}</q-chip>

            <q-separator style="margin: 3px"></q-separator>
            <q-item-section side>
              <q-tooltip bottom class="status_container">
                <span>{{ lastSeen }}</span>
              </q-tooltip>
              <q-badge
                small
                rounded
                :color="`${lastSeen == 'online' ? 'green' : 'grey-9'}`"
                style="border: 2px solid white !important; border-radius: 100%"
              ></q-badge>
            </q-item-section>
          </div>
        </q-avatar>
      </div>

      <q-separator spacing class="separator-margin"></q-separator>

      <div class="centered-tabs" style="max-width: 800px">
        <q-card>
          <q-tabs
            v-model="activeTab"
            class="bg-grey-2 text-grey q-tabs__content"
            active-color="primary"
            indicator-color="bg-grey-2"
          >
            <div class="row q-flex q-mb-md" style="flex: 1; justify-content: flex-end; width: 100%">
              <q-tab name="tab-profile" label="Profile"></q-tab>
              <q-tab name="tab-photo" label="Photos"></q-tab>
            </div>

            <div class="row q-mb-md" style="flex: 1; width: 100%">
              <q-separator style="margin-left: 50px"></q-separator>

              <q-btn flat @click="onLikeClick">
                <img class="icon-size" :class="{ 'pop-like': animateLike }" :src="likeIcon" />
              </q-btn>

              <q-btn flat>
                <img
                  class="icon-size"
                  @click="goToChat"
                  :src="userCanChat ? chatFalse : chatTrue"
                />
              </q-btn>

              <div class="flex" style="display: flex; align-items: center; justify-content: center">
                <q-tooltip top class="status_container">
                  <span>You can block or report</span>
                </q-tooltip>
                <q-fab
                  vertical-actions-align="right"
                  text-color="black"
                  direction="right"
                  icon="mdi-chevron-double-right"
                  active-icon="mdi-window-close"
                  flat
                  square
                  padding="md sm md lg"
                  label-position="left"
                  label="."
                  bg-color="red"
                  class="icon-banir"
                >
                  <q-fab-action
                    flat
                    square
                    external-label
                    color="warning"
                    @click="confirmAlert('Report')"
                    class="icon-report"
                  >
                    <q-tooltip bottom class="status_container">
                      <span>Report</span>
                    </q-tooltip>
                  </q-fab-action>
                  <q-fab-action
                    flat
                    square
                    external-label
                    color="red"
                    @click="confirmAlert('Block')"
                    class="icon-block"
                  >
                    <q-tooltip bottom class="status_container">
                      <span>Block</span>
                    </q-tooltip>
                  </q-fab-action>
                </q-fab>
              </div>
            </div>
          </q-tabs>

          <q-separator spacing class="separator-margin"></q-separator>

          <q-tab-panels v-model="activeTab" animated class="bg-grey-2 text-black">
            <q-tab-panel name="tab-profile">
              <profile-form :user="user" />
            </q-tab-panel>

            <q-tab-panel name="tab-photo">
              <profile-gallery :images="filteredImages" :userToto="user"></profile-gallery>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>

      <q-dialog v-model="dialogVisible" persistent transition-show="rotate" transition-hide="scale">
        <q-card :class="`bg-${confirmDialog.color} text-white`" style="width: 300px">
          <q-card-section>
            <div class="text-h6">Alert</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            {{ confirmDialog.text }}
          </q-card-section>

          <q-card-actions align="right" class="bg-white text-teal">
            <q-btn flat :label="`${confirmDialog.no}`" color="green" v-close-popup></q-btn>
            <q-btn
              flat
              :label="`${confirmDialog.yes}`"
              color="red"
              @click="confirmDialog.block ? block() : reportUser()"
              v-close-popup
            ></q-btn>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <AlertView :alert="alert"></AlertView>
    </q-page-container>
    <LoaderView v-else />
  </q-page>
</template>

<script setup>
const onCoverBtnClick = () => {
  const el = document.getElementById('cover-upload')
  if (el) el.click()
}
const onProfileBtnClick = () => {
  const el = document.getElementById('profile-upload')
  if (el) el.click()
}
const onProfileChange = async (e) => {
  const token = localStorage.getItem('token')
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('image', file)
  try {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_APP_API_URL}/api/users/image`
    await axios.post(url, formData, {
      headers: {
        'x-auth-token': token,
        'Content-Type': 'multipart/form-data'
      }
    })
    alert.value = { state: true, color: 'green', text: 'Photo de profil mise à jour !' }
    // Only AlertView handles display; reload after alert closes
    setTimeout(() => {
      alert.value.state = false
      window.location.reload()
    }, 1000)
  } catch (err) {
    alert.value = { state: true, color: 'red', text: 'Erreur upload photo de profil' }
  }
}

const onCoverChange = async (e) => {
  const token = localStorage.getItem('token')
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('image', file)
  try {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_APP_API_URL}/api/users/image/cover`
    await axios.post(url, formData, {
      headers: {
        'x-auth-token': token,
        'Content-Type': 'multipart/form-data'
      }
    })
    alert.value = { state: true, color: 'green', text: 'Cover mise à jour !' }
    // Only AlertView handles display; reload after alert closes
    setTimeout(() => {
      alert.value.state = false
      window.location.reload()
    }, 1000)
  } catch (err) {
    alert.value = { state: true, color: 'red', text: 'Erreur upload cover' }
  }
}
onMounted(() => {
  socket.on('user-status-changed', () => {
    updateConnectedUsers()
  })
})

onBeforeUnmount(() => {
  if (socket) socket.off('user-status-changed')
})
import AlertView from '@/views/AlertView.vue'
import LoaderView from '@/views/LoaderView.vue'
import utility from '@/utility.js'
import ProfileEditor from '@/components/afterLogin/ProfileEditor.vue'
import ProfileTabs from '@/components/afterLogin/ProfileTabs.vue'
import ProfileForm from '@/components/afterLogin/ProfileForm.vue'
import ProfileSettings from '@/components/afterLogin/ProfileSettings.vue'
import ProfileGallery from '@/components/afterLogin/ProfileGallery.vue'
import { getImageSrc } from '@/utility.js'
import ProfileHistory from '@/components/afterLogin/ProfileHistory.vue'
import chatTrue from '@/assets/chat/chatUnavailable.png'
import chatFalse from '@/assets/chat/chat.png'
import banir from '@/assets/blocked.png'

import { ref, onMounted, computed, watch, toRefs, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import moment from 'moment'

import { getSocket } from '@/boot/socketClient'
const socket = getSocket()
const calculateDistance = utility.calculateDistance
const getLikeIcon = utility.getLikeIcon
const getFullPath = utility.getFullPath
const getLikeValue = utility.getLikeValue

const store = useStore()
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const fab = ref(false)
const updateTimer = ref(null)
const reportDialog = ref(false)
const dialogVisible = ref(false)
const user = ref({})
const data = ref(null)
const lastSeen = ref('Unavailable')
const activeTab = ref('tab-profile')
const userCanChat = ref(false)

const loggedIn = store.state.loggedIn
const followers = store.state.followers
const convos = store.state.convos
const blockDialog = ref(false)

let likeIcon = ref(getLikeIcon('default'))
let likedAlert = ref('default')
let lastHistory = ref('')
let allHistory = ref([])
let liked = ref(false)
const animateLike = ref(false)
// Avoid re-syncing matches multiple times per mount
const matchesSynced = ref(false)

const profileImage = computed(() => {
  // Select image where profile is true/1 and cover is not true/1
  const cachedDefault = utility.getCachedDefault ? utility.getCachedDefault('profile') : null
  const base = import.meta.env.BASE_URL || '/'
  const defaultImage = cachedDefault || `${base}default/defaut_profile.txt`
  if (!user.value || !user.value.images) return defaultImage
  const image = user.value.images.find(
    (cur) => (cur.profile === true || cur.profile === 1) && !(cur.cover === true || cur.cover === 1)
  )
  return getImageSrc(image, defaultImage)
})

const confirmDialog = ref({
  state: false,
  color: '',
  text: '',
  yes: '',
  no: '',
  block: false
})

const alert = ref({
  state: false,
  color: '',
  text: ''
})

const confirmAlert = (action) => {
  if (action === 'Block') {
    dialogVisible.value = true
    confirmDialog.value = {
      state: true,
      color: 'red',
      text: `Are you sure you want to block ${user.username}?`,
      yes: 'Block it',
      no: "Don't block",
      block: true
    }
  } else {
    dialogVisible.value = true
    confirmDialog.value = {
      state: true,
      color: 'warning',
      text: `Are you sure you want to report ${user.username}?`,
      yes: 'Report it',
      no: "Don't report",
      block: false
    }
  }
}

const getHistory = async () => {
  try {
    const token = user.value.token || localStorage.getItem('token')
    const url = `${import.meta.env.VITE_APP_API_URL}/api/browse/allhistory`
    const headers = { 'x-auth-token': token }
    const userId = String(route.params.id)
    const typesToFilter = [
      // Legacy detailed types (directional)
      'he_like',
      'you_like',
      'he_like_back',
      'you_like_back',
      'he_unlike',
      'you_unlike',
      // Backend canonical history types
      'like',
      'like_back',
      'unlike'
    ]
    const result = await axios.get(url, { headers })

    if (Array.isArray(result.data)) {
      const filteredByType = result.data.filter((item) => typesToFilter.includes(item.type))
      const filteredByHisId = filteredByType.filter((item) => String(item.his_id) === userId)
      // Latest event first
      filteredByHisId.sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
      const last = filteredByHisId[0]
      // Map canonical types to directional ones (this endpoint returns events where other acted on you)
      const raw = last ? last.type : 'default'
      const t =
        raw === 'like'
          ? 'he_like'
          : raw === 'like_back'
          ? 'he_like_back'
          : raw === 'unlike'
          ? 'he_unlike'
          : raw
      likeIcon.value = getLikeIcon(t)
      userCanChat.value = t === 'he_like_back' || t === 'you_like_back'
      likedAlert.value = t
      return t
    } else {
      if (result.data && result.data.msg) {
        alert.value = { state: true, color: 'red', text: result.data.msg }
      }
      if (!getHistory.logged) {
        console.error('getHistory: result.data is not an array', result.data)
        getHistory.logged = true
      }
      likeIcon.value = getLikeIcon('default')
      userCanChat.value = false
      likedAlert.value = 'default'
      return 'default'
    }
  } catch (err) {
    console.error('err history in frontend/ProfileHistory.vue ===> ', err)
  }
}

watch(
  user,
  async (newUser) => {
    const token = newUser.token || localStorage.getItem('token')
    if (token) {
      try {
        const url = `${import.meta.env.VITE_APP_API_URL}/api/auth/isloggedin`
        const headers = { 'x-auth-token': token }
        const res = await axios.get(url, { headers })
        data.value = res.data
        // Do not toggle page loading here; loading is controlled by data prefetch.
      } catch (err) {
        console.error('err watch user in frontend/MessengerView.vue ===> ', err)
      }
    }
  },
  { immediate: true }
)

// Recalculer l’icône/état dès que les listes de relations arrivent/évoluent
watch(
  () => [store.state.followers, store.state.following, route.params.id],
  () => {
    computeLocalRelation()
  },
  { deep: false }
)

const distance = computed(() => {
  const from = store.state.location
  const to = {
    lat: user.value.lat,
    lng: user.value.lng
  }
  const dist = calculateDistance(from, to)
  return `${Math.round(dist)} kms away`
})

const coverPhoto = computed(() => {
  const cachedDefault = utility.getCachedDefault ? utility.getCachedDefault('cover') : null
  const base = import.meta.env.BASE_URL || '/'
  const cover = cachedDefault || `${base}default/defaut_couverture.txt`
  if (!user.value || !user.value.images) return cover
  // Select image where cover is true/1 and profile is not true/1
  const image = user.value.images.find(
    (cur) => (cur.cover === true || cur.cover === 1) && !(cur.profile === true || cur.profile === 1)
  )
  return getImageSrc(image, cover)
})

const filteredImages = computed(() => {
  if (!user.value.images || !Array.isArray(user.value.images)) return []
  return user.value.images.filter((cur) => !cur.cover)
})

const userTags = computed(() => {
  const tags = user.value.tags
  if (!tags) return []
  return tags.split(',')
})

const getProfileImage = () => {
  const cachedDefault = utility.getCachedDefault ? utility.getCachedDefault('profile') : null
  const base = import.meta.env.BASE_URL || '/'
  const defaultImage = cachedDefault || `${base}default/defaut_profile.txt`
  if (!user.value || !user.value.images) return defaultImage
  const image = user.value.images.find((cur) => cur.profile === 1) || user.value.images[0]
  return getImageSrc(image, defaultImage)
}

function actionForType(type) {
  // Return liked boolean to send to backend
  switch (type) {
    case 'default':
    case 'he_unlike':
    case 'you_unlike':
    case 'he_like': // like back to confirm
      return true
    case 'you_like': // cancel your like
    case 'he_like_back': // unmatch
    case 'you_like_back': // unmatch
      return false
    default:
      return true
  }
}

// Calcul immédiat depuis le store pour afficher l'icône selon l'état actuel
function computeLocalRelation() {
  try {
    const userId = route.params.id ? String(route.params.id) : ''
    if (!userId) return
    const youLike =
      Array.isArray(store.state.following) &&
      store.state.following.some((p) => String(p.id) === userId)
    const heLike =
      Array.isArray(store.state.followers) &&
      store.state.followers.some((p) => String(p.id) === userId)

    let t = 'default'
    if (youLike && heLike) t = 'you_like_back'
    else if (youLike) t = 'you_like'
    else if (heLike) t = 'he_like'
    else t = 'default'

    likedAlert.value = t
    likeIcon.value = getLikeIcon(t)
    userCanChat.value = t === 'you_like_back' || t === 'he_like_back'
  } catch (e) {
    // En cas de souci, conserver l'icône par défaut
    likedAlert.value = 'default'
    likeIcon.value = getLikeIcon('default')
    userCanChat.value = false
  }
}

// Lire l'état directement depuis la DB: matches + conversations
async function fetchRelationFromDB() {
  try {
    const token = store.getters?.user?.token || localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const base = import.meta.env.VITE_APP_API_URL
    const [m, c] = await Promise.all([
      axios.get(`${base}/api/getmatches`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${base}/api/chat/all`, { headers }).catch(() => ({ data: [] }))
    ])
    const targetId = String(route.params.id)
    // Conversations autorisées -> mutual match garanti
    const convs = Array.isArray(c.data) ? c.data : Array.isArray(c.data?.body) ? c.data.body : []
    const convAllowed = convs.some(
      (v) => String(v.user_id) === targetId && (v.allowed === true || v.allowed === 1)
    )

    // Matches: unique par username, on distingue les directions via matched_id/matcher_id
    const arr = Array.isArray(m.data) ? m.data : Array.isArray(m.data?.body) ? m.data.body : []
    const youLike = arr.some((it) => String(it.matched_id) === targetId)
    const heLike = arr.some((it) => String(it.matcher_id) === targetId)

    let t = 'default'
    if (convAllowed || (youLike && heLike)) t = 'you_like_back'
    else if (youLike) t = 'you_like'
    else if (heLike) t = 'he_like'
    else t = 'default'

    likedAlert.value = t
    likeIcon.value = getLikeIcon(t)
    userCanChat.value = t === 'you_like_back' || t === 'he_like_back'
    return t
  } catch (e) {
    return 'default'
  }
}

// Lire l'état le plus récent depuis les notifications (like / like_back / unlike)
async function fetchRelationFromNotif() {
  try {
    const items = await utility.syncNotif({ limit: 100, page: 1, mode: 'all', includeBlocked: 1 })
    const targetId = String(route.params.id)
    const arr = Array.isArray(items) ? items : []
    const valid = ['like', 'like_back', 'unlike']
    // Filtrer les notifs du profil cible
    const related = arr.filter((it) => String(it.id_from) === targetId && valid.includes(it.type))
    // Trier par date descendante si dispo, sinon par id
    related.sort(
      (a, b) =>
        new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0) ||
        Number(b.id) - Number(a.id)
    )
    const last = related[0]
    let t = 'default'
    if (last) {
      t =
        last.type === 'like'
          ? 'he_like'
          : last.type === 'like_back'
          ? 'he_like_back'
          : last.type === 'unlike'
          ? 'he_unlike'
          : 'default'
    }
    likedAlert.value = t
    likeIcon.value = getLikeIcon(t)
    userCanChat.value = t === 'you_like_back' || t === 'he_like_back'
    return t
  } catch (_) {
    return 'default'
  }
}

const matchFunction = async () => {
  const url = `${import.meta.env.VITE_APP_API_URL}/api/match`
  const token = store.state.user?.token || localStorage.getItem('token')
  const headers = { 'x-auth-token': token }
  try {
    // Déterminer l'état courant en priorité depuis la DB (source de vérité)
    let currentType = likedAlert.value || 'default'
    try {
      const t = await fetchRelationFromDB()
      if (t && typeof t === 'string' && t !== 'default') currentType = t
    } catch (_) {}
    const likedBool = actionForType(currentType)
    const body = { id: Number(route.params.id), liked: likedBool }

    // Optimistic UI update
    const prevType = likedAlert.value
    const optimisticType = likedBool
      ? currentType === 'he_like'
        ? 'you_like_back'
        : 'you_like'
      : 'you_unlike'
    likedAlert.value = optimisticType
    likeIcon.value = getLikeIcon(optimisticType)
    userCanChat.value = optimisticType === 'you_like_back' || optimisticType === 'he_like_back'

    const res = await axios.post(url, body, { headers })
    if (!res.data?.msg) {
      // Success: user feedback
      if (likedBool) {
        if (currentType === 'he_like') {
          alert.value = {
            state: true,
            color: 'green',
            text: `You have just accepted the friend request from ${user.value.first_name} ${user.value.last_name}`
          }
        } else {
          alert.value = {
            state: true,
            color: 'green',
            text: `Your friendship request has been sent to ${user.value.first_name} ${user.value.last_name} successfully`
          }
        }
      } else {
        alert.value = {
          state: true,
          color: 'red',
          text: `You just removed ${user.value.first_name} ${user.value.last_name} from your friend list`
        }
      }
      socket && socket.emit('match', body)
      // Rafraîchir l'état depuis la DB et les notifications
      fetchRelationFromDB().then(() => fetchRelationFromNotif())
    } else {
      // Server returned an error message: revert optimistic UI
      likedAlert.value = prevType
      likeIcon.value = getLikeIcon(prevType)
      userCanChat.value = prevType === 'you_like_back' || prevType === 'he_like_back'
      alert.value = { state: true, color: 'red', text: res.data.msg }
    }
  } catch (error) {
    // Revert optimistic UI on error
    const prevType = 'default'
    likedAlert.value = prevType
    likeIcon.value = getLikeIcon(prevType)
    userCanChat.value = false
    if (error.response && error.response.status === 404) {
      alert.value = {
        state: true,
        color: 'red',
        text: "Erreur : la route /api/match n'existe pas sur le serveur. Veuillez contacter l'administrateur."
      }
    } else {
      alert.value = {
        state: true,
        color: 'red',
        text: "Une erreur s'est produite : " + (error.message || 'Erreur inconnue')
      }
    }
    console.error('matchFunction error:', error)
  }
}

const onLikeClick = () => {
  try {
    animateLike.value = true
    setTimeout(() => (animateLike.value = false), 300)
  } catch (_) {}
  matchFunction()
}

const block = async () => {
  const url = `${import.meta.env.VITE_APP_API_URL}/api/users/block`
  let data = { id: route.params.id }
  const token = user.value.token || localStorage.getItem('token')
  const headers = { 'x-auth-token': token }
  const res = await axios.post(url, data, { headers })
  if (!res.data.msg) {
    alert.value = {
      state: true,
      color: 'green',
      text: `you have blocked ${user.username}, you can no longer access his profile, you will be redirected to the home page`
    }
    data = {
      id_from: store.getters.user.id,
      id_to: route.params.id
    }
    socket && socket.emit('block', data)
    // Wait for AlertView to close before redirect
    setTimeout(() => {
      alert.value.state = false
      router.push('/')
    }, 2000)
  } else {
    alert.value = { state: true, color: 'red', text: res.data.msg }
  }
}

const reportUser = async () => {
  const url = `${import.meta.env.VITE_APP_API_URL}/api/users/report`
  const data = { id: route.params.id }
  const token = user.value.token || localStorage.getItem('token')
  const headers = { 'x-auth-token': token }
  const res = await axios.post(url, data, { headers })
  if (!res.data.msg) {
    alert.value = { state: true, color: 'green', text: 'User reported successfuly' }
  } else {
    alert.value = { state: true, color: 'red', text: res.data.msg }
  }
}

const syncConvo = async (convo) => {
  try {
    store.dispatch('syncConvo', convo[0])
    router.push('/chat').catch((err) => {
      console.error('err syncConvo router.push in frontend/NavbarView.view ===> ', err)
    })
  } catch (err) {
    console.error('err syncConvo in frontend/NavbarView.view ===> ', err)
  }
}

const goToChat = async () => {
  if (!userCanChat.value) {
    alert.value = {
      state: true,
      color: 'red',
      text: `You will need to add ${user.value.first_name} ${user.value.last_name} to your friends list to be able to chat with him`
    }
    return
  }

  const conversation = store.getters.convos.filter((obj) => obj.user_id == route.params.id)
  if (conversation && conversation.length) {
    syncConvo(conversation)
  } else {
    router.push('/chat').catch((err) => console.error('goToChat push error', err))
  }
}

const fetchUser = async (id) => {
  if (id && loading.value) {
    if (user.id === id) {
      router.push('/settings')
    } else {
      try {
        const token = user.token || localStorage.getItem('token')
        const headers = { 'x-auth-token': token }
        const url = `${import.meta.env.VITE_APP_API_URL}/api/users/show/${id}`
        const res = await axios.get(url, { headers })
        if (res.data.msg) {
          router.push('/404')
        }
        loading.value = false
        user.value = { ...res.data, rating: Number(res.data.rating) }
        const profileImg = res.data.images.find((cur) => cur.profile === 1)

        const data = {
          date: new Date(),
          id_from: store.state.user.id,
          username: store.state.user.username,
          profile_image: profileImg ? profileImg.name : 'default/defaut_profile.txt',
          id_to: id,
          type: 'visit'
        }
        socket && socket.emit('visit', data)
        loading.value = false
      } catch (err) {
        console.error(err)
      }
    }
  }
}

// Use prefetched user from route meta (set by router beforeEnter)
const prefetched = route?.meta?.prefetchedUser
if (prefetched) {
  user.value = { ...prefetched, rating: Number(prefetched.rating) }
  loading.value = false
  // Dès que l'utilisateur est prêt, tenter d'afficher l'icône correcte
  computeLocalRelation()
}

function updateConnectedUsers() {
  if (user.value && route.params.id) {
    utility
      .getConnectedUsers()
      .then((data) => {
        const connectedUserIds = data
        const userId = route.params.id ? route.params.id.toString() : ''
        if (userId && connectedUserIds.includes(userId)) {
          lastSeen.value = 'online'
        } else {
          lastSeen.value = user.value.status
            ? moment(user.value.status).utc().fromNow()
            : 'Unavailable'
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des données :', error)
      })
  }
}

onMounted(async () => {
  // Validate route param and start lightweight polling only
  if (isNaN(route.params.id) || !route.params.id) {
    router.push('/404')
    return
  }
  // Sync matches once (followers/following) for DB-driven local derivation
  if (!matchesSynced.value) {
    try {
      await store.dispatch('syncMatches')
    } catch (_) {}
    matchesSynced.value = true
  }
  // Relation init: prefer DB, then notif, then local store as last fallback
  try {
    const t = await fetchRelationFromDB()
    if (t === 'default') {
      const n = await fetchRelationFromNotif()
      if (n === 'default') computeLocalRelation()
    }
  } catch (_) {
    computeLocalRelation()
  }
  // Start polling for connected users at a lower frequency
  refreshInterval = setInterval(() => {
    updateConnectedUsers()
  }, 5000)
  // No history-based override here to avoid icon flicker/double-loading
})

function refreshMethods() {
  updateConnectedUsers()
}

let refreshInterval = null

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<style scoped>
.icon-banir {
  background-image: url('@/assets/Block/banir.png');
  background-size: 40px !important;
  background-position: center bottom;
  background-repeat: no-repeat;
}
.icon-block {
  background-image: url('@/assets/Block/block.png');
  background-size: 25px;
  background-repeat: no-repeat;
}
.icon-report {
  background-image: url('@/assets/Block/report.png');
  background-size: 25px;
  background-repeat: no-repeat;
}
.icon-size {
  width: 42px;
  transition: transform 120ms ease;
}
.icon-size.pop-like {
  animation: pop-like 260ms ease-out;
}
@keyframes pop-like {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}
.q-tabs__content {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  padding: 0;
}
.separator-margin {
  margin-left: -2000px;
  margin-right: -2000px;
  z-index: 1;
}
.page-container {
  font-family: 'Elliane' !important;
  color: black;
  margin-top: -87px !important;
  margin-bottom: 0px !important;
}
.container {
  width: 100%;
}
.profile__container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2em;
}
.profile__cover {
  width: 100%;
  height: 450px;
  top: 0;
  margin-top: 0;
  overflow: hidden;
  position: relative;
}
.cover__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-repeat: no-repeat;
}
.profile__avatar {
  position: absolute;
  size: 170px;
  top: 470px;
  left: 3%;
  z-index: 7;
}
.update__img {
  z-index: 10;
  color: black;
  position: absolute;
  transform: translate(50%, 50%) scale(1);
  background: rgba(211, 211, 211, 0.3);
}
.centered-tabs {
  max-width: 800px;
  margin: 0 auto;
}
.avatar-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
</style>
