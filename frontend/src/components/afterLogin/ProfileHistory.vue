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
        <div class="q-px-lg q-py-md" style="width: 100%; max-width: 600px">
          <q-timeline :layout="layout" color="secondary" style="position: center">
            <q-timeline-entry heading>
              <div style="text-align: center; width: 100%; margin: auto">
                Here you can see all your history of actions on the website
              </div>
            </q-timeline-entry>
            <q-timeline-entry
              v-for="(entry, i) in history"
              :key="entry.id || i"
              :title="''"
              :subtitle="formatEntryDate(entry, 'absolute')"
              :color="getNotifIcon(entry.type)[2]"
              :class="getNotifIcon(entry.type)[2]"
              :icon="getNotifIcon(entry.type)[1]"
            >
              <div class="row items-center no-wrap timeline-entry-content">
                <div
                  style="
                    flex: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-right: 55px;
                    margin-left: -110px;
                  "
                  class="timeline-entry-content left-align"
                >
                  <AppAvatar
                    :image="entry.profile_image"
                    @click="redirectToUser(entry.his_id || entry.id)"
                    size="small"
                    style="cursor: pointer; margin-top: 25px; margin-bottom: -20px"
                  />
                  <div
                    class="text-caption text-center q-mt-xs"
                    style="
                      max-width: 80px;
                      word-break: break-all;
                      margin-top: 30px;
                      margin-bottom: -20px;
                    "
                  >
                    <span v-if="entry.first_name || entry.last_name">
                      {{ entry.first_name || '' }} {{ entry.last_name || '' }}
                    </span>
                    <span v-else-if="entry.username"> </span>
                    <span v-else>
                      <!-- {{ entry.username }} -->
                      <!-- {{ getUserName(entry) }} -->
                    </span>
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
          </q-timeline>
          <div v-if="isLoading" class="q-my-md flex items-center justify-center">
            <LoaderView />
            <div class="text-grey-7 q-mt-md" style="font-size: 1.1em; text-align: center">
              Wait for more history...
            </div>
          </div>
          <!-- <div v-if="hasMore && !isLoading" class="q-mt-md flex flex-center">
            <q-btn color="primary" @click="onShowMore" label="Charger plus d'historique" />
          </div> -->
          <div v-else-if="!hasMore && !isLoading" class="q-mt-md flex flex-center text-grey-7">
            <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
            <span>Vous avez atteint la fin de votre historique.</span>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
// Fix: define 'left' for timeline side binding
import { API_URL, BASE_URL } from '@/utility.js'
const right = 'right'
const left = 'left'
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

// Nouvelle logique : historique paginé via utility.syncAllHistory
const history = ref([])
const page = ref(1)
const limit = ref(20)
const hasMore = ref(true)
const isLoading = ref(false)

async function loadHistory() {
  if (isLoading.value || !hasMore.value) return
  isLoading.value = true
  try {
    const curPage = page.value
    const curIds = new Set(history.value.map((e) => e.id))
    const items = await utility.syncAllHistory({ limit: limit.value, page: curPage })
    if (Array.isArray(items) && items.length) {
      // Protection anti-doublon : si tous les IDs sont déjà présents, stop
      const newItems = items.filter((e) => !curIds.has(e.id))
      if (!newItems.length) {
        hasMore.value = false
        isLoading.value = false
        return
      }
      history.value.push(...newItems)
      page.value += 1
      if (items.length < limit.value) {
        hasMore.value = false
      }
    } else {
      hasMore.value = false
    }
  } catch (e) {
    hasMore.value = false
  } finally {
    isLoading.value = false
  }
}

const onShowMore = () => loadHistory()

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
  // Charge la première page d'historique au montage
  loadHistory()
})

import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Log history object whenever it changes
// Log history object whenever it changes
// watch(
//   history,
//   (val) => {
//     console.log('History object:', val)
//   },
//   { deep: true }
// )

const redirectToUser = (hisId) => {
  // Redirige seulement si l'id cible est différent de l'utilisateur courant
  if (!hisId || hisId === user.value.id || hisId === user.value._id) {
    return
  }
  router.push(`/user/${hisId}`)
}

// Utilitaire pour récupérer le nom complet ou username fallback
function getUserName(entry) {
  // Cherche dans les listes du store si possible
  const lists = [
    store.state.following,
    store.state.followers,
    store.state.visited,
    store.state.visitor
  ]
  for (const list of lists) {
    if (Array.isArray(list)) {
      const found = list.find((u) => String(u.id) === String(entry.his_id || entry.id))
      if (found) {
        return (found.first_name || '') + ' ' + (found.last_name || '')
      }
    }
  }
  return entry.id || ''
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
