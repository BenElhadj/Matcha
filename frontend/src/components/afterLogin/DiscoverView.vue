<template>
  <q-page>
    <div v-if="isComplete" class="discover">
      <q-page-container v-if="loaded" class="pt-5 px-0">
        <q-layout class="row wrap justify-start">
          <div class="col-auto filters-panel">
            <div class="px-5">
              <q-layout class="column">
                <div class="row items-center justify-between q-mb-md">
                  <h4 class="title q-ma-none">Search</h4>
                  <div class="row items-center">
                    <div class="text-subtitle2">Online: {{ onlineCount }}</div>
                    <div class="q-ml-md text-caption">Showing: {{ sorted.length }}</div>
                  </div>
                </div>
                <q-input
                  v-model="recherche"
                  class="location_input mb-5"
                  color="primary"
                  hide-details
                  outlined
                  solo
                  text
                  label="First/Last name or Nickname"
                  placeholder="Recherche"
                >
                  <template v-slot:append>
                    <q-icon name="mdi-magnify"></q-icon>
                  </template>
                </q-input>
                <h4 class="title mb-4">Gender</h4>
                <q-btn-toggle
                  v-model="gender"
                  spread
                  no-caps
                  toggle-color="blue"
                  color="white"
                  text-color="black"
                  :options="[
                    { label: 'Man', value: 'male' },
                    { label: 'Woman', value: 'female' },
                    { label: 'Other', value: 'other' },
                    { label: 'All', value: 'all' }
                  ]"
                />
                <h4 class="title mb-3">Distance</h4>
                <q-range
                  v-model="distance"
                  :min="0"
                  :max="maxDis"
                  :step="step"
                  label-always
                  thumb-label="always"
                  thumb-size="30"
                  class="custom-slider mx-3 mb-5 pt-3"
                ></q-range>

                <h4 class="title mb-3">Age</h4>
                <q-range
                  v-model="age"
                  :min="18"
                  :max="85"
                  :step="1"
                  label-always
                  thumb-label="always"
                  thumb-size="25"
                  class="custom-slider mx-3 mb-4 pt-3"
                ></q-range>

                <h4 class="title mb-3">Rating</h4>
                <q-range
                  v-model="rating"
                  :min="0"
                  :max="ratingCap"
                  :step="0.1"
                  label-always
                  thumb-label="always"
                  thumb-size="25"
                  class="mx-3 mb-5 pt-3"
                ></q-range>

                <h4 class="title mb-4">Location</h4>
                <q-input
                  v-model="location"
                  class="location_input mb-5"
                  label="City or Town"
                  color="primary"
                  hide-details
                  outlined
                  solo
                  text
                >
                  <template v-slot:append>
                    <q-icon name="mdi-map-marker" />
                  </template>
                </q-input>

                <h4 class="title mb-4">Interests</h4>
                <q-select
                  v-model="interests"
                  :options="allTags"
                  multiple
                  hide-dropdown-icon
                  label="Select tag"
                  style="width: 250px"
                  outlined
                />

                <div class="row justify-between mb-4">
                  <h4 class="title">Sort by</h4>
                  <q-btn
                    @click="changeSort"
                    flat
                    round
                    style="width: 10px"
                    color="primary"
                    icon="mdi-sort"
                    :class="`sort_icon ${sortDir < 0 ? 'flip' : ''}`"
                    class="clear_btn"
                  />
                </div>
                <q-select
                  v-model="sort"
                  outlined
                  solo
                  hide-dropdown-icon
                  :options="sortTypes"
                  label="Sort by"
                  class="sort_select"
                />

                <div class="row justify-between mb-4">
                  <h4 class="title mb-4">Reset all</h4>
                  <q-btn
                    @click="reset"
                    flat
                    round
                    style="width: 10px"
                    class="clear_btn"
                    color="primary"
                    icon="mdi-refresh"
                  />
                </div>
              </q-layout>
            </div>
          </div>

          <div class="col-grow position-relative grid-column">
            <div class="q-px-md">
              <div class="grid-wrapper position-relative">
                <div class="cards-grid">
                  <div v-for="user in sorted" :key="user.user_id" class="user">
                    <router-link :to="{ name: 'userprofile', params: { id: user.user_id } }">
                      <user-card :user="user" />
                    </router-link>
                  </div>
                </div>
                <q-infinite-scroll
                  :offset="300"
                  @load="onInfiniteLoad"
                  :disable="isFetching || users.length >= total"
                >
                  <div style="height: 1px"></div>
                </q-infinite-scroll>

                <!-- Overlay limited to the grid area only -->
                <div class="loader-overlay" v-show="isFetching">
                  <LoaderView />
                </div>

                <!-- No results placeholder -->
                <div
                  v-if="loaded && !isFetching && total === 0"
                  class="no-results q-pa-lg text-center text-grey-7"
                >
                  Aucun résultat
                </div>
              </div>
            </div>
          </div>
        </q-layout>
      </q-page-container>
      <LoaderView v-else />
    </div>

    <q-page-container v-else class="my-3">
      <div class="row wrap justify-center">
        <h2 class="text-xs-center pt-4 pb-3 mb-4 grey--text mx-auto">
          Complete your profile to have the opportunity to discover users who match you !
        </h2>
        <div class="col-6 col-md-4">
          <q-btn block outlined large to="/settings" color="primary">
            <q-icon left name="mdi-chevron-left"></q-icon>
            <span>Go to</span>
          </q-btn>
        </div>
      </div>
    </q-page-container>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import UserCard from '@/components/afterLogin/UserCard.vue'
