<template>
  <q-page class="q-pa-lg">
    <q-page-container>
      <h1 style="margin-top: -40px; text-align: center">History</h1>
      <q-timeline align="top" label="Loose" center class="timeline_container q-gutter-md">
        <q-timeline color="secondary">
          <q-timeline-entry heading style="margin: 10px; text-align: center">
            Her you can see all your history of actions on the website
            <br /><br />
          </q-timeline-entry>
          <q-timeline-entry
            v-for="(entry, i) in allHistory"
            :key="entry.id || i"
            :title="getHistoryAction(entry.type, entry.first_name, entry.last_name)"
            :subtitle="moment(entry.created_at).format('D MMMM, YYYY, h:mm A')"
            :right="true"
            :color="getNotifIcon(entry.type)[2]"
            :class="getNotifIcon(entry.type)[2]"
            :icon="getNotifIcon(entry.type)[1]"
          >
            <q-avatar clickable v-ripple avatar @click="redirectToUser(entry.his_id)">
              <img :src="historyImg(entry.avatar)" />
            </q-avatar>
            <q-item-section right>
              {{ moment(entry.created_at).fromNow() }}
            </q-item-section>
          </q-timeline-entry>
        </q-timeline>
        <q-btn
          v-if="canShowMore"
          label="Show more"
          color="primary"
          text
          rounded
          class="my-4"
          @click="showMore"
        />
      </q-timeline>
    </q-page-container>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import utility from '@/utility.js'
import moment from 'moment'

const props = defineProps({ history: Array, total: Number })
const emit = defineEmits(['fetch-more'])
const router = useRouter()
const getNotifIcon = utility.getNotifIcon
const base = import.meta.env.BASE_URL || '/'
const defaultProfileTxt = `${base}default/defaut_profile.txt`
const getFullPath = utility.getFullPath
const historyImg = (img) =>
  utility.getImageSrc
    ? utility.getImageSrc(img, utility.getCachedDefault?.('profile') || defaultProfileTxt)
    : getFullPath(img)
const getHistoryAction = utility.getHistoryAction
const allHistory = computed(() => Array.isArray(props.history) ? props.history : [])
const totalHistory = computed(() => typeof props.total === 'number' ? props.total : 0)
const canShowMore = computed(() => allHistory.value.length < totalHistory.value)
const showMore = () => emit('fetch-more')
const redirectToUser = (hisId) => {
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
