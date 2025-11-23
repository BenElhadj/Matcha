<template>
  <q-page class="q-pa-lg" style="min-height: 100vh">
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
      <h3 style="margin-bottom: 50px; text-align: center">
        {{ user.username }}
      </h3>

      <!-- TABS: all / visit / like / add_image / block -->
      <div style="width: 100%; max-width: 800px; margin-bottom: 12px">
        <q-tabs
          v-model="activeTab"
          dense
          align="center"
          class="text-primary history-tabs"
          active-color="primary"
        >
          <q-tab name="all" label="All" />
          <q-tab name="visit" label="Visits" />
          <q-tab name="like" label="Likes" />
          <q-tab name="add_image" label="Images" />
          <q-tab name="block" label="Blocks" />
        </q-tabs>
      </div>

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
              <div
                style="text-align: center; width: 100%; margin: auto; text-size-adjust: 150%"
                class="text-caption history-intro"
              >
                {{ introText }}
              </div>
            </q-timeline-entry>

            <!-- Timeline entries for the active tab -->
            <q-timeline-entry
              v-for="(entry, i) in currentItems"
              :key="entry.id || `${activeTab}-${i}`"
              :title="''"
              :subtitle="formatEntryDate(entry, 'absolute')"
              :color="notifColor(entry)"
              :class="getNotifIcon(entry.type)[2]"
              v-bind="
                activeTab === 'block'
                  ? { avatar: getNotifIcon(entry.type)[1] }
                  : { icon: getNotifIcon(entry.type)[1] }
              "
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
                  <!-- Avatar wrapped in a colored bubble according to getNotifIcon(entry.type) -->
                  <div
                    style="
                      width: 56px;
                      height: 56px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                      margin-top: 12px;
                    "
                    @click="redirectToUser(entry.his_id)"
                  >
                    <AppAvatar
                      :image="entry.profile_image"
                      :userId="entry.his_id"
                      :showPresence="true"
                      size="small"
                    />
                  </div>
                  <div
                    class="text-caption text-center q-mt-xs text-grey-7 history-username"
                    style="max-width: 180px; word-break: break-all; margin-top: 8px"
                  >
                    <!-- Show username under avatar (fallback to first/last if username missing) -->
                    <span>{{
                      entry.username ||
                      (entry.first_name || '') + (entry.last_name ? ' ' + entry.last_name : '')
                    }}</span>
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
                  <div v-if="entry.type === 'add_image'">
                    <div class="history-action-text">{{ getHistoryMessage(entry) }}</div>
                    <div style="margin-top: 8px">
                      <img
                        :src="entry._thumb || entry.added_image || entry.image"
                        alt="uploaded image"
                        style="
                          width: 96px;
                          height: 96px;
                          object-fit: cover;
                          border-radius: 6px;
                          display: block;
                        "
                      />
                    </div>
                    <div class="text-caption q-mt-xs" style="margin-top: 6px">
                      {{
                        entry.added_type || entry.image_type
                          ? (entry.added_type || entry.image_type) === 'profile'
                            ? 'Profile photo'
                            : (entry.added_type || entry.image_type) === 'cover'
                            ? 'Cover photo'
                            : 'Gallery photo'
                          : ''
                      }}
                    </div>
                    <div
                      class="text-caption text-grey-7 q-mt-xs history-date"
                      style="max-width: 80px; word-break: break-all; margin-bottom: -30px"
                    >
                      {{ formatEntryDate(entry, 'relative') }}
                    </div>
                  </div>
                  <div v-else>
                    <div class="history-action-text">
                      {{ getHistoryMessage(entry) }}
                    </div>
                    <div
                      class="text-caption text-grey-7 q-mt-xs history-date"
                      style="max-width: 80px; word-break: break-all; margin-bottom: -30px"
                    >
                      {{ formatEntryDate(entry, 'relative') }}
                    </div>
                  </div>
                </div>
              </div>
            </q-timeline-entry>

            <!-- Final entry: account creation (show user's profile photo, black timeline) -->
            <q-timeline-entry
              v-if="user.value && user.value.created_at"
              :title="''"
              :subtitle="formatAccountCreationDate"
              color="black"
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
                  <div class="text-caption text-center q-mt-xs" style="max-width: 120px">
                    {{ user.value.username }}
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
                  <div class="history-action-text">Account created</div>
                  <div class="text-caption text-grey-7 q-mt-xs history-date">
                    {{ formatEntryDate({ created_at: user.value.created_at }, 'relative') }}
                  </div>
                </div>
              </div>
            </q-timeline-entry>
          </q-timeline>

          <!-- Loader / messages per tab -->
          <div v-if="currentState.loading" class="q-my-md flex items-center justify-center">
            <LoaderView />
            <div
              class="text-grey-7 q-mt-md"
              style="font-size: 1.1em; text-align: center; margin-left: 8px"
            >
              Wait for more {{ tabLabel(activeTab) }}...
            </div>
          </div>

          <div
            v-else-if="!currentState.hasMore && !currentState.loading"
            class="q-mt-md flex flex-center text-grey-7"
            style="flex-direction: column; align-items: center"
          >
            <div style="margin-bottom: 8px; text-align: center">
              <q-icon name="mdi-history" size="32px" class="q-mr-sm" />
            </div>
            <div style="text-align: center; margin-bottom: 6px">
              No more {{ tabLabel(activeTab) }} to show.
            </div>
            <div style="text-align: center; color: #888">
              You created your account on {{ formatAccountCreationDate }}
            </div>
          </div>

          <!-- Manual load more (useful if scroll doesn't trigger) -->
          <div
            v-if="currentState.hasMore && !currentState.loading"
            class="q-mt-md flex flex-center"
          >
            <!-- <q-btn color="primary" @click="onShowMore" label="Load more" /> -->
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
// filepath: d:\github\Matcha\frontend\src\components\afterLogin\ProfileHistory.vue
import AppAvatar from '@/components/common/AppAvatar.vue'
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import moment from 'moment'
import utility from '@/utility.js'
import LoaderView from '../../views/LoaderView.vue'

const $q = useQuasar()
const layout = computed(() => {
  return $q.screen.lt.sm ? 'dense' : $q.screen.lt.md ? 'comfortable' : 'loose'
})

const store = useStore()
const router = useRouter()
const user = computed(() => store.getters.user)

const getNotifIcon = utility.getNotifIcon

// Tabs & per-tab state
const activeTab = ref('all')
const typeMap = {
  all: 'all',
  visit: 'visit',
  like: 'like',
  add_image: 'add_image',
  block: 'block'
}

const historyTabs = reactive({
  all: { items: [], page: 1, hasMore: true, loading: false, limit: 25 },
  visit: { items: [], page: 1, hasMore: true, loading: false, limit: 25 },
  like: { items: [], page: 1, hasMore: true, loading: false, limit: 25 },
  add_image: { items: [], page: 1, hasMore: true, loading: false, limit: 25 },
  block: { items: [], page: 1, hasMore: true, loading: false, limit: 25 }
})

const currentState = computed(() => historyTabs[activeTab.value])
const currentItems = computed(() => {
  const items = historyTabs[activeTab.value]?.items || []
  return items
})

// Helpers
function tabLabel(tab) {
  switch (tab) {
    case 'all':
      return 'events'
    case 'visit':
      return 'visits'
    case 'like':
    case 'unlike':
      return 'likes'
    case 'add_image':
      return 'images'
    case 'block':
    case 'report':
      return 'blocks'
    default:
      return 'items'
  }
}

function formatAccountCreation(dateIso) {
  if (!dateIso) return ''
  return moment(dateIso).format('D MMMM, YYYY')
}
const formatAccountCreationDate = computed(() => formatAccountCreation(user.value?.created_at))

function getEntryDate(entry) {
  // Le backend normalise désormais toutes les dates dans `created_at`.
  // Ne garder que ce champ pour éviter d'utiliser d'anciens noms (match_date, other_id, ...).
  return entry && entry.created_at ? entry.created_at : null
}

function formatEntryDate(entry, mode = 'relative') {
  const d = getEntryDate(entry)
  if (!d) return ''
  if (mode === 'absolute') return moment(d).format('D MMMM, YYYY, h:mm A')
  return moment(d).fromNow()
}

const redirectToUser = (hisId) => {
  if (!hisId || hisId === user.value.id || hisId === user.value._id) return
  router.push(`/user/${hisId}`)
}

// Human-readable history messages per entry type
function getHistoryMessage(entry) {
  const name = entry.last_name
    ? `${entry.last_name} ${entry.first_name || ''}`.trim()
    : (entry.first_name || entry.username || '').trim()
  switch ((entry.type || '').toString()) {
    case 'visit':
      return `You visited ${name}'s profile`
    case 'like':
      return `You liked ${name}'s profile`
    case 'like_back':
      return `You matched with ${name}! Say hi in chat`
    case 'unlike':
      return `You unliked ${name}'s profile`
    case 'visit_profile':
      return `You viewed your profile`
    case 'chat_message':
      return `You sent a message to ${name}`
    case 'block':
      return `You blocked ${name}'s profile`
    case 'upload_profile_photo':
      return `You updated your profile photo`
    case 'add_image':
      const atype = entry.added_type || entry.image_type
      if (atype === 'profile') return `You updated your profile photo`
      if (atype === 'cover') return `You updated your cover photo`
      return `You added an image in your gallery`
    case 'removed_my_like':
      return `You removed a like for ${name}'s profile`
    case 'report':
      return `You reported ${name}'s profile`
    case 'change_password':
      return `You changed your password`
    case 'change_email':
      return `You changed your email`
    default:
      // fallback: show the type and relative time
      return `${entry.type || 'activity'}`
  }
}

// return a background class (bg-*) derived from getNotifIcon color class (text-*)

function notifColor(entry) {
  try {
    const icon = getNotifIcon(entry.type)
    const colorClass = (icon && icon[2]) || ''
    if (!colorClass) return ''
    return colorClass.replace(/^text-/, '')
  } catch (e) {
    return ''
  }
}

const introText = computed(() => {
  switch (activeTab.value) {
    case 'all':
      return 'Here are your actions on the website (your activity).'
    case 'visit':
      return 'Profiles you visited — actions you took to view other profiles.'
    case 'like':
      return "Profiles you liked — the people you've liked."
    case 'block':
      return 'Profiles you blocked — people you chose to hide.'
    default:
      return 'Your activity on the website.'
  }
})

// Pagination per tab
async function loadTab(tab) {
  const state = historyTabs[tab]
  if (!state || state.loading || !state.hasMore) return
  state.loading = true
  try {
    const curIds = new Set(state.items.map((e) => e.id))
    const items = await utility.syncAllHistory({
      limit: state.limit,
      page: state.page,
      type: typeMap[tab]
    })
    if (Array.isArray(items) && items.length) {
      // push only new items (dedupe)
      const newItems = items.filter((e) => !curIds.has(e.id))
      if (newItems.length) {
        state.items.push(...newItems)
        state.page += 1
        // prepare thumbnails for any newly added image entries
        try {
          prepareThumbnails(newItems)
        } catch (_) {}
      } else {
        // if backend returned items but all already present, consider as end to avoid loop
        state.hasMore = false
      }
      if (items.length < state.limit) state.hasMore = false
    } else {
      state.hasMore = false
    }
  } catch (err) {
    // on error stop further loads to avoid infinite loop
    state.hasMore = false
  } finally {
    state.loading = false
  }
}

// Thumbnail preloader/cache for add_image entries
const prepareThumbnails = (items = []) => {
  if (!Array.isArray(items)) return
  for (const e of items) {
    if (!e || e.type !== 'add_image') continue
    const imgVal = e.added_image || e.image
    if (!imgVal) continue
    // avoid duplicate work
    if (e._thumb || e._thumbLoading) continue
    e._thumbLoading = true
    // generate a small avatar (async). fallback to original image on error
    utility
      .makeSmallAvatar(imgVal, 96)
      .then((t) => {
        e._thumb = t || imgVal
        e._thumbLoading = false
      })
      .catch(() => {
        e._thumb = imgVal
        e._thumbLoading = false
      })
  }
}

// Scroll handler (native) - triggers for active tab
function handleScroll() {
  const state = historyTabs[activeTab.value]
  if (!state || state.loading || !state.hasMore) return
  const scrollY = window.scrollY || window.pageYOffset
  const viewport = window.innerHeight
  const fullHeight = document.documentElement.scrollHeight
  if (scrollY + viewport >= fullHeight - 120) {
    loadTab(activeTab.value)
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  // load first tab
  loadTab(activeTab.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

// when switching tabs, load first page if not yet loaded
watch(activeTab, (val) => {
  // Always attempt to load the tab when it becomes active. If it's already loading or has no more items,
  // loadTab will early-return. This ensures the correct `type` param is requested for each tab.
  loadTab(val)
  // prepare thumbnails for already loaded items when switching to images tab
  try {
    prepareThumbnails(historyTabs[val]?.items || [])
  } catch (_) {}
})
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
  min-height: 48px !important;
  height: 48px !important;
}
:deep(.q-timeline__entry .q-avatar),
:deep(.q-timeline__entry .q-icon) {
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  min-height: 44px !important;
}
:deep(.q-timeline__entry .q-avatar img) {
  width: 44px !important;
  height: 44px !important;
  object-fit: contain;
}
:deep(.q-timeline__entry__subtitle) {
  color: #0a0303 !important;
  font-size: 15px !important;
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
  font-size: 17px;
  letter-spacing: 0.01em;
  margin-bottom: 2px;
  display: block;
}

/* increased sizes for intro, username and dates */
.history-intro {
  font-size: 20px !important;
  font-weight: 600 !important;
}
.history-username {
  font-size: 15px !important;
  font-weight: 600;
}
.history-date {
  color: #888 !important;
  font-size: 15px !important;
}
/* Tabs container: border around tabs, and grey non-selected tab text */
.history-tabs {
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  border-radius: 6px;
  margin: 0 200px !important;
}
.history-tabs .q-tab {
  color: #888 !important; /* default unselected color */
  opacity: 0.95;
}
.history-tabs .q-tab.q-tab--active {
  color: var(--q-primary) !important; /* keep active tab primary */
  font-weight: 200;
}
</style>
