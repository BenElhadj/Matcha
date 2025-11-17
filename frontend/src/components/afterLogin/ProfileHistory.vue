<template>
  <q-page class="q-pa-lg flex flex-center" style="min-height: 100vh">
    <div
      style="
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <h1 style="text-align: center">History</h1>
      <h3 style="margin-bottom: 10px; text-align: center">
        {{ user.username }}
      </h3>
      <div
        style="
          min-height: 50vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        "
      >
        <div class="q-px-lg q-py-md" style="width: 100%; max-width: 600px; margin: 0 auto">
          <q-timeline
            :layout="layout"
            color="secondary"
            style="margin: 0 auto; position: relative; left: 50px"
          >
            <q-timeline-entry heading>
              <div style="text-align: center; width: 100%; margin-left: -137px">
                Here you can see all your history of actions on the website
              </div>
              <br />
            </q-timeline-entry>
            <q-timeline-entry
              v-for="(entry, i) in history"
              :key="entry.id || i"
              :title="''"
              :subtitle="formatEntryDate(entry, 'absolute')"
              :side="i % 2 === 0 ? 'left' : 'right'"
              :color="getNotifIcon(entry.type)[2]"
              :class="getNotifIcon(entry.type)[2]"
              :icon="getNotifIcon(entry.type)[1]"
            >
              <div class="row items-center no-wrap timeline-entry-content">
                <div
                  style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-left: -130px;
                    margin-right: 60px;
                  "
                  class="timeline-entry-content left-align"
                >
                  <AppAvatar
                    :image="entry.profile_image"
                    @click="redirectToUser(entry.his_id)"
                    size="small"
                    style="cursor: pointer; margin-top: 25px; margin-bottom: -20px;"
                  />
                  <div
                    class="text-caption text-center q-mt-xs"
                    style="max-width: 80px; word-break: break-all; margin-top: 30px; margin-bottom: -20px"
                  >
                    {{ entry.username }}
                  </div>
                </div>
                <div
                  style="
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    margin-left: 10px;
                  "
                >
                  <div class="history-action-text">
                    {{ getHistoryAction(entry.type, entry.first_name, entry.last_name) }}
                  </div>
                  <div
                    class="text-caption text-grey-7 q-mt-xs"
                    style="max-width: 80px; word-break: break-all; margin-bottom: -30px"
                  >
                    {{ formatEntryDate(entry, 'relative') }}
                  </div>
                </div>
              </div>
            </q-timeline-entry>
            <q-timeline-entry
              :subtitle="!hasMore ? 'you can\'t see more history' : null"
              :title="
                hasMore
                  ? 'You can show more history'
                  : 'you created your profile on ' +
                    moment(user.created_at).format('D MMMM, YYYY, h:mm A')
              "
              side="left"
            />
          </q-timeline>
          <div v-if="isLoading" class="q-my-md flex items-center justify-center">
            <LoaderView />
            <div class="text-grey-7 q-mt-md" style="font-size: 1.1em; text-align: center">
              Wait for more history...
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import AppAvatar from '@/components/common/AppAvatar.vue'
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
const $q = useQuasar()
const layout = computed(() => {
  return $q.screen.lt.sm ? 'dense' : $q.screen.lt.md ? 'comfortable' : 'loose'
})
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import utility from '@/utility.js'
import moment from 'moment'
import axios from 'axios'
import LoaderView from '../../views/LoaderView.vue'

// Génère un message d'action personnalisé en anglais pour chaque type
function getHistoryMessage(entry) {
  const first = entry.first_name || 'Anonymous'
  const last = entry.last_name || 'User'
  const ago = moment(entry.match_date).fromNow()
  switch (entry.type) {
    case 'visited':
    case 'you_visit':
      return `You visited the profile of ${first} ${last} ${ago}`
    case 'visitor':
    case 'he_visit':
      return `${first} ${last} visited your profile ${ago}`
    case 'following':
    case 'you_like':
      return `You liked the profile of ${first} ${last} ${ago}`
    case 'follower':
    case 'he_like':
      return `${first} ${last} liked your profile ${ago}`
    case 'you_like_back':
      return `You accepted the friendship of ${first} ${last} ${ago}`
    case 'he_like_back':
      return `${first} ${last} accepted your friendship ${ago}`
    case 'you_unlike':
      return `You removed the profile of ${first} ${last} ${ago}`
    case 'he_unlike':
      return `${first} ${last} removed your profile ${ago}`
    case 'you_block':
      return `You blocked the profile of ${first} ${last} ${ago}`
    case 'he_block':
      return `${first} ${last} blocked your profile ${ago}`
    case 'you_report':
      return `You reported the profile of ${first} ${last} ${ago}`
    case 'he_report':
      return `${first} ${last} reported your profile ${ago}`
    case 'talk':
      return `You talked to ${first} ${last} ${ago}`
    case 'avatar_img':
      return `You changed your avatar ${ago}`
    case 'cover_img':
      return `You changed your cover ${ago}`
    default:
      return `${first} ${last} ${ago}`
  }
}

