import { API_URL, BASE_URL } from '@/utility.js';
<template>
  <q-page>
    <q-page-container>
      <h1 class="q-pb-md" style="text-align: center">Profile</h1>
      <h3 style="margin-bottom: 100px; text-align: center">
        {{ user.username }}
      </h3>

      <div v-if="owner" class="q-flex column items-center justify-center">
        <q-btn
          v-if="isEditing"
          class="edit icon-edit stack"
          flat
          square
          fab
          @click="isEditing = false"
        />
        <q-btn v-else class="edit icon-toEdit stack" flat square fab @click="isEditing = true" />
      </div>

      <div v-else class="note">
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
          size="4em"
          half-increments
          class="rating"
        />
      </div>

      <q-form @submit.prevent="updateUser" class="q-gutter-md form-horizontal-padding" v-if="user">
        <q-input
          v-model="user.username"
          :readonly="!isEditing"
          label="Username"
          class="one-input"
        />

        <div class="q-gutter-md row">
          <q-input
            v-model="user.first_name"
            :readonly="!isEditing"
            label="First Name"
            class="tow-input"
          />
          <q-separator vertical spacing class="separator-margin"></q-separator>
          <q-input
            v-model="user.last_name"
            :readonly="!isEditing"
            label="Last Name"
            class="tow-input"
          />
        </div>

        <q-input
          v-model="birthdate"
          :readonly="!isEditing"
          label="Birth Date"
          type="date"
          class="one-input"
        />
        <q-input
          v-model="user.phone"
          :readonly="!isEditing"
          label="Phone Number"
          class="one-input"
        />

        <div class="q-gutter-md row">
          <div class="tow-input" style="display: flex; flex-direction: column">
            <label for="gender">Gender</label>
            <select id="gender" v-model="user.gender" :disabled="!isEditing" class="custom-select">
              <option v-for="g in genders" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <q-separator vertical spacing class="separator-margin"></q-separator>
          <div class="tow-input" style="display: flex; flex-direction: column">
            <label for="looking">Looking For</label>
            <select
              id="looking"
              v-model="user.looking"
              :disabled="!isEditing"
              class="custom-select"
            >
              <option v-for="l in looking" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
        </div>

        <q-input v-model="user.address" :readonly="!isEditing" label="Address" class="one-input" />

        <div class="q-gutter-md row">
          <q-input v-model="user.city" :readonly="!isEditing" label="City" class="tow-input" />
          <q-separator vertical spacing></q-separator>
          <q-input
            v-model="user.postal_code"
            :readonly="!isEditing"
            label="Postal Code"
            type="number"
            class="tow-input"
          />
        </div>

        <q-input v-model="user.country" :readonly="!isEditing" label="Country" class="one-input" />

        <div class="one-input">
          <span class="text-h8 text-grey-7">Tags</span>
          <vue3-tags-input
            v-if="isEditing"
            :max-tags="20"
            :maxlength="25"
            :add-on-key="tagEsc"
            :tags="tags"
            @on-tags-changed="updateUserTags"
          />
          <div v-else>
            <q-input
              label="Tags"
              :model-value="Array.isArray(user.tags) ? user.tags.join(', ') : user.tags"
              readonly
            />
          </div>
        </div>
        <q-input
          v-model="user.biography"
          :readonly="!isEditing"
          label="Bio"
          filled
          type="textarea"
          class="one-input"
          :counter="true"
          :max-length="500"
        />

        <div v-if="isEditing">
          <q-btn label="Enregistrer" type="submit" color="primary" />
          <q-btn label="Reset" @click="resetForm" color="red" flat class="q-ml-sm" />
        </div>
      </q-form>
      <AlertView :alert="alert"></AlertView>
    </q-page-container>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useStore, mapActions } from 'vuex'
import utility from '@/utility.js'
import axios from 'axios'
import AlertView from '@/views/AlertView.vue'
import moment from 'moment'

const store = useStore()
const isEditing = ref(false)
const genders = ['male', 'female', 'other']
const looking = ['male', 'female', 'other', 'all']
const tagEsc = [13, ':', ',', ';']
const tagsString = ref('')
const owner = ref(false)
let tag = ref('')
let tags = ref([])
const { user } = defineProps(['user'])
const allTags = computed(() => store.getters.allTags)
const initialUser = ref({ ...user })
const alert = ref({
  state: false,
  color: '',
  text: ''
})

