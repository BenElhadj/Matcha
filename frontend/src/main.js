import { createApp } from 'vue'
import { store } from '@/stores/store'
import '@mdi/font/css/materialdesignicons.min.css';
import Vue3TagsInput from 'vue3-tags-input'
import { Quasar } from 'quasar'
import iconSet from 'quasar/icon-set/mdi-v6'
import router from '@/router/index'
import { api } from '@/boot/axios' // Ajoutez cette ligne
import 'quasar/src/css/index.sass' 
import App from '@/App.vue'
import '@/assets/base.css'
import { connectSocket } from '@/boot/socketClient'

// Silence noisy console output in production (keep errors)
if (import.meta.env.MODE === 'production') {
	const noop = () => {}
	try {
		console.log = noop
		console.debug = noop
		console.warn = noop
	} catch (_) {
		// noop
	}
}
import utility from '@/utility'

const app = createApp(App)

// Ajoutez axios à l'application
app.config.globalProperties.$api = api

app.use(Quasar, {
	iconSet: iconSet,
})
app.use(Vue3TagsInput)
app.use(store)
app.use(router)

// Warm default .txt images into cache/localStorage (non-blocking) ONLY when
// there's an authenticated token. Prevents writing default data URIs for
// anonymous visitors which could later be used to rehydrate UI after logout.
try {
	const t = localStorage.getItem('token')
	if (t && utility.warmDefaultTxtImages) utility.warmDefaultTxtImages()
} catch (e) { /* noop */ }

// Bootstrap: ensure logged-in user is loaded before first paint
(async () => {
	try {
		const token = localStorage.getItem('token')
		// Reset presence to avoid stale green dots from persisted state
		try { store.commit('setConnectedUsers', []) } catch (_) {}

		if (token) {
			// Ensure we have a user in store; fetch if missing
			let userId = store.getters?.user?.id || store.state?.auth?.user?.id
			if (!userId) {
				try {
					const res = await api.get('/api/auth/isloggedin')
					if (res?.data && !res.data.msg) {
						const usr = { ...res.data }
						if (usr.birthdate) usr.birthdate = new Date(usr.birthdate).toISOString().substr(0, 10)
						await store.dispatch('login', usr)
						userId = usr.id
					}
				} catch (_) {}
			}

			// Connect socket and wire listeners even if user was already in store
			if (userId) {
				// Prime DB-backed state only (lighter) if empty
				try {
					if (!Array.isArray(store.state.followers) || !store.state.followers.length) {
						await store.dispatch('syncMatches')
					}
					if (!Array.isArray(store.state.convos) || !store.state.convos.length) {
						await store.dispatch('syncConvoAll')
					}
				} catch (_) {}

				const s = connectSocket(userId, { on: { connect: () => {}, disconnect: () => {} } })

				// Notifications -> immediate local deltas + light reconciliation
				s.on('notif:new', (payload) => {
					try {
						const me = String(userId)
						const type = payload && payload.type ? String(payload.type) : ''
						const from = payload && (payload.id_from != null ? String(payload.id_from) : '')
						const to = payload && (payload.id_to != null ? String(payload.id_to) : '')
						const other = from === me ? to : from
						if (!other) return
						if (type === 'like') {
							if (to === me) store.commit('addFollower', Number(from))
							if (from === me) store.commit('addFollowing', Number(to))
								// Clear any lingering unlike flags on fresh likes so UI can reflect he_like/you_like
								try { store.commit('clearUnlike', Number(other)) } catch (_) {}
						} else if (type === 'like_back') {
							const target = Number(other)
							store.commit('addFollower', target)
							store.commit('addFollowing', target)
								// Mutual like rescinds any previous dislike flags
								try { store.commit('clearUnlike', target) } catch (_) {}
						} else if (type === 'unlike') {
								store.commit('removeMatchEdges', Number(other))
								try {
									const dir = from === me ? 'you_unlike' : 'he_unlike'
									store.commit('markUnlike', { id: Number(other), dir })
								} catch (_) {}
						}
					} catch (_) {}
					try {
						const t = payload && payload.type ? String(payload.type) : ''
						if (t === 'like' || t === 'like_back' || t === 'unlike') {
							try { store.dispatch('syncMatches') } catch (_) {}
							try { store.dispatch('syncConvoAll') } catch (_) {}
						}
					} catch (_) {}
				})

				s.on('notif:seenAll', () => { store.commit('seenNotif') })
				s.on('notif:seenFrom', (payload) => { if (payload && payload.id_from) store.commit('seenNotifFrom', payload.id_from) })
				s.on('notif:seenIds', (payload) => {
					const ids = payload && Array.isArray(payload.ids) ? payload.ids : []
					if (ids.length) store.commit('markNotifsSeenByIds', ids)
				})
				s.on('visit', () => { store.dispatch('getNotifPage', { limit: 50, page: 1 }) })
				s.on('online', (onlineIds) => {
					try {
						const selfId = String(userId)
						const ids = Array.isArray(onlineIds)
							? onlineIds.filter((id) => String(id) !== selfId).map((id) => String(id))
							: []
						store.commit('setConnectedUsers', ids)
					} catch (_) {}
				})
				const resyncBlocked = () => store.dispatch('syncBlocked')
				s.on('block', resyncBlocked)
				s.on('unblock', resyncBlocked)
			}
		}
	} catch (e) {
		// Silent fail; app still mounts
	} finally {
		app.mount('#app')
	}
})()