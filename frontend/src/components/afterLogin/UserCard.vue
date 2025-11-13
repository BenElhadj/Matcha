<template>
  <q-card class="user-card-root">
    <div class="pt-1 column justify-center align-center">
      <div class="row justify-between q-ma-sm">
        <q-chip outline small text-color="grey-7">{{ distance }}</q-chip>
        <q-item-section side>
          <q-tooltip bottom class="status_container">
            <span>{{ lastSeen }}</span>
          </q-tooltip>
          <q-badge small rounded :color="isOnline ? 'green' : 'grey'" />
        </q-item-section>
      </div>

      <div class="avatar-like-wrapper">
        <q-avatar class="justify-center avatar-card" size="150px">
          <router-link :to="`/user/${user.user_id}`">
            <img :src="getProfileImage" loading="lazy" class="avatar-img" />
          </router-link>
        </q-avatar>
        <img
          class="icon-avatar like-btn-absolute"
          square
          :src="likeIcon"
          @click.stop.prevent="onLikeIconClick"
        />
      </div>
      <router-link :to="`/user/${user.user_id}`" style="text-decoration: none">
        <span justify-center class="name headline text-capitalize mt-2">{{ user.username }}</span>
      </router-link>
      <router-link :to="`/user/${user.user_id}`" style="text-decoration: none">
        <span justify-center class="name headline text-capitalize mt-2">
          {{ user.last_name }} {{ user.first_name }}
        </span>
      </router-link>
      <span justify-center class="name headline text-capitalize mt-2">
        <q-icon
          class="mr-2"
          size="25px"
          :name="
            user.gender === 'male'
              ? 'icon-male'
              : user.gender === 'female'
              ? 'icon-femel'
              : 'icon-other'
          "
        />
        <span v-if="user.birthdate">
          <q-icon size="30px" name="icon-age" />
          {{ age }}
        </span>
      </span>

      <div class="note">
        <p class="caption text-capitalize rating_value">
          {{ user.rating ? user.rating.toFixed(1) : '0.0' }}
        </p>
        <q-rating
          :color="
            user.gender === 'male' ? 'blue-3' : user.gender === 'female' ? 'pink-2' : 'blue-5'
          "
          :color-selected="
            user.gender === 'male' ? 'blue-9' : user.gender === 'female' ? 'pink-8' : 'pink-4'
          "
          :modelValue="user.rating && !isNaN(user.rating) ? user.rating : 0"
          icon="mdi-heart-outline"
          icon-selected="mdi-heart"
          icon-half="mdi-heart-half-full"
          max="7"
          readonly
          dense
          size="1.7em"
          half-increments
          class="rating"
        />
      </div>

      <div class="row justify-center align-center bottom mb-0 mt-auto py-2 px-4 grey-2">
        <q-icon color="primary" size="40px" name="icon-map"></q-icon>
        <span v-if="user.city && user.country" class="text-truncate">{{
          `${user.city},  ${user.country}`
        }}</span>
        <span v-else class="text-truncate">Earth</span>
      </div>
      <AlertView :alert="alert" />
    </div>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import moment from 'moment'
import utility from '@/utility'
import { getImageSrc } from '@/utility.js'
import AlertView from '@/views/AlertView.vue'
import axios from 'axios'

const store = useStore()
const getLikeIcon = utility.getLikeIcon

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  }
})

const followers = computed(() => store.getters.followers || [])
const following = computed(() => store.getters.following || [])
const convos = computed(() => store.getters.convos || [])
const selfId = computed(() => store.getters.user?.id)
const relationType = computed(() =>
  utility.deriveRelationState({
    selfId: selfId.value,
    targetId: props.user?.user_id,
    followers: followers.value,
    following: following.value,
    convos: convos.value,
    flags: store.state.user?.relation || { unlike: {} }
  })
)
const likeIcon = computed(() => getLikeIcon(relationType.value))
const alert = ref({ state: false, color: '', text: '' })

