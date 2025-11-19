<template>
  <q-page>
    <q-page-container>
      <h1 class="q-pb-md" style="text-align: center">Settings</h1>
      <h3 style="margin-bottom: 100px; text-align: center">
        {{ user.username }}
      </h3>

      <div class="q-pa-md row flex flex-center justify-between" style="margin: 7%">
        <div class="col-xs-12 col-sm-6 q-pa-md">
          <div
            class="row items-center"
            style="
              display: flex;
              flex-direction: column;
              align-content: flex-start;
              align-items: center;
            "
          >
            <img
              style="width: 130px; margin-left: 7px"
              class="col-auto q-ml-md"
              src="@/assets/Settings/resetEmail.png"
              @click="emailDialog = true"
            />
            <br />
            <q-input v-model="user.email" readonly label="Email" />
          </div>
        </div>
        <div class="q-flex column items-center justify-center">
          <div class="align-center">
            <img
              style="width: 130px; margin-left: 7px"
              class="col-auto q-ml-md"
              src="@/assets/Settings/resetPasswd.png"
              @click="passDialog = true"
            />
            <br />
            <q-input
              v-model="user.passe"
              readonly
              value="***********"
              label="Password"
              type="password"
            />
          </div>
        </div>
      </div>

      <div class="q-pa-md row flex flex-center justify-between" style="margin: 7%">
        <div class="q-flex column items-center justify-center">
          <div class="align-center">
            <img
              style="width: 150px; margin-left: 7px"
              src="@/assets/Settings/geolocalisation.png"
              @click="openLoc"
              alt="Location Icon"
            />
          </div>
          <span>Click here to update your location</span>
        </div>
        <div class="q-flex column items-center justify-center">
          <div class="align-center">
            <img
              style="width: 150px"
              src="@/assets/Settings/blocked.png"
              @click="
                Array.isArray(blacklist) && blacklist.length === 0
                  ? noBlacklist()
                  : (blackListDialog = true)
              "
            />
          </div>
          <span>Click here to view blocked users</span>
        </div>
      </div>

      <q-dialog
        v-model="emailDialog"
        max-width="500"
        persistent
        transition-show="rotate"
        transition-hide="rotate"
      >
        <q-card class="q-pa-md q-ma-md">
          <h5 class="display-1 text-center text-md-left pt-3 pb-3 mb-4 hidden-sm-and-down">
            Change your email
          </h5>
          <div class="my-4">
            <q-input
              v-model="oldEmail"
              color="primary"
              label="Current email"
              :rules="rules.email"
              required
            >
              <template #append>
                <q-icon class="cursor-pointer"></q-icon>
              </template>
            </q-input>
            <q-input
              v-model="newEmail"
              color="primary"
              label="New email"
              :rules="rules.email"
              required
            >
              <template #append>
                <q-icon class="cursor-pointer"></q-icon>
              </template>
            </q-input>
            <q-input
              v-model="pwd"
              color="primary"
              class="mb-3"
              :rules="rules.passRules"
              label="Current password"
              hint="Start with your old password"
              autocomplete="off"
              filled
              :type="showPwd ? 'text' : 'password'"
            >
              <template #append>
                <q-icon
                  :name="showPwd ? 'mdi-eye' : 'mdi-eye-off'"
                  class="cursor-pointer"
                  @click="showPwd = !showPwd"
                ></q-icon>
              </template>
            </q-input>
          </div>
          <q-card-actions align="right">
            <q-btn flat color="primary" :disable="!validEmail" @click="saveEmail">Save</q-btn>
            <q-btn flat color="primary" @click="closeEmail">Cancel</q-btn>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog
        v-model="passDialog"
        max-width="500px"
        persistent
        transition-show="rotate"
        transition-hide="rotate"
      >
        <q-card class="q-pa-md q-ma-md">
          <h5 class="display-1 text-center text-md-left pt-3 pb-3 mb-4 hidden-sm-and-down">
            Change your password
          </h5>
          <div class="my-4">
            <q-input
              v-model="oldPwd"
              color="primary"
              :rules="rules.passRules"
              label="Current password"
              hint="Start with your old password"
              autocomplete="off"
              filled
              :type="showPwd ? 'text' : 'password'"
            >
              <template #append>
                <q-icon
                  :name="showPwd ? 'mdi-eye' : 'mdi-eye-off'"
                  class="cursor-pointer"
                  @click="showPwd = !showPwd"
                ></q-icon>
              </template>
            </q-input>
            <q-input
              v-model="newPwd"
              color="primary"
              :rules="rules.newPwd"
              label="New password"
              hint="Choose your new password"
              filled
              :type="showNewPwd ? 'text' : 'password'"
            >
              <template v-slot:append>
                <q-icon
                  :name="showNewPwd ? 'mdi-eye' : 'mdi-eye-off'"
                  class="cursor-pointer"
                  @click="showNewPwd = !showNewPwd"
                ></q-icon>
              </template>
            </q-input>
            <q-input
              v-model="confNewPwd"
              color="primary"
              :rules="rules.confNewPwd"
              label="Confirm Password"
              hint="Confirm your password"
              filled
              :type="showConfPwd ? 'text' : 'password'"
              @keyup.enter="savePass"
              :error-messages="passwordMatch"
            >
              <template v-slot:append>
                <q-icon
                  :name="showConfPwd ? 'mdi-eye' : 'mdi-eye-off'"
                  class="cursor-pointer"
                  @click="showConfPwd = !showConfPwd"
                ></q-icon>
              </template>
            </q-input>
          </div>
          <q-card-actions align="right">
            <q-btn flat color="primary" :disable="!validPwd" @click="savePass">Save</q-btn>
            <q-btn flat color="primary" @click="closePass">Cancel</q-btn>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog
        v-model="locDialog"
        persistent
        maximized-toggle
        transition-show="rotate"
        transition-hide="rotate"
      >
        <q-card style="position: initial; display: block">
          <q-header>
            <q-bar>
              <span>{{ 'Longitude : ' + longitude }}</span>
              <span>{{ 'Latitude : ' + latitude }}</span>
              <q-space></q-space>
              <q-btn dense icon="mdi-google-maps" color="info" @click="changeLoc">
                <q-tooltip class="bg-white text-primary">Update your location</q-tooltip>
              </q-btn>
              <q-space></q-space>
              <q-space></q-space>
              <q-btn dense icon="mdi-window-close" flat color="white" @click="locDialog = false">
                <q-tooltip class="bg-white text-primary">Close</q-tooltip>
              </q-btn>
            </q-bar>
          </q-header>
          <q-page-container>
            <MapLocationSelector
              style="margin: 700px 0px 0px important"
              :latitude="latitude"
              :longitude="longitude"
              :apiKey="googleKey"
              :mapId="googleMapId"
              @location-updated="locationUpdated"
              v-if="locDialog"
            ></MapLocationSelector>
          </q-page-container>
        </q-card>
      </q-dialog>

      <q-dialog
        v-model="blackListDialog"
        class="q-pa-md"
        transition-show="rotate"
        transition-hide="rotate"
      >
        <div
          v-if="Array.isArray(blacklist) && blacklist.length > 0"
          class="q-pa-md"
          style="background-color: white"
        >
          <q-item
            v-for="banned in blacklist"
            :key="banned.block_row_id || banned.id"
            class="blacklist_item mx-2"
            :class="{
              'block-bg': banned.type === 'block',
              'report-bg': banned.type === 'report'
            }"
            style="width: 340px"
          >
            <q-expansion-item
              :class="
                banned.type === 'block'
                  ? 'block-bg'
                  : banned.type === 'report'
                  ? 'report-bg'
                  : 'bg-grey-3'
              "
            >
              <template v-slot:expand-icon>
                <q-icon name="mdi-chevron-down" style="margin-top: " />
              </template>
              <template v-slot:header>
                <q-item-section avatar>
                  <AppAvatar :image="banned.avatar" size="small" />
                </q-item-section>
                <q-item-section>
                  <div class="row items-center">
                    <div class="text-weight-bold">
                      {{ banned.first_name }} {{ banned.last_name }}
                    </div>
                  </div>
                  <div style="display: flex; flex-direction: row; align-items: center; width: 100%">
                    <div class="text-caption text-grey" style="flex: 1; text-align: left">
                      @{{ banned.username }}
                    </div>
                    <img
                      v-if="banned.type === 'block'"
                      src="@/assets/Block/block.png"
                      alt="block icon"
                      style="width: 20px; height: 23px; margin-bottom: 0px; margin-left: auto"
                    />
                    <img
                      v-else-if="banned.type === 'report'"
                      src="@/assets/Block/report.png"
                      alt="report icon"
                      style="width: 20px; height: 23px; margin-bottom: 0px; margin-left: auto"
                    />
                  </div>
                  <div class="row items-center q-mt-xs">
                    <q-rating
                      :color="
                        user.gender === 'male'
                          ? 'blue-3'
                          : user.gender === 'female'
                          ? 'pink-2'
                          : 'blue-5'
                      "
                      :color-selected="
                        user.gender === 'male'
                          ? 'blue-9'
                          : user.gender === 'female'
                          ? 'pink-8'
                          : 'pink-4'
                      "
                      :modelValue="banned.rating && !isNaN(banned.rating) ? banned.rating : 0"
                      icon="mdi-heart-outline"
                      icon-selected="mdi-heart"
                      icon-half="mdi-heart-half-full"
                      max="7"
                      readonly
                      dense
                      size="1.3em"
                      half-increments
                      class="rating"
                    />
                    <span class="q-ml-sm text-weight-bold">{{
                      banned.rating ? banned.rating.toFixed(1) : '0.0'
                    }}</span>
                  </div>
                </q-item-section>
              </template>
              <q-card>
                <q-card-section>
                  <span>
                    {{ banned.first_name }} {{ banned.last_name }} is
                    {{ new Date().getFullYear() - new Date(banned.birthdate).getFullYear() }} years
                    old.
                  </span>
                  <br />
                  <span>
                    <template v-if="banned.type === 'block'">
                      You blocked them on {{ moment(banned.blocked_at).format('D MMMM, YYYY') }}
                    </template>
                    <template v-else-if="banned.type === 'report'">
                      You reported them on {{ moment(banned.blocked_at).format('D MMMM, YYYY') }}
                    </template>
                    <template v-else>
                      Action on {{ moment(banned.blocked_at).format('D MMMM, YYYY') }}
                    </template>
                  </span>
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn v-if="banned.type === 'block'" color="green" flat @click="unBlock(banned)"
                    >unblocked</q-btn
                  >
                  <q-btn v-if="banned.type === 'report'" color="red" flat @click="unReport(banned)"
                    >remove report</q-btn
                  >
                  <q-btn
                    v-if="banned.can_view_profile && banned.blocked_id"
                    color="primary"
                    flat
                    @click="
                      $router.push({ name: 'userprofile', params: { id: banned.blocked_id } })
                    "
                    >View profile</q-btn
                  >
                </q-card-actions>
              </q-card>
            </q-expansion-item>
          </q-item>
        </div>
      </q-dialog>

      <AlertView :alert="alert" />
    </q-page-container>
  </q-page>
