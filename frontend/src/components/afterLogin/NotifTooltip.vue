<template>
  <q-card class="notif_bubble notif_card_effect" clickable @click="onClick">
    <q-card-section>
      <div class="notif-row-main">
        <AppAvatar :image="avatarSrc" :userId="notif.id_from" :showPresence="true" size="small" />
        <div class="notif-main-info">
          <q-icon small style="font-size: 16px !important">
            <span :class="getNotifIcon(notif.type)"></span>
          </q-icon>
          <span class="notif-username">{{ notif.username }}</span>
        </div>
      </div>
      <div class="notif-details">
        <!-- <div class="notif-fullname">{{ getDisplayName(notif) }}</div> -->
        <div class="notif-msg notif-msg-lifted">
          {{ getDisplayName(notif) }}{{ getNotifMsg(notif) }}
        </div>
        <div class="notif-date">{{ formatDate(notif.date) }}</div>
      </div>
      <q-tooltip anchor="bottom middle" self="top middle">
        <span>{{ formatTime(notif.date) }}</span>
      </q-tooltip>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import AppAvatar from '@/components/common/AppAvatar.vue'
import utility from '@/utility.js'
import moment from 'moment'
import { useRouter } from 'vue-router'

const props = defineProps({
  notif: { type: Object, required: true },
  avatarSrc: { type: String, default: '' }
})
const emit = defineEmits(['click'])
const router = useRouter()

const getNotifIcon = utility.getNotifIcon
const getNotifMsg = utility.getNotifMsg
const formatTime = utility.formatTime || ((d) => moment(d).format('LLL'))
const formatDate = (d) => moment(d).format('D MMMM, YYYY, h:mm A')


// Affichage direct du nom/prénom ou username
function getDisplayName(notif) {
  if (notif.last_name && notif.first_name) return `${notif.last_name} ${notif.first_name}`
  if (notif.username) return notif.username
  return ''
}

function getFullName(notif) {
  // Si last_name et first_name sont présents, on les affiche
  if (notif.last_name && notif.first_name) return `${notif.last_name} ${notif.first_name}`
  // Si username contient un espace, on suppose "Nom Prénom" ou "Prénom Nom"
  if (notif.username && notif.username.includes(' ')) {
    const parts = notif.username.trim().split(/\s+/)
    if (parts.length >= 2) return `${capitalize(parts[0])} ${capitalize(parts[1])}`
    return capitalize(parts[0])
  }
  // Si username contient un point, on suppose "prenom.nom" ou "nom.prenom"
  if (notif.username && notif.username.includes('.')) {
    const parts = notif.username.split('.')
    if (parts.length >= 2) return `${capitalize(parts[0])} ${capitalize(parts[1])}`
    return capitalize(parts[0])
  }
  // Sinon, on retourne le username tel quel
  if (notif.username) return capitalize(notif.username)
  return ''
}
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function onClick() {
  emit('click', props.notif)
}
</script>

<style scoped>
.notif_bubble {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  /* border-radius: 10px; */
  box-shadow: none;
  transition: box-shadow 0.2s, border 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  cursor: pointer;
}
.notif_card_effect {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.07), 0 1.5px 6px 0 rgba(0, 0, 0, 0.09);
}
.notif_card_effect:hover {
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.13), 0 3px 12px 0 rgba(0, 0, 0, 0.16);
  border: 1.5px solid #1976d2;
}
.notif-row-main {
  display: flex;
  align-items: center;
  gap: 10px;
  /* margin-bottom: 2px; */
}
.notif-main-info {
  display: flex;
  align-items: center;
  min-width: 0;
  margin-top: -20px;
  gap: 10px;
}
.notif-username {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1976d2;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.notif-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 55px;
}
.notif-fullname {
  font-size: 1.02rem;
  color: #444;
  font-weight: 500;
}
.notif-msg {
  font-size: 1rem;
  color: #222;
  font-weight: 500;
  margin-top: 2px;
}
.notif-msg-lifted {
  margin-top: -20px;
  /* margin-bottom: 2px; */
  min-height: 20px;
  align-self: flex-start;
}
.notif-date {
  font-size: 0.93rem;
  color: #888;
  font-weight: 400;
  /* margin-top: 2px; */
}
</style>
