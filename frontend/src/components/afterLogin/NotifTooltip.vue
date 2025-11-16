<template>
  <q-card class="notif_bubble notif_card_effect" clickable @click="onClick">
    <q-card-section>
      <div class="notif-row-main">
        <AppAvatar :image="avatarSrc" :userId="notif.id_from" :showPresence="true" size="small" />
        <div class="notif-main-info">
          <q-icon small style="font-size: 16px !important">
            <template v-if="Array.isArray(getNotifIcon(notif.type)) && getNotifIcon(notif.type)[0] === 'img'">
              <img :src="getNotifIcon(notif.type)[1]" alt="icon" style="width: 18px; height: 18px; vertical-align: middle;" />
            </template>
            <template v-else>
              <span :class="getNotifIcon(notif.type)"></span>
            </template>
          </q-icon>
          <span class="notif-username">{{ notif.username }}</span>
        </div>
      </div>
      <div class="notif-details">
        <div class="notif-msg notif-msg-lifted">
          {{ getDisplayName(notif) }}
          <template v-if="notif.type === 'block' || notif.type === 'you_block' || notif.type === 'he_block'">
            blocked your profile
          </template>
          <template v-else-if="notif.type === 'report' || notif.type === 'signal'">
            reported your profile
          </template>
          <template v-else>
            {{ getNotifMsg(notif) }}
          </template>
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
import AppAvatar from '@/components/common/AppAvatar.vue'
import utility from '@/utility.js'
import moment from 'moment'

const props = defineProps({
  notif: { type: Object, required: true },
  avatarSrc: { type: String, default: '' }
})
const emit = defineEmits(['click'])

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

function onClick() {
  emit('click', props.notif)
}
</script>

<style scoped>
/* Réduction de l'espacement vertical entre les notifications */
.notif_bubble {
  width: 100%;
  max-width: 400px;
  /* margin: 4px auto; réduit la marge verticale */
  border-radius: 10px;
  box-shadow: none;
  border-color: #bdbdbd;
  transition: box-shadow 0.2s, border 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  border: 1px solid #cfcfcf; /* Gris plus clair */
  margin-bottom: -20px; /* Rapproche les notifications */
  cursor: pointer;
}
.notif_card_effect {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.07), 0 1.5px 6px 0 rgba(0, 0, 0, 0.09);
}
.notif_card_effect:hover {
  box-shadow: 0 0 20px 6px rgba(0, 0, 0, 0.18), 0 0 0 1px #bdbdbd;
  border-color: #bdbdbd;
}
/* Réduction du gap entre avatar et infos principales */
.notif-row-main {
  display: flex;
  align-items: center;
  gap: 10px;
  /* margin-bottom: 0px; */
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
/* Réduction du gap vertical dans les détails */
.notif-details {
  display: flex;
  flex-direction: column;
  margin-left: 55px;
}
.notif-msg {
  font-size: 1rem;
  color: #222;
  font-weight: 500;
  margin-top: 2px;
}
.notif-msg-lifted {
  margin-top: -20px;
  min-height: 20px;
  align-self: flex-start;
}
.notif-date {
  font-size: 0.93rem;
  color: #888;
  font-weight: 400;
}
</style>