import LoaderView from '@/views/LoaderView.vue'
import countries from '@/nats.json'
import utility from '@/utility'
import { matMenu } from '@quasar/extras/material-icons'
import { mdiAbTesting } from '@quasar/extras/mdi-v5'
import { useRouter } from 'vue-router'

import { getSocket } from '@/boot/socketClient'
const socket = getSocket()

const connectedUsers = computed(() => store.state.connectedUsers)

const router = useRouter()
const store = useStore()
const { user, allTags, status, online, blocked, blockedBy } = store.getters
const userLocation = store.state.location
const model = ref(null)
const max = ref(0)
const step = ref(0)
const sortDir = ref(1)
const sort = ref(null)
const users = ref([])
const interests = ref([])
const gender = ref(null)
const location = ref(null)
const hasBoth = ref(false)
const hasAll = ref(false)
const loaded = ref(false)
const age = ref({ min: 18, max: 85 })
const rating = ref({ min: 0, max: 100 })
const distance = ref({ min: 0, max: 10000 })
const maxDis = ref(10000)
const programmaticUpdate = ref(false)
const distanceTouched = ref(false)
const ratingTouched = ref(false)
const ratingCap = ref(100)
const sortTypes = ['age', 'distance', 'rating', 'interests']
const nats = ref(countries)
const recherche = ref('')

// Apply default gender from user's "looking" preference on first load
try {
  const looking = user && user.looking ? String(user.looking) : 'all'
  // looking can be 'all' | 'male' | 'female' | 'other'
  gender.value = ['male', 'female', 'other', 'all'].includes(looking) ? looking : 'all'
} catch (_) {}

// Server-driven pagination
const page = ref(1)
const limit = ref(50)
const total = ref(0)
const isFetching = ref(false)
// const isRefreshing = ref(false)
let abortController = null

const filters = {
  self: (val) => val.user_id !== user.id,
  blocked: (val) => !blocked.includes(val.user_id),
  blockedBy: (val) => !blockedBy.includes(val.user_id),
  rating: (val) => val.rating >= rating.value.min && val.rating <= rating.value.max,
  gender: (val) => {
    // Check if gender.value is 'all' and return true, or apply the regular filter logic
    return gender.value === 'all' || !gender.value || val.gender === gender.value
  },
  location: (val) =>
    !location.value ||
    [val.country, val.address, val.city].some((cur) => cur && cur.includes(location.value)),
  distance: (val) => {
    const d = typeof val.distanceKm === 'number' ? val.distanceKm : 0
    return d >= distance.value.min && d <= distance.value.max
  },
  age: (val) => {
    const years = typeof val.ageYears === 'number' ? val.ageYears : 0
    return years >= age.value.min && years <= age.value.max
  },
  interest: (val) => {
    if (!interests.value.length) return true
    for (const interest of interests.value) if (val.tags.split(',').includes(interest)) return true
    return false
  },
  search: (val) =>
    !recherche.value ||
    (val.username && val.username.toLowerCase().includes(recherche.value.toLowerCase())) ||
    (val.first_name && val.first_name.toLowerCase().includes(recherche.value.toLowerCase())) ||
    (val.last_name && val.last_name.toLowerCase().includes(recherche.value.toLowerCase()))
}