const store = useStore()
const route = useRoute()
const router = useRouter()
const user = computed(() => store.getters.user)
const getNotifIcon = utility.getNotifIcon
const getHistoryAction = utility.getHistoryAction

const history = ref([])
const page = ref(1)
const limit = ref(25)
const hasMore = ref(true)
const isLoading = ref(false)

let total = null

const fetchHistory = async () => {
  const token = user.value.token || localStorage.getItem('token')
  const url = `${import.meta.env.VITE_APP_API_URL}/api/browse/allhistory?offset=${
    (page.value - 1) * limit.value
  }&limit=${limit.value}`
  const headers = { 'x-auth-token': token }
  const result = await axios.get(url, { headers })
  const items = Array.isArray(result.data.history) ? result.data.history : []
  if (typeof result.data.total === 'number') total = result.data.total
  // Ajout sans doublons (par id)
  const existingIds = new Set(history.value.map((e) => e.id))
  const filtered = items.filter((e) => !existingIds.has(e.id))
  history.value.push(...filtered)
  if (items.length < limit.value || (total !== null && history.value.length >= total))
    hasMore.value = false
  page.value += 1
  return filtered
}

const onShowMore = async () => {
  if (isLoading.value || !hasMore.value) return
  isLoading.value = true
  await fetchHistory()
  isLoading.value = false
}

// Utilitaire pour choisir la bonne date selon l'action
function getEntryDate(entry) {
  return (
    entry.created_at ||
    entry.match_date ||
    entry.visit_date ||
    entry.blocked_at ||
    entry.reported_at ||
    entry.date ||
    null
  )
}

function formatEntryDate(entry, mode = 'relative') {
  const d = getEntryDate(entry)
  if (!d) return ''
  if (mode === 'absolute') return moment(d).format('D MMMM, YYYY, h:mm A')
  return moment(d).fromNow()
}

import { onMounted, watch } from 'vue'
onMounted(() => {
  isLoading.value = true
  fetchHistory().finally(() => {
    isLoading.value = false
  })
})

// Infinite scroll: charge plus d'historique quand on atteint le bas de la page
function handleScroll() {
  if (isLoading.value || !hasMore.value) return
  const scrollY = window.scrollY || window.pageYOffset
  const viewport = window.innerHeight
  const fullHeight = document.documentElement.scrollHeight
  if (scrollY + viewport >= fullHeight - 100) {
    onShowMore()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Log history object whenever it changes
watch(
  history,
  (val) => {
    console.log('History object:', val)
  },
  { deep: true }
)

const redirectToUser = (hisId) => {
  if (hisId === user.value.id || hisId === user.value._id) {
    router.push('/')
    return
  }
  router.push(`/user/${hisId}`)
}
</script>

<style>
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
/* Centrage de la timeline et alignement alterné des entrées */
.q-timeline {
  margin-left: auto;
  margin-right: auto;
  max-width: 600px;
}
:deep(.q-timeline__entry),
:deep(.q-timeline__entry.q-timeline__entry--standard) {
  margin-bottom: 48px !important;
}
.timeline-entry-content.left-align {
  justify-content: flex-start;
  max-width: 600px;
  margin-left: 24px;
}
.timeline-entry-content.right-align {
  justify-content: flex-end;
  margin-right: 24px;
}
/* Met en avant l'action réalisée dans l'historique */
.history-action-text {
  font-weight: 600;
  color: #1976d2;
  font-size: 1.13em;
  letter-spacing: 0.01em;
  margin-bottom: 2px;
  display: block;
}
</style>
