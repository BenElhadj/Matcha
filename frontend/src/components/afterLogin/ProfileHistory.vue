<template>
  <q-page class="q-pa-lg">
    <q-page-container>
      <h1 style="text-align: center">History</h1>
      <h3 style="margin-bottom: 100px; text-align: center">
        {{ user.username }}
      </h3>
      <q-timeline align="top" label="Loose" center class="q-gutter-md">
        <q-timeline color="secondary">
          <q-timeline-entry
            v-for="(entry, i) in history"
            :key="entry.id || i"
            :title="getHistoryAction(entry.type, entry.first_name, entry.last_name)"
            :subtitle="moment(entry.match_date).format('D MMMM, YYYY, h:mm A')"
            :right="true"
            :color="getNotifIcon(entry.type)[2]"
            :class="getNotifIcon(entry.type)[2]"
            :icon="getNotifIcon(entry.type)[1]"
          >
            <div class="row items-center no-wrap q-mt-xs timeline-entry-content" :class="i % 2 === 0 ? 'left-align' : 'right-align'">
              <AppAvatar
                :image="entry.profile_image"
                @click="redirectToUser(entry.his_id)"
                size="small"
              />
              <div class="q-ml-sm">
                <strong>{{ entry.first_name }} {{ entry.last_name }}</strong>
                <div class="history-action-text q-mt-xs">{{ getHistoryMessage(entry) }}</div>
                <div class="text-caption text-grey-7">{{ moment(entry.match_date).fromNow() }}</div>
              </div>
            </div>
          </q-timeline-entry>
          <q-timeline-entry
            v-if="!hasMore && history.length"
            :subtitle="'you can\'t see more history'"
            :title="
              'you created your profile on ' +
              moment(user.created_at).format('D MMMM, YYYY, h:mm A')
            "
            side="left"
          />
        </q-timeline>
      </q-timeline>
      <div v-if="isLoading" class="q-my-md flex items-center justify-center">
        <LoaderView />
      </div>
      <div v-if="!isLoading && hasMore" class="q-my-md flex items-center justify-center">
        <q-btn color="primary" label="Show More" @click="onShowMore" />
      </div>
    </q-page-container>
  </q-page>
</template>

<script setup>
import AppAvatar from '@/components/common/AppAvatar.vue'
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import utility from '@/utility.js'
import moment from 'moment'
import axios from 'axios'
import LoaderView from '../../views/LoaderView.vue'

// Génère un message d'action personnalisé en anglais pour chaque type
function getHistoryMessage(entry) {
  const first = entry.first_name || 'Anonymous';
  const last = entry.last_name || 'User';
  const ago = moment(entry.match_date).fromNow();
  switch (entry.type) {
    case 'visited':
    case 'you_visit':
      return `You visited the profile of ${first} ${last} ${ago}`;
    case 'visitor':
    case 'he_visit':
      return `${first} ${last} visited your profile ${ago}`;
    case 'following':
    case 'you_like':
      return `You liked the profile of ${first} ${last} ${ago}`;
    case 'follower':
    case 'he_like':
      return `${first} ${last} liked your profile ${ago}`;
    case 'you_like_back':
      return `You accepted the friendship of ${first} ${last} ${ago}`;
    case 'he_like_back':
      return `${first} ${last} accepted your friendship ${ago}`;
    case 'you_unlike':
      return `You removed the profile of ${first} ${last} ${ago}`;
    case 'he_unlike':
      return `${first} ${last} removed your profile ${ago}`;
    case 'you_block':
      return `You blocked the profile of ${first} ${last} ${ago}`;
    case 'he_block':
      return `${first} ${last} blocked your profile ${ago}`;
    case 'you_report':
      return `You reported the profile of ${first} ${last} ${ago}`;
    case 'he_report':
      return `${first} ${last} reported your profile ${ago}`;
    case 'talk':
      return `You talked to ${first} ${last} ${ago}`;
    case 'avatar_img':
      return `You changed your avatar ${ago}`;
    case 'cover_img':
      return `You changed your cover ${ago}`;
    default:
      return `${first} ${last} ${ago}`;
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
import { onMounted } from 'vue'
onMounted(() => {
  isLoading.value = true
  fetchHistory().finally(() => {
    isLoading.value = false
  })
})

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
</style>

/* Centrage de la timeline et alignement alterné des entrées */
.q-timeline {
  margin-left: auto;
  margin-right: auto;
  max-width: 600px;
}
.timeline-entry-content.left-align {
  justify-content: flex-start;
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