// Display list is server-filtered/sorted; we only apply location string locally for now
const displayed = computed(() => {
  const meId = String(user.id)
  const q = (location.value || '').toLowerCase().trim()
  const s = (recherche.value || '').toLowerCase().trim()
  return users.value
    .filter((val) => String(val.user_id) !== meId)
    .filter(
      (val) =>
        !q ||
        [val.country, val.city]
          .map((s) => (s || '').toLowerCase())
          .some((cur) => cur && cur.includes(q))
    )
    .filter(
      (val) =>
        !s ||
        (val.username && val.username.toLowerCase().includes(s)) ||
        (val.first_name && val.first_name.toLowerCase().includes(s)) ||
        (val.last_name && val.last_name.toLowerCase().includes(s))
    )
})

// search handled reactively via filters.search

const ageCalc = (birthdate) => {
  const bd = new Date(birthdate)
  if (isNaN(bd)) return 0
  const diff = Date.now() - bd.getTime()
  const ageDate = new Date(diff)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
}

// const commonTags = (user, tags) => {
//   if (!tags || !tags.length) return 0
//   const userTags = user.tags.split(',')
//   return tags.split(',').filter((val) => userTags.includes(val)).length
// }

// Server provides sorted results with online-first; keep ordering and only group by live presence if needed
const sorted = computed(() => {
  const onlineUsers = displayed.value.filter((u) => u.isConnected)
  const offlineUsers = displayed.value.filter((u) => !u.isConnected)
  // Preserve incoming order from server; do not re-sort beyond online grouping
  const orderMap = new Map()
  users.value.forEach((u, idx) => orderMap.set(u.user_id, idx))
  const byOrder = (a, b) => (orderMap.get(a.user_id) ?? 0) - (orderMap.get(b.user_id) ?? 0)
  return [...onlineUsers.sort(byOrder), ...offlineUsers.sort(byOrder)]
})

// Server-side distance filter uses a fixed cap; no need to recompute max from client data

// Online users counter (reacts to presence updates)
const onlineCount = computed(() => displayed.value.filter((u) => !!u.isConnected).length)

// Removed unused/buggy watcher that referenced an undefined ref (hasOther)

// Remove legacy array-based min/max correction watchers; we use {min,max} objects now

function whoIsUp() {
  users.value.forEach((user, i) => {
    if (connectedUsers.value.includes(user.user_id.toString())) {
      users.value[i].lastSeen = 'online'
      users.value[i].isConnected = true
    } else {
      users.value[i].lastSeen = user.status
      users.value[i].isConnected = false
    }
  })
  return users.value
}

const shouldReset = ref(false)

function reset() {
  sortDir.value = 1
  sort.value = null
  // Reset gender to 'all' explicitly
  gender.value = 'all'
  age.value = { min: 18, max: 85 }
  programmaticUpdate.value = true
  rating.value = { min: 0, max: ratingCap.value }
  ratingTouched.value = false
  programmaticUpdate.value = false
  distance.value = { min: 0, max: 10000 }
  location.value = null
  recherche.value = ''
  interests.value = []
  page.value = 1
  users.value = []
  fetchDiscover({ resetPage: true })
}
function changeSort() {
  sortDir.value = -sortDir.value
}

const isComplete = computed(() => {
  return (
    user.gender &&
    user.looking &&
    user.biography &&
    user.tags &&
    user.images.length &&
    user.city &&
    user.country &&
    user.postal_code
  )
})

