import { API_URL } from '@/utility.js';
<template>
  <q-page class="page-container">
    <q-page-container v-if="user && user.username">
      <div>
        <div class="profile__cover">
          <img :src="coverPhoto" alt="Cover Photo" class="cover__img" />
        </div>
        <input
          accept=".jpg, image/*"
          type="file"
          ref="fileInputCover"
          id="fileInputCover"
          style="display: none"
          @change="uploadImage('cover', $event)"
        />

        <q-btn
          @click="openImageUploadDialog('cover')"
          fab
          small
          outlined
          flat
          round
          lighten-3
          class="update__img"
          style="top: 85px"
        >
          <q-icon name="mdi-image"></q-icon>
          <q-tooltip left>
            <span>Changer votre photo de couverture</span>
          </q-tooltip>
        </q-btn>
      </div>

      <div class="avatar">
        <q-avatar slot="offset" class="profile__avatar mx-auto" size="250px">
          <img :src="profileImage" />
        </q-avatar>
        <input
          accept=".jpg, image/*"
          type="file"
          ref="fileInputProfile"
          id="fileInputProfile"
          style="display: none"
          @change="uploadImage('profile', $event)"
        />

        <q-btn
          @click="openImageUploadDialog('profile')"
          fab
          small
          outlined
          flat
          round
          lighten-3
          class="update__img"
          style="top: 470px; left: 190px"
        >
          <q-icon name="mdi-image"></q-icon>

          <q-tooltip left>
            <span>Changer votre photo de profile</span>
          </q-tooltip>
        </q-btn>
      </div>

      <q-separator spacing class="separator-margin"></q-separator>
      <div class="centered-tabs" style="max-width: 900px">
        <q-card>
          <q-tabs
            v-model="activeTab"
            class="bg-grey-2 text-grey q-tabs__content"
            active-color="primary"
            indicator-color="bg-grey-2"
          >
            <q-tab name="tab-profile" label="Profile"></q-tab>
            <q-tab name="tab-photo" label="Photos"></q-tab>
            <q-tab name="tab-history" label="History"></q-tab>
            <q-tab name="tab-setting" label="Setting"></q-tab>
          </q-tabs>

          <q-separator spacing class="separator-margin"></q-separator>

          <q-tab-panels v-model="activeTab" animated class="bg-grey-2 text-black">
            <q-tab-panel name="tab-profile" v-if="activeTab === 'tab-profile'">
              <ProfileForm
                ref="form"
                :user="user"
                @sync-user="syncUser"
                @update-user="updateUser"
              />
            </q-tab-panel>

            <q-tab-panel name="tab-photo" v-if="activeTab === 'tab-photo'">
              <ProfileGallery :images="images" @update:images="onImagesUpdate" />
            </q-tab-panel>

            <q-tab-panel name="tab-history" v-if="activeTab === 'tab-history'">
              <ProfileHistory />
            </q-tab-panel>

            <q-tab-panel name="tab-setting" v-if="activeTab === 'tab-setting'">
              <ProfileSettings />
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
      <AlertView :alert="alert" />
    </q-page-container>
    <LoaderView v-else />
  </q-page>
</template>

<script setup>
import ProfileForm from '@/components/afterLogin/ProfileForm.vue'
import ProfileGallery from '@/components/afterLogin/ProfileGallery.vue'
import ProfileHistory from '@/components/afterLogin/ProfileHistory.vue'
import { defineAsyncComponent } from 'vue'
const ProfileSettings = defineAsyncComponent(() =>
  import('@/components/afterLogin/ProfileSettings.vue')
)
import AlertView from '@/views/AlertView.vue'
import LoaderView from '@/views/LoaderView.vue'
import utility from '@/utility.js'
import { getImageSrc } from '@/utility.js'
import axios from 'axios'
import { useStore } from 'vuex'
import { ref, computed, onMounted, watch } from 'vue'

const store = useStore()
const user = computed(() => store.getters.user)
const images = ref([])
const error = ref(null)
// loaded supprimé, on se base sur user du store
const activeTab = ref('tab-profile')
const coverPhoto = ref(store.getters.coverPhoto)
const profileImage = ref(store.getters.profileImage)
const alert = ref({
  state: false,
  color: '',
  text: ''
})

// Synchronise images avec user.images pour forcer la réactivité
watch(
  () => user.value && user.value.images,
  (newImages) => {
    images.value = Array.isArray(newImages) ? [...newImages] : []
  },
  { immediate: true, deep: true }
)
// Met à jour la liste d'images et le store quand la galerie change
const onImagesUpdate = (newImages) => {
  images.value = Array.isArray(newImages) ? [...newImages] : []
  // Met à jour le store pour garder la cohérence globale
  store.commit('updateUser', { ...user.value, images: images.value })
}
const fileInputProfile = ref('')
const fileInputCover = ref('')
const urlProfile = ref('')
const urlCover = ref('')

const openImageUploadDialog = (type) => {
  if (type === 'cover') {
    fileInputCover.value.click()
    urlCover.value = `${API_URL}/api/users/image/cover`
  } else if (type === 'profile') {
    fileInputProfile.value.click()
    urlProfile.value = `${import.meta.env.VITE_APP_API_URL}/api/users/image`
  }
}

