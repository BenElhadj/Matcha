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
        <div class="profile__avatar mx-auto">
          <AppAvatar
            :image="profileImage"
            size="large"
            :showPresence="true"
            :userId="route.params.id"
          >
            <!-- Distance badge anchored on the avatar (bottom-left, inside) -->
            <div class="avatar-distance">
              <q-chip outline small text-color="black" style="background: white !important">{{
                distance
              }}</q-chip>
            </div>

            <!-- Keep other slot content centered if needed (tooltip, etc.) -->
            <div class="avatar-content">
              <q-item-section side>
                <q-tooltip bottom class="status_container">
                  <span>{{ lastSeen }}</span>
                </q-tooltip>
                <!-- Presence dot handled by AppAvatar; badge removed to avoid duplication -->
              </q-item-section>
            </div>
          </AppAvatar>
          <div v-if="showProfileEditBtn" style="margin-top: 10px">
            <input
              type="file"
              id="profile-upload"
              accept="image/*"
              @change="onProfileChange"
              style="display: none"
            />
            <q-btn label="Changer la photo de profil" color="primary" @click="onProfileBtnClick" />
          </div>
        </div>
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
const showProfileEditBtn = computed(() => {
  // Show only if on /settings or viewing own profile
  return route.path === '/settings' || String(route.params.id) === String(store.getters.user?.id)
})
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
// Presence handled via store getters; no HTTP polling or ad-hoc socket events needed
import AlertView from '@/views/AlertView.vue'
import LoaderView from '@/views/LoaderView.vue'
import utility from '@/utility.js'
import AppAvatar from '@/components/common/AppAvatar.vue'
import ProfileEditor from '@/components/afterLogin/ProfileEditor.vue'
import ProfileTabs from '@/components/afterLogin/ProfileTabs.vue'
import ProfileForm from '@/components/afterLogin/ProfileForm.vue'
import ProfileSettings from '@/components/afterLogin/ProfileSettings.vue'
import ProfileGallery from '@/components/afterLogin/ProfileGallery.vue'
import { getImageSrc } from '@/utility.js'
import ProfileHistory from './ProfileHistory.vue'
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
// Chat availability derived from relationType
const userCanChat = computed(() => relationType.value === 'you_like_back')

const loggedIn = store.state.loggedIn
const followers = store.state.followers
const convos = store.state.convos
const blockDialog = ref(false)

const relationType = computed(() =>
  utility.deriveRelationState({
    selfId: store.getters.user?.id,
    targetId: route.params.id,
    followers: store.getters.followers || [],
    following: store.getters.following || [],
    convos: store.getters.convos || [],
    flags: store.state.user?.relation || { unlike: {} }
  })
)

const likeIcon = computed(() => getLikeIcon(relationType.value))
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
// reactive derivation handled by relationType computed

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
  // DB-only: default/he_like -> like; you_like/you_like_back -> unlike
  switch (type) {
    case 'default':
    case 'he_like':
      return true
    case 'you_like':
    case 'you_like_back':
      return false
    default:
      return true
  }
}

// Calcul immédiat depuis le store pour afficher l'icône selon l'état actuel
function computeLocalRelation() {
  /* replaced by relationType computed */
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
    return t
  } catch (e) {
    return 'default'
  }
}

// Notifications are not used to derive relation for icons anymore

const onLikeClick = async () => {
  try {
    animateLike.value = true
    setTimeout(() => (animateLike.value = false), 300)
  } catch (_) {}
  try {
    const likedBool = actionForType(relationType.value)
    const url = `${import.meta.env.VITE_APP_API_URL}/api/match`
    const token = store.state.user?.token || localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const body = { id: Number(route.params.id), liked: !!likedBool }
    const res = await axios.post(url, body, { headers })
    if (res.data?.msg && !res.data?.ok) {
      alert.value = { state: true, color: 'red', text: res.data.msg }
      return
    }
    // Light success alert (no confirm flow)
    const msg = res.data?.message || 'Action effectuée.'
    alert.value = { state: true, color: 'green', text: msg }
    // Persist dislike locally if action is unlike, clear otherwise
    if (!likedBool) {
      store.commit('markUnlike', { id: Number(route.params.id), dir: 'you_unlike' })
    } else {
      store.commit('clearUnlike', Number(route.params.id))
    }
    // Refresh from DB so icons reflect server state immediately
    await Promise.allSettled([store.dispatch('syncMatches'), store.dispatch('syncConvoAll')])
  } catch (e) {
    alert.value = { state: true, color: 'red', text: e?.message || 'Erreur inconnue' }
  }
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

        // Ne pas notifier si on visite son propre profil
        if (store.state.user.id !== id) {
          const data = {
            date: new Date(),
            id_from: store.state.user.id,
            username: store.state.user.username,
            profile_image: profileImg ? profileImg.name : 'default/defaut_profile.txt',
            id_to: id,
            type: 'visit'
          }
          socket && socket.emit('visit', data)
        }
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

// Presence via store (socket online list)
const isOnline = computed(() => {
  try {
    const ids = store.getters.connectedUsers || []
    const id = route.params.id ? String(route.params.id) : ''
    return id && Array.isArray(ids) ? ids.includes(id) : false
  } catch (_) {
    return false
  }
})
watch(
  isOnline,
  (val) => {
    lastSeen.value = val
      ? 'online'
      : user.value.status
      ? moment(user.value.status).utc().fromNow()
      : 'Unavailable'
  },
  { immediate: true }
)

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
  // Relation init: prefer DB/notif to warm store; rendering follows relationType computed
  try {
    await fetchRelationFromDB()
  } catch (_) {
    computeLocalRelation()
  }
  // No HTTP presence polling
})

function refreshMethods() {
  updateConnectedUsers()
}

onBeforeUnmount(() => {})
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
/* Distance badge positioned on the large avatar (bottom-left, just inside) */
.avatar-distance {
  position: absolute;
  /* Move slightly up and to the right */
  bottom: 26px;
  left: 32px;
  z-index: 3;
}
@media (max-width: 600px) {
  /* Slightly less offset on small screens */
  .avatar-distance {
    bottom: 20px;
    left: 24px;
  }
}
@media (min-width: 1200px) {
  /* Slightly more offset on wide screens */
  .avatar-distance {
    bottom: 32px;
    left: 38px;
  }
}
</style>