</template>

<script setup>
// function logAvatar(avatar) {
//   // Log la valeur de l'avatar pour debug
//   // eslint-disable-next-line no-console
//   // console.log('DEBUG avatar:', avatar)
//   return ''
// }
import moment from 'moment'
import { ref, onMounted, computed, nextTick, defineAsyncComponent, watch } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import utility, { getBlockReportIcon, getBlockReportMessage, getImageSrc, API_URL } from '@/utility'
// Expose helpers for template
// (If using <script setup>, these are auto-exposed)
import AlertView from '@/views/AlertView.vue'

import AppAvatar from '@/components/common/AppAvatar.vue'
// import { getImageSrc } from '@/utility.js' (inutile ici)
import MapLocationSelector from '@/components/common/MapLocationSelector.vue'

const googleKey = import.meta.env.VITE_APP_GOOGLE_KEY || ''
const googleMapId = import.meta.env.VITE_APP_GOOGLE_MAP_ID || ''

const store = useStore()
const user = computed(() => store.getters.user)
const emailDialog = ref(false)
const passDialog = ref(false)
const locDialog = ref(false)
const showPwd = ref(false)
const showNewPwd = ref(false)
const showConfPwd = ref(false)
const pwd = ref('')
const oldPwd = ref('')
const newPwd = ref('')
const confNewPwd = ref('')
const oldEmail = ref('')
const newEmail = ref('')
const blacklist = ref([])
const blackListDialog = ref(false)
const latitude = computed(() => (location.value ? Number(location.value.lat) : 0))
const longitude = computed(() => (location.value ? Number(location.value.lng) : 0))
const location = computed(() => store.getters.location)
const passwordMatch = () => {
  return confNewPwd.value === newPwd.value || 'Passwords do not match!'
}