const uploadImage = async (type, event) => {
  try {
    const selectedFile = event.target.files[0]
    if (!selectedFile) {
      console.error('Aucun fichier sélectionné')
      return
    }
    const headers = { 'x-auth-token': user.value.token, 'Content-Type': 'application/json' }
    const reader = new FileReader()
    reader.onload = async (e) => {
      // On retire le préfixe data:image/...;base64, pour n'envoyer que le base64 pur
      let base64 = e.target.result
      if (typeof base64 === 'string' && base64.startsWith('data:image/')) {
        base64 = base64.replace(/^data:image\/\w+;base64,/, '')
      }
      let body
      if (type === 'cover') {
        body = {
          profile: false,
          cover: true,
          link: 'false',
          data: base64
        }
      } else if (type === 'profile') {
        body = {
          profile: true,
          cover: false,
          link: 'false',
          data: base64
        }
      }
      const url = type === 'cover' ? urlCover.value : urlProfile.value
      const result = await axios.post(url, body, { headers })
      let backendMsg =
        result.data?.message ||
        result.data?.msg ||
        result.data?.error ||
        (type === 'cover'
          ? 'Cover image updated successfully'
          : 'Profile image updated successfully')
      let isSuccess = result.data?.status === 'success' || result.data?.ok === true
      if (isSuccess) {
        // Rafraîchir toutes les images utilisateur pour affichage immédiat
        await store.dispatch('fetchUserImages')
        coverPhoto.value = store.getters.coverPhoto
        profileImage.value = store.getters.profileImage
        images.value = Array.isArray(store.getters.user.images)
          ? [...store.getters.user.images]
          : []
        alert.value = { state: true, color: 'green', text: backendMsg }
      } else {
        alert.value = {
          state: true,
          color: 'red',
          text: `This error occurred while updating the image : ${backendMsg}`
        }
      }
    }
    reader.onerror = (err) => {
      alert.value = { state: true, color: 'red', text: `Erreur lecture fichier: ${err}` }
    }
    reader.readAsDataURL(selectedFile)
  } catch (err) {
    console.error("Erreur lors de la mise à jour de l'image :", err)
    alert.value = {
      state: true,
      color: 'red',
      text: `Une erreur s'est produite lors de la mise à jour de l'image : ${err}`
    }
  }
}

const props = defineProps({
  pickFile: Function,
  ProfileEditor: Object
})

const filesImages = ref([])

const onRejected = (rejectedEntries) => {
  notify({
    type: 'negative',
    message: `${rejectedEntries.length} file(s) did not pass validation constraints`
  })
}

const changeTab = (tab) => {
  activeTab.value = tab
}

// Affichage de toutes les images sans filtrage

const updateUser = async () => {
  try {
    const url = `${import.meta.env.VITE_APP_API_URL}/api/users/updateprofile`
    const headers = { 'x-auth-token': user.token }
    const res = await axios.post(url, user.value, { headers })

    if (res && res.data && !res.data.msg) {
      alert.value = {
        state: true,
        color: 'green',
        text: 'Your account has been updated successfully'
      }
      store.dispatch('updateUser', user.value)
    } else {
      alert.value = {
        state: true,
        color: 'red',
        text: res.data.msg ? res.data.msg : 'Oops... something went wrong!'
      }
    }
  } catch (err) {
    console.error('err updateUser in frontend/SettingsView.vue ===> ', err)
  }
}

const history = ref([])
const historyTotal = ref(0)
const historyOffset = ref(0)
const historyLimit = 20

const fetchUser = async () => {
  try {
    const token = user.value.token || localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const url = `${import.meta.env.VITE_APP_API_URL || ''}/api/users/show`
    const { data } = await axios.post(url, {}, { headers })
    if (data && data.user) {
      user.value = data.user
      store.commit('updateUser', data.user)
    }
  } catch (e) {
    // handle error
  }
}

const fetchHistory = async (reset = false) => {
  try {
    const token = user.value.token || localStorage.getItem('token')
    const headers = { 'x-auth-token': token }
    const offset = reset ? 0 : historyOffset.value
    const url = `${
      import.meta.env.VITE_APP_API_URL || ''
    }/api/browse/allhistory?offset=${offset}&limit=${historyLimit}`
    const { data } = await axios.get(url, { headers })
    if (data && data.history) {
      if (reset) {
        history.value = data.history
      } else {
        history.value = [...history.value, ...data.history]
      }
      historyTotal.value = data.total
      historyOffset.value = history.value.length
    }
  } catch (e) {
    // handle error
  }
}

const fetchMoreHistory = () => {
  fetchHistory(false)
}

onMounted(async () => {
  // Toujours rafraîchir les images utilisateur
  await store.dispatch('fetchUserImages')
  // Si user déjà dans le store, on affiche direct
  if (user.value && user.value.username) {
    // fetch en arrière-plan pour update
    fetchUser()
    fetchHistory(true)
  } else {
    // fallback: premier chargement, on attend le fetch
    await fetchUser()
    await fetchHistory(true)
  }
})

const syncUser = (updatedUser) => {
  store.commit('updateUser', updatedUser)
}
</script>

<style scoped>
.q-tabs__content {
  align-items: center;
  justify-content: center;
  padding: 0;
}
.separator-margin {
  margin-left: -2000px;
  margin-right: -2000px;
  z-index: 1;
}
.page-container {
  font-family: 'Elliane' !important;
  color: rgb(0, 0, 0);
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
  /* margin-bottom: 2em; */
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
  max-width: 400px;
  margin: 0 auto;
}
</style>
