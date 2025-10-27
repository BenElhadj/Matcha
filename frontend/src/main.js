import { createApp } from 'vue'
import { store } from '@/stores/store'
import '@mdi/font/css/materialdesignicons.min.css';
import Vue3TagsInput from 'vue3-tags-input'
import { Quasar } from 'quasar'
import router from '@/router/index'
import { api } from '@/boot/axios' // Ajoutez cette ligne
import 'quasar/src/css/index.sass' 
import App from '@/App.vue'
import utility from '@/utility'

const app = createApp(App)

// Ajoutez axios à l'application
app.config.globalProperties.$api = api

app.use(Quasar)
app.use(Vue3TagsInput)
app.use(store)
app.use(router)

// Warm default .txt images into cache/localStorage (non-blocking)
try { utility.warmDefaultTxtImages && utility.warmDefaultTxtImages() } catch (e) { /* noop */ }

// Bootstrap: ensure logged-in user is loaded before first paint
(async () => {
	try {
		const token = localStorage.getItem('token')
		// If we have a token but store isn't marked connected or user lacks id, fetch user
		const hasUser = !!(store.getters?.user?.id || store.state?.auth?.user?.id)
		const isConnected = !!(store.state?.auth?.status === true || store.state?.isConnected === true)
		if (token && (!hasUser || !isConnected)) {
			const res = await api.get('/api/auth/isloggedin')
			if (res?.data && !res.data.msg) {
				const usr = { ...res.data }
				if (usr.birthdate) usr.birthdate = new Date(usr.birthdate).toISOString().substr(0, 10)
				await store.dispatch('login', usr)
			}
		}
	} catch (e) {
		// Silent fail; app still mounts
		// console.warn('bootstrap auth failed', e)
	} finally {
		app.mount('#app')
	}
})()