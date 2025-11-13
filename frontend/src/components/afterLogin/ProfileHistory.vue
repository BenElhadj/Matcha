<template>
  <q-page class="q-pa-lg">
    <q-page-container>
      <h1 style="margin-top: -40px; text-align: center">History</h1>
      <h3 style="margin-top: -50px; margin-bottom: 20px; text-align: center">
        {{ user.username }}
      </h3>
      <q-timeline align="top" label="Loose" center class="timeline_container q-gutter-md">
        <q-timeline color="secondary">
          <q-timeline-entry heading style="margin: 10px; text-align: center">
            Her you can see all your history of actions on the website
            <br /><br />
          </q-timeline-entry>
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
            <q-avatar clickable v-ripple avatar @click="redirectToUser(entry.his_id)">
              <img :src="entry.profile_image" />
            </q-avatar>
            <q-item-section right>
              {{ getHistoryAction(entry.type, entry.first_name, entry.last_name) }}
              <br />
              <span class="text-caption">{{
                moment(entry.match_date).format('D MMMM, YYYY, h:mm A')
              }}</span>
            </q-item-section>
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
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import utility from '@/utility.js'
import moment from 'moment'
import axios from 'axios'
import LoaderView from '../../views/LoaderView.vue'

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
  fetchHistory().finally(() => { isLoading.value = false })
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
.timeline_container {
  margin-top: 20px;
}

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

.v-timeline-item__body {
  margin-top: -0.8rem !important;
}
</style>