function nextLikedFromState(type) {
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

async function onLikeIconClick() {
  const targetId = props.user?.user_id
  if (!targetId) return
  if (String(targetId) === String(selfId.value)) {
    alert.value = { state: true, color: 'red', text: 'Vous ne pouvez pas vous liker.' }
    return
  }
  try {
    const likedBool = nextLikedFromState(relationType.value)
    const url = `${import.meta.env.VITE_APP_API_URL}/api/match`
    const token = store.state.user?.token || localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const body = { id: Number(targetId), liked: !!likedBool }
    const res = await axios.post(url, body, { headers })
    if (res.data?.msg && !res.data?.ok) {
      alert.value = { state: true, color: 'red', text: res.data.msg }
      return
    }
    alert.value = { state: true, color: 'green', text: res.data?.message || 'Action effectuée.' }
    // Persist dislike locally if action is unlike, clear otherwise
    if (!likedBool) {
      store.commit('markUnlike', { id: Number(targetId), dir: 'you_unlike' })
    } else {
      store.commit('clearUnlike', Number(targetId))
    }
    await Promise.allSettled([store.dispatch('syncMatches'), store.dispatch('syncConvoAll')])
  } catch (e) {
    alert.value = { state: true, color: 'red', text: e?.message || 'Erreur inconnue' }
  }
}

const age = computed(() => {
  return new Date().getFullYear() - new Date(props.user.birthdate).getFullYear()
})

const distance = computed(() => {
  const from = {
    lat: store.getters.location.lat,
    lng: store.getters.location.lng
  }
  const to = {
    lat: props.user.lat,
    lng: props.user.lng
  }
  return `${Math.round(utility.calculateDistance(from, to))} kms away`
})

const lastSeen = computed(() => {
  if (props.user.lastSeen == 'online') {
    return 'online'
  } else {
    return moment(props.user.status).utc().fromNow()
  }
})

const isOnline = computed(() => {
  const ids = store.getters.connectedUsers || []
  const targetId = props.user?.user_id != null ? String(props.user.user_id) : ''
  return targetId && Array.isArray(ids) ? ids.includes(String(targetId)) : false
})

const getProfileImage = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  const defaultTxt = `${base}default/defaut_profile.txt`
  const cachedDefault = utility.getCachedDefault ? utility.getCachedDefault('profile') : null
  const fallback = cachedDefault || defaultTxt
  if (
    props.user.profile_image &&
    typeof props.user.profile_image === 'string' &&
    props.user.profile_image.length > 0
  ) {
    return props.user.profile_image
  }
  if (props.user.images && props.user.images.length > 0) {
    const profileImg = props.user.images.find((img) => img.profile)
    const img = profileImg || props.user.images[0]
    return getImageSrc(img, fallback)
  }
  return fallback
})

onMounted(() => {
  // Like icon reacts via store updates (syncMatches and sockets)
})
</script>

<style scoped>
.user-card-root {
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border: 1.5px solid #e0e0e0;
  background: #fff;
  margin: 18px 0;
  padding: 18px 18px 10px 18px; /* padding horizontal augmenté */
  transition: box-shadow 0.2s, border-radius 0.2s;
  overflow: visible;
}
.user-card-root:hover {
  box-shadow: 0 0 20px 6px rgba(0, 0, 0, 0.18), 0 0 0 1px #bdbdbd;
  border-color: #bdbdbd;
}
.avatar-card {
  width: 150px;
  height: 150px;
  margin: 0 auto 12px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.avatar-img {
  width: 150px;
  height: 150px;
  object-fit: contain;
  object-position: center center;
  border-radius: 50%;
  background: #f5f5f5;
  display: block;
  max-height: 150px;
  min-width: 0;
  min-height: 0;
}
.avatar-like-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.like-btn-absolute {
  position: absolute;
  bottom: 0;
  height: 70px;
  width: 70px;
  z-index: 999;
  border: none;
  cursor: pointer;
  transition: opacity 0.1s;
}
.like-btn-absolute:hover {
  opacity: 1;
  transform: translateX(-50%) scale(1.15);
  transform-origin: center center;
}

.icon-avatar {
  width: 35px !important;
  height: 35px !important;
  position: absolute;
  top: 15px;
  left: 78%;
  transform: translateX(-50%);
}
.icon-male {
  background-image: url('@/assets/userCard/male.png');
  background-size: 90%;
  background-repeat: no-repeat;
}
.icon-femel {
  background-image: url('@/assets/userCard/femel.png');
  background-size: 90%;
  background-repeat: no-repeat;
}
.icon-other {
  background-image: url('@/assets/userCard/other.png');
  background-size: 90%;
  background-repeat: no-repeat;
}
.icon-age {
  background-image: url('@/assets/userCard/age.png');
  background-size: 90%;
  background-repeat: no-repeat;
}
.icon-map {
  background-image: url('@/assets/userCard/map.png');
  background-size: 100%;
  background-repeat: no-repeat;
}
.note {
  display: flex;
  align-items: flex-start;
  flex-direction: row;
  justify-content: center;
}
.name {
  color: #828282;
  position: relative;
}
.name:after {
  display: block;
  content: '';
  position: absolute;
}
.align-center {
  text-align: center;
  gap: 10px;
}

.q-card {
  box-sizing: border-box;
  height: 100%;
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease-out;
  padding-bottom: 23px;
}
.q-avatar {
  margin: 0 auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease-out;
}
.q-card:hover {
  border: 1px solid rgba(25, 25, 25, 0.3) !important;
}
</style>