const getFullPath = utility.getFullPath

const newLocation = ref({
  lat: null,
  lng: null
})
const alert = ref({
  state: false,
  color: '',
  text: ''
})

const swapLocation = ref({
  lat: location.value.lat,
  lng: location.value.lng
})

const fetchBlacklist = async () => {
  try {
    const res = await utility.sync('users/getblocked')
    if (Array.isArray(res)) {
      blacklist.value = res
    } else {
      alert.value = { state: true, color: 'red', text: 'Erreur: réponse inattendue du serveur' }
      blacklist.value = []
    }
  } catch (err) {
    alert.value = {
      state: true,
      color: 'red',
      text: 'Erreur lors de la récupération de la blacklist.'
    }
    blacklist.value = []
  }
}
// Supprimer un report
const unReport = async (banned) => {
  const block_row_id = banned.block_row_id || banned.id
  const url = `${API_URL}/api/users/unreport`
  const headers = { 'x-auth-token': user.value.token }
  try {
    const result = await axios.post(url, { id: block_row_id }, { headers })
    if (result.data && result.data.status === 'success') {
      fetchBlacklist()
      alert.value = {
        state: true,
        color: 'green',
        text: result.data.message || 'Report removed.'
      }
    } else {
      alert.value = {
        state: true,
        color: 'red',
        text:
          result.data && result.data.message
            ? result.data.message
            : 'Erreur lors de la suppression du report.'
      }
    }
  } catch (err) {
    alert.value = {
      state: true,
      color: 'red',
      text: 'Erreur serveur lors de la suppression du report.'
    }
  }
}
const rules = {
  email: [(v) => !!v || 'Email field is required', (v) => /.+@.+/.test(v) || 'Invalid email'],
  passRules: [(v) => !!v || 'Password field is required'],
  newPwd: [
    (v) => !!v || 'Password field is required',
    (v) =>
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v) ||
      'The password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    (v) => v.length >= 8 || 'Password must contain at least 8 characters'
  ],
  confNewPwd: [
    (v) => !!v || 'Confirm Password field is required',
    (v) => v === newPwd.value || 'Passwords do not match'
  ]
}