async function fetchDiscover({ resetPage = false } = {}) {
  const token = localStorage.getItem('token')
  const headers = { 'x-auth-token': token }
  // Abort any in-flight request
  if (abortController) {
    try {
      abortController.abort()
    } catch (_) {}
  }
  abortController = new AbortController()
  if (resetPage) page.value = 1
  // If we already have data, keep it visible while fetching
  if (users.value.length > 0) loaded.value = true
  const params = {
    page: page.value,
    limit: limit.value,
    onlineFirst: 1,
    sortBy: sort.value || 'distance',
    sortDir: sortDir.value >= 0 ? 'asc' : 'desc',
    search: recherche.value || undefined,
    gender: gender.value && gender.value !== 'all' ? gender.value : undefined,
    ageMin: age.value?.min ?? 18,
    ageMax: age.value?.max ?? 85,
    // Only include rating bounds if the user adjusted the slider
    ratingMin: ratingTouched.value ? rating.value?.min : undefined,
    ratingMax: ratingTouched.value ? rating.value?.max : undefined,
    distanceMax:
      distance.value && typeof distance.value.max === 'number' && distance.value.max > 0
        ? distance.value.max
        : maxDis.value || 10000,
    lat: userLocation?.lat,
    lng: userLocation?.lng,
    tags: interests.value && interests.value.length ? interests.value.join(',') : undefined
  }
  const url = `${import.meta.env.VITE_APP_API_URL}/api/users/discover`
  isFetching.value = true
  // Show a unified overlay via isFetching; no separate isRefreshing flag
  try {
    const res = await axios.get(url, { headers, params, signal: abortController.signal })
    if (res.data && !res.data.msg) {
      const { items = [], total: t = 0, maxDistance: md = null, maxRating: mr = null } = res.data
      total.value = t
      const shaped = items.map((cur) => ({
        ...cur,
        // ensure numeric types
        rating: Number(cur.rating),
        ageYears: typeof cur.ageYears === 'number' ? cur.ageYears : ageCalc(cur.birthdate),
        distanceKm: Number(cur.distanceKm) || 0
      }))
      if (page.value === 1) users.value = shaped
      else users.value = [...users.value, ...shaped]
      // update presence flags
      whoIsUp()
      // Update rating slider cap from server-provided maxRating on first page
      if (page.value === 1 && mr != null) {
        const nextCap = Math.max(0, Number(mr))
        if (isFinite(nextCap) && nextCap > 0 && nextCap !== ratingCap.value) {
          ratingCap.value = nextCap
          if (!ratingTouched.value) {
            programmaticUpdate.value = true
            rating.value = { min: 0, max: nextCap }
            setTimeout(() => (programmaticUpdate.value = false), 0)
          } else {
            // Clamp current selection within new cap without refetch loop
            const cur = rating.value || { min: 0, max: nextCap }
            const clamped = {
              min: Math.max(0, Math.min(cur.min ?? 0, nextCap)),
              max: Math.max(0, Math.min(cur.max ?? nextCap, nextCap))
            }
            programmaticUpdate.value = true
            rating.value = clamped
            setTimeout(() => (programmaticUpdate.value = false), 0)
          }
        }
      }
      // Update slider max from server-provided maxDistance on first page
      if (page.value === 1 && md != null) {
        const nextMax = Math.max(0, Math.ceil(md))
        if (nextMax !== maxDis.value) {
          maxDis.value = nextMax
        }
        // Only override selection if user hasn't touched the slider yet
        if (!distanceTouched.value) {
          programmaticUpdate.value = true
          distance.value = { min: 0, max: nextMax }
          setTimeout(() => (programmaticUpdate.value = false), 0)
        } else {
          // Clamp to bounds if needed without causing fetch loop
          const cur = distance.value || { min: 0, max: nextMax }
          const clamped = {
            min: Math.max(0, Math.min(cur.min ?? 0, nextMax)),
            max: Math.max(0, Math.min(cur.max ?? nextMax, nextMax))
          }
          programmaticUpdate.value = true
          distance.value = clamped
          setTimeout(() => (programmaticUpdate.value = false), 0)
        }
      }
      // Mark loaded on first successful fetch so cards render
      loaded.value = true
    } else if (res.data && res.data.msg === 'Not logged in') {
      router.push('/login')
    }
  } catch (e) {
    // Ignore abort/cancel errors from rapid filter changes
    const msg = e && (e.message || '')
    const code = e && e.code
    const name = e && e.name
    const isCanceled =
      code === 'ERR_CANCELED' || name === 'CanceledError' || /abort|cancel/i.test(msg || '')
    if (!isCanceled) {
      // Redirect only if we have no data to show
      if ((users.value?.length || 0) === 0) {
        router.push(`/server-waking?redirect=${encodeURIComponent('/discover')}`)
      }
    }
  } finally {
    isFetching.value = false
  }
}

// Presence is driven globally in main.js; react here to store changes for instant UI updates
watch(
  connectedUsers,
  () => {
    whoIsUp()
  },
  { immediate: true }
)

onMounted(() => fetchDiscover({ resetPage: true }))

// Ensure matches (followers/following) are synced so UserCard icons can compute state from DB
onMounted(async () => {
  try {
    await store.dispatch('syncMatches')
  } catch (_) {}
})

onBeforeUnmount(() => {})

// Debounce filter changes to refetch from server
let debounceTimer = null
watch(
  [recherche, gender, age, rating, distance, interests, sort, sortDir],
  () => {
    if (programmaticUpdate.value) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      fetchDiscover({ resetPage: true })
    }, 300)
  },
  { deep: true }
)

// Detect manual changes to distance
watch(
  distance,
  () => {
    if (!programmaticUpdate.value) distanceTouched.value = true
  },
  { deep: true }
)

// Detect manual changes to rating
watch(
  rating,
  () => {
    if (!programmaticUpdate.value) ratingTouched.value = true
  },
  { deep: true }
)