const birthdate = computed({
  get: () => moment(user.birthdate).format('YYYY-MM-DD').toString().split('T')[0],
  set: (value) => {
    user.birthdate = moment(value).format('YYYY-MM-DD')
  }
})

const updateUserTags = (newTags) => {
  user.tags = newTags.join(', ')
}

const syncTags = () => {
  if (user.tags) {
    if (Array.isArray(user.tags)) {
      tags.value = user.tags.map((tag) => tag.trim())
    } else if (typeof user.tags === 'string') {
      tags.value = user.tags.split(',').map((tag) => tag.trim())
    } else {
      tags.value = []
    }
  } else {
    tags.value = []
  }
}

const handleTagsInput = (event) => {
  if (!isEditing.value) {
    event.preventDefault()
  }
}

const resetForm = () => {
  if (initialUser.value) {
    for (const prop in initialUser.value) {
      user[prop] = initialUser.value[prop]
    }
    syncTags()
    isEditing.value = false
  }
}

const updateUser = async () => {
  try {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_APP_API_URL}/api/users/updateprofile`
    const headers = { 'x-auth-token': token }

    const res = await axios.post(url, user, { headers })

    if (res && res.data && !res.data.msg) {
      isEditing.value = false
      store.dispatch('updateUser', user)

      alert.value = {
        state: true,
        color: 'green',
        text: 'Your account has been updated successfully'
      }
    } else {
      alert.value = {
        state: true,
        color: 'red',
        text: res.data.msg ? res.data.msg : 'Oops... something went wrong!'
      }
    }
  } catch (err) {
    alert.value = {
      state: true,
      color: 'red',
      text: err.data.msg ? err.data.msg : 'Oops... error update User!'
    }
    console.error('err updateUser in frontend/ProfileForm.vue ===> ', err)
  }
}

onMounted(async () => {
  if (user) {
    owner.value = true ? user.id === store.getters.user.id : false
    syncTags()
  }
})
</script>

<style scoped>
.rating_value {
  margin-left: 7px;
  margin-right: -3px;
}
.note {
  display: flex;
  align-items: flex-start;
  flex-direction: row;
  justify-content: center;
}
.icon-toEdit {
  background-image: url('@/assets/Edit/clicToEdit.png');
  background-repeat: no-repeat;
}
.icon-edit {
  background-image: url('@/assets/Edit/writing.png');
  background-repeat: no-repeat;
}
.edit {
  width: 100px !important;
  height: 200px !important;
  position: absolute !important;
  background-size: 100%;
}
.one-input {
  min-width: 40px;
  margin-left: 30px;
  margin-right: 55px;
  color: 'primary';
}

.tow-input {
  min-width: 359px;
  color: 'primary';
}

.separator-margin {
  margin-left: 20px;
}

.edit,
.edit:hover,
.edit:focus {
  position: absolute;
}

.vue-tags-input {
  background: transparent !important;
  max-width: 100% !important;
  font-size: 1.2em;
}

.vue-tags-input .ti-input::after {
  content: '';
  display: block;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 25%);
  height: 1.2px;
  transition: width 0.2s ease-in-out;
}

.ti-tag {
  background: var(--color-primary) !important;
}

.ti-autocomplete {
  border: 1px solid var(--color-primary) !important;
  transform: translate(-0.5px, -1.2px);
}

.vue-tags-input.ti-focus .ti-input::after {
  width: 100%;
}

.vue-tags-input .ti-input {
  border: none !important;
}
/* Style custom pour les <select> natifs du formulaire */
.custom-select {
  height: 48px;
  font-size: 1.1em;
  border: none;
  border-bottom: 1px solid #bbb;
  border-radius: 0;
  background: transparent;
  outline: none;
  box-shadow: none;
  padding: 0 8px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}
.custom-select:focus {
  border-bottom: 1.5px solid #888;
}
.custom-select:disabled {
  background: #f5f5f5;
  color: #aaa;
  cursor: not-allowed;
}

/* Add horizontal padding to the form for equal left/right spacing */
.form-horizontal-padding {
  padding-left: 45px;
  /* padding-right: 25px; */
}
</style>