const validPwd = computed(() => {
  return (
    rules.newPwd.every((rule) => rule(newPwd.value) === true) &&
    rules.passRules.every((rule) => rule(oldPwd.value) === true) &&
    newPwd.value === confNewPwd.value &&
    newPwd.value.length > 0 &&
    oldPwd.value.length > 0 &&
    confNewPwd.value.length > 0
  )
})

const savePass = async () => {
  if (!validPwd.value) {
    alert.value = { state: true, color: 'red', text: 'Please fill all fields correctly!' }
    return
  }
  try {
    const url = `${API_URL}/api/users/changepassword`
    const headers = { 'x-auth-token': user.value.token }
    const data = {
      password: oldPwd.value,
      newPassword: newPwd.value,
      confNewPassword: confNewPwd.value
    }
    const res = await axios.post(url, data, { headers })
    if (res.data.status === 'success') {
      alert.value = { state: true, color: 'green', text: 'Your password has been updated' }
      closePass()
    } else {
      alert.value = {
        state: true,
        color: 'red',
        text: res.data.message || 'Error updating password'
      }
    }
  } catch (err) {
    alert.value = { state: true, color: 'red', text: 'Server error' }
    console.error('err savePass in frontend/ProfileSettings.vue ===> ', err)
  }
}

const closePass = () => {
  passDialog.value = false
  oldPwd.value = ''
  newPwd.value = ''
  confNewPwd.value = ''
}

