// Utilitaire global pour l'affichage d'image
<template>
  <q-page>
    <q-page-container>
      <!-- Bouton d'upload positionné en haut à droite, au-dessus de tout -->
      <div v-if="route && route.path === '/Matcha/settings'" class="upload-btn-container">
        <input
          type="file"
          id="photo-upload"
          ref="photoInputRef"
          accept="image/*"
          @change="onPhotoChange"
          style="display: none"
        />
        <q-btn round color="primary" icon="mdi-camera-plus" @click="onUploadClick" />
      </div>
      <h1 class="q-pb-md" style="margin-top: -10px; text-align: center">Gallery</h1>
      <h3 style="margin-top: -70px; margin-bottom: 100px; text-align: center">
        {{ username }}
      </h3>
      <div class="row q-gutter-md mt-4">
        <div
          v-for="image in props.images"
          :key="image.id"
          class="col-xs-12 col-sm-6 col-md-4 img_container"
        >
          <q-btn
            v-if="user.id == image.user_id"
            icon="mdi-delete-forever"
            size="lg"
            color="negative"
            round
            flat
            class="del_img"
            @click="deleteImg(image)"
          >
          </q-btn>
          <img :src="getImageSrc(image || {})" class="image full-width" loading="lazy" />
        </div>
        <!-- BOUTON + CSS POUR UPLOAD -->
        <div 
          class="col-xs-12 col-sm-6 col-md-4 img_container gallery-plus-container"
          v-if="user.id.toString() === (props.userToto?.id ?? user.id).toString()"
          >
          <input
            type="file"
            id="gallery-upload"
            ref="galleryInputRef"
            accept="image/*"
            @change="onGalleryPhotoChange"
            style="display: none"
          />
          <div class="gallery-plus-btn" @click="onGalleryUploadClick">
            <span class="plus-sign">+</span>
          </div>
        </div>
      </div>
      <!-- Pagination supprimée : toutes les images sont affichées -->
      <AlertView :alert="alert" />
    </q-page-container>
  </q-page>
</template>

<script setup>
import { useStore } from 'vuex'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getImageSrc } from '../../utility.js'
import axios from 'axios'
import AlertView from '../../views/AlertView.vue'

const store = useStore()
const route = useRoute()
const props = defineProps({ images: Array, userToto: Object })
const user = computed(() => store.getters.user)
const alert = ref({ state: false, color: '', text: '' })
const username = ref('')
const photoInputRef = ref(null)
// Pagination supprimée : on affiche toutes les images reçues via props.images
if (props.userToto?.username ?? false) {
  username.value = props.userToto.username
} else {
  username.value = user.value.username
}

// Par défaut, upload galerie
const onPhotoChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('image', file)
  const token = user.value.token || localStorage.getItem('token')
  // Utiliser la bonne route backend pour galerie
  const url = `${import.meta.env.VITE_APP_API_URL}/api/users/image`
  try {
    await axios.post(url, formData, {
      headers: {
        'x-auth-token': token,
        'Content-Type': 'multipart/form-data'
      }
    })
    alert.value = { state: true, color: 'green', text: 'Photo upload réussie !' }
    await store.dispatch('fetchUserImages')
  } catch (err) {
    alert.value = { state: true, color: 'red', text: 'Erreur upload photo' }
  }
}

const onUploadClick = () => {
  if (photoInputRef.value) photoInputRef.value.click()
}

const deleteImg = async (image) => {
  try {
    const url = `${import.meta.env.VITE_APP_API_URL}/api/users/image/del`
    const headers = { 'x-auth-token': user.value.token }
    const data = {
      id: image.id,
      profile: image.profile
    }
    const res = await axios.post(url, data, { headers })
    if (res.data.ok) {
      await store.dispatch('delImg', image.id)
      alert.value = { state: true, color: 'green', text: 'Photo has been removed' }
    } else {
      alert.value = { state: true, color: 'red', text: 'Oups.. something went wrong' }
    }
  } catch (err) {
    console.error('err deleteImg in frontend/ProfileGallery.vue ===> ', err)
  }
}
// Pour le bouton + (upload galerie)
const galleryInputRef = ref(null)
const onGalleryUploadClick = () => {
  if (galleryInputRef.value) galleryInputRef.value.click()
}
const onGalleryPhotoChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('image', file) // champ attendu par le backend
  const token = user.value.token || localStorage.getItem('token')
  const url = `${import.meta.env.VITE_APP_API_URL}/api/users/image`
  try {
    const res = await axios.post(url, formData, {
      headers: {
        'x-auth-token': token
        // NE PAS mettre Content-Type, axios le gère pour FormData
      }
    })
    // Message backend
    let backendMsg =
      res.data?.message || res.data?.msg || res.data?.error || 'Réponse inconnue du serveur'
    let isSuccess = res.data?.status === 'success' || res.data?.ok === true
    alert.value = {
      state: true,
      color: isSuccess ? 'green' : 'red',
      text: backendMsg
    }
    if (isSuccess) {
      await store.dispatch('fetchUserImages')
    }
  } catch (err) {
    let backendMsg =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.response?.data?.error ||
      "Erreur lors de l'upload"
    alert.value = { state: true, color: 'red', text: backendMsg }
  }
}
</script>

<style scoped>
.upload-btn-container {
  position: absolute;
  top: 16px;
  right: 32px;
  z-index: 10;
}
.img_container {
  position: relative;
}
.del_img,
.del_img:hover {
  position: absolute !important;
  top: 0;
  right: 0;
  transform: translate(25%, -25%) scale(0.8);
}
</style>
<style scoped>
.gallery-plus-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.gallery-plus-btn {
  width: 180px;
  height: 220px;
  border-radius: 15px;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 64px;
  font-weight: bold;
  color: #888;
  border: 2px dashed #bbb;
}
.gallery-plus-btn:hover {
  background: #e0e0e0;
  color: #333;
  border-color: #888;
}
.plus-sign {
  font-size: 77px;
  line-height: 5px;
  user-select: none;
}
</style>