// Infinite scroll handler with LoaderView overlay via isFetching
async function onInfiniteLoad(index, done) {
  if (isFetching.value || users.value.length >= total.value) {
    done()
    return
  }
  page.value += 1
  await fetchDiscover()
  done()
}
</script>

<style scoped>
a {
  text-decoration: none;
  color: inherit;
}

.discover {
  margin-left: 80px;
}
.v-slider {
  opacity: 0.7;
}

.theme--light.v-input:not(.v-input--is-disabled) input,
.v-list.theme--light {
  color: #777 !important;
}

.tags_menu > .v-input__control > .v-input__slot,
.loaction_input > .v-input__control > .v-input__slot,
.sort_select > .v-input__control > .v-input__slot {
  display: block;
}

.v-slider.v-slider--is-active,
.tags_menu.v-select--is-menu-active > .v-input__control > .v-input__slot,
.sort_select.v-select--is-menu-active > .v-input__control > .v-input__slot,
.loaction_input.v-input--is-focused > .v-input__control > .v-input__slot {
  opacity: 1;
}

.loaction_input > .v-input__control > .v-input__slot > .v-text-field__slot > input {
  margin: 0;
}

.v-input__icon.v-input__icon--append > .q-icon {
  color: var(--color-primary);
}

.v-select-list.v-card.theme--light > .v-list {
  padding: inherit;
}
.theme--light.q-btn-toggle {
  box-shadow: none;
}
.v-menu__content.menuable__content__active.v-autocomplete__content > .v-select-list > .v-list {
  padding: inherit;
}

.q-btn-toggle {
  display: flex;
}

.toggle_btn {
  flex: 1 1;
  height: 3.33rem;
}

.clear_btn {
  margin: auto !important;
  align-self: flex-end;
}

.q-btn-toggle--selected {
  box-shadow: none;
}

.user {
  overflow: hidden;
}

.sort_icon.flip {
  transform: rotate(180deg);
}

.icon-size {
  width: 42px;
  margin: 7px;
}

.sort_btn {
  margin: auto !important;
  padding: auto !important;
}

.v-slider__thumb-label > span {
  font-size: 0.8em;
}
.flip {
  transform: rotate(180deg);
}
.user {
  margin: 16px;
  width: 260px; /* taille fixe pour éviter l'étirement en 1 colonne */
  max-width: 260px; /* garde la taille initiale */
}

.filters-container {
  margin-bottom: 32px;
}

.position-relative {
  position: relative;
}

/* Removed split-row fixed height; page scrolls naturally */

.loader-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  z-index: 2;
  /* Overlay now only covers the grid area, so it can block clicks on cards while leaving filters clickable */
  pointer-events: auto;
}

.filters-panel {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  min-width: 260px; /* don't let controls shrink too much */
  max-width: 320px; /* garde une largeur raisonnable même quand il est seul */
}

.grid-wrapper {
  position: relative;
  min-height: 200px; /* ensure some visible height before data arrives */
  overflow-x: hidden; /* prevent negative row margins from causing horizontal overflow */
}

/* Ensure the cards column can stay beside filters until there's truly no room */
.grid-column {
  min-width: 320px; /* >= user card min (260) + gutters/padding */
  flex: 1 1 auto;
}

/* Fluid cards grid: reduces columns as width shrinks, min 260px per card */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    260px
  ); /* colonnes fixes: pas d'étirement en pleine largeur */
  gap: 16px;
  align-items: start;
  justify-content: center; /* centrer la grille quand il reste de l'espace */
}

/* Removed independent scroll areas; let the page scroll */

/* Ensure toggle buttons remain usable on narrow widths */
.filters-panel .q-btn-toggle {
  display: flex;
  flex-wrap: wrap;
}
.filters-panel .q-btn-toggle .q-btn {
  min-width: 80px; /* stop shrinking past readability */
  flex: 1 1 auto;
}

/* Prevent inputs/selects from shrinking below a reasonable width on larger viewports */
.filters-panel .q-input,
.filters-panel .q-select {
  min-width: 240px;
}

/* Responsive adjustments */
@media (max-width: 1023px) {
  .filters-panel {
    min-width: 240px;
  }
}
@media (max-width: 767px) {
  /* Centre les paramètres sans les étirer quand ils sont seuls */
  .filters-panel {
    min-width: 260px;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
  }
  .filters-panel .q-input,
  .filters-panel .q-select {
    width: 100%;
    min-width: 0;
  }
}
</style>