const validEmail = computed(() => {
  return (
    rules.email.every((rule) => rule(newEmail.value) === true) &&
    rules.email.every((rule) => rule(oldEmail.value) === true) &&
    rules.passRules.every((rule) => rule(pwd.value) === true) &&
    newEmail.value.length > 0 &&
    oldEmail.value.length > 0 &&
    pwd.value.length > 0
  )
})

const saveEmail = async () => {
  if (!validEmail.value) {
    alert.value = { state: true, color: 'red', text: 'Please fill all fields correctly!' }
    return
  }
  try {
    const url = `${API_URL}/api/users/changeemail`
    const headers = { 'x-auth-token': user.value.token }
    const data = {
      email: newEmail.value,
      password: pwd.value
    }
    const res = await axios.post(url, data, { headers })
    pwd.value = ''
    if (res.data.status === 'success') {
      alert.value = { state: true, color: 'green', text: 'Your email has been updated' }
      store.getters.user.email = newEmail.value
      closeEmail()
    } else {
      alert.value = { state: true, color: 'red', text: res.data.message || 'Error updating email' }
    }
  } catch (err) {
    alert.value = { state: true, color: 'red', text: 'Server error' }
    console.error('err saveEmail in frontend/ProfileSettings.vue ===> ', err)
  }
}

const closeEmail = () => {
  emailDialog.value = false
  oldEmail.value = ''
  newEmail.value = ''
  pwd.value = ''
}

const openLoc = () => {
  locDialog.value = true
}

const locationUpdated = (newLocation) => {
  // Defensive copy to avoid reactivity issues
  swapLocation.value = { ...newLocation }
}

const changeLoc = async () => {
  locDialog.value = false
  const url = `${API_URL}/api/users/location`
  const headers = { 'x-auth-token': user.value.token }
  // Only send a plain object, not a ref
  const payload = { lat: swapLocation.value.lat, lng: swapLocation.value.lng }
  const res = await axios.post(url, payload, { headers })
  if (res && res.data && !res.data.msg) {
    // Only commit the new location object, not the computed property
    store.commit('locate', payload)
    alert.value = { state: true, color: 'green', text: 'Your location has been updated' }
  } else {
    alert.value = {
      state: true,
      color: 'red',
      text: res.data.msg ? res.data.msg : 'Oops... something went wrong!'
    }
  }
  // Reset swapLocation after update
  swapLocation.value = { lat: location.value.lat, lng: location.value.lng }
}

const unBlock = async (banned) => {
  const blocked_id = banned.blocked_id || banned.id
  const url = `${API_URL}/api/users/unblock`
  const headers = { 'x-auth-token': user.value.token }
  try {
    const result = await axios.post(url, { id: blocked_id }, { headers })
    await fetchBlacklist()
    if (result.data && result.data.message) {
      alert.value = {
        state: true,
        color: result.data.status === 'success' ? 'green' : 'red',
        text: result.data.message
      }
    }
  } catch (err) {
    alert.value = { state: true, color: 'red', text: 'Erreur serveur lors du déblocage.' }
  }
}

// Récupère la blacklist dès l'ouverture de la page
onMounted(() => {
  fetchBlacklist()
})

const noBlacklist = () => {
  alert.value = {
    state: true,
    color: 'green',
    text: "You haven't blocked or reported anyone."
  }
}
</script>

<style>
body,
.q-page-container,
.q-page,
.q-dialog,
.q-card,
.q-item,
.q-item-section,
.q-item-label,
.text-caption,
.text-grey,
.text-weight-bold,
.q-btn,
.q-input,
.q-rating,
.q-expansion-item,
.blacklist_item {
  font-size: 1.01em !important;
  letter-spacing: 0.018em !important;
}

.map_toolbar {
  z-index: 5;
}

.block-bg {
  background: linear-gradient(90deg, #fff0f0 60%, #f8f9fa 100%) !important;
}
.report-bg {
  background: linear-gradient(90deg, #fffbe6 60%, #f8f9fa 100%) !important;
}

.map-container {
  position: initial !important;
}

.expansion_list {
  color: #666;
}

.v-expansion-panel__header {
  padding: 8px 24px;
}

.color_picker {
  width: 2rem;
  height: 2rem;
  margin: 1vw 2vw;
  border-radius: 5px;
  cursor: pointer;
}
</style>
