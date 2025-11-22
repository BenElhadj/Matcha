import { API_URL, BASE_URL } from '@/utility.js';
import { createRouter, createWebHistory } from 'vue-router'
import { store } from '@/stores/store'
import axios from 'axios'

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes: [
    {
      path: '/forgot',
      name: 'forgot',
      component: () => import('@/components/beforeLogin/ForgotView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/components/beforeLogin/LoginView.vue')
    },
    {
      path: '/recover',
      name: 'recover',
      component: () => import('@/components/beforeLogin/RecoverView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/components/beforeLogin/RegisterView.vue')
    },
    {
      path: '/discover',
      name: 'discover',
      component: () => import('@/components/afterLogin/DiscoverView.vue')
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/components/afterLogin/MessengerView.vue')
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/components/afterLogin/NotificationsView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/components/afterLogin/SettingsView.vue')
    },
    {
      path: '/user/:id',
      name: 'userprofile',
      component: () => import('@/components/afterLogin/UserProfile.vue'),
      beforeEnter: async (to) => {
        const id = to.params.id
        if (!id || isNaN(id)) return '/404'
        try {
          const token = localStorage.getItem('token')
          const headers = { 'x-auth-token': token }

          // Tentative récupération de l'id courant (store ou localStorage)
          let selfId = null
          try {
            selfId = store?.getters?.user?.id || null
          } catch (_) { selfId = null }
          if (!selfId) {
            try {
              const u = JSON.parse(localStorage.getItem('user') || 'null')
              selfId = u && u.id ? u.id : null
            } catch (_) { selfId = null }
          }

          // Vérification blocage côté serveur avant de précharger le profil
          try {
            const blkUrl = `${API_URL}/api/users/getblocked`
            const blkRes = await axios.get(blkUrl, { headers })
            const rows = Array.isArray(blkRes.data) ? blkRes.data : (blkRes.data && Array.isArray(blkRes.data.data) ? blkRes.data.data : [])
            const blocked = []
            const blockedBy = []
            if (Array.isArray(rows)) {
              for (const r of rows) {
                // Only consider actual 'block' entries (ignore reports)
                if (r.type && r.type !== 'block') continue
                // backend rows shape: { blocker, blocked } or { blocked_id, block_row_id }
                if (selfId && Number(r.blocker) === Number(selfId)) blocked.push(Number(r.blocked))
                if (selfId && Number(r.blocked) === Number(selfId)) blockedBy.push(Number(r.blocker))
                // Fallback shapes (from userModel.getBlocked mapping)
                if (selfId && Number(r.blocked_id) === Number(selfId) && r.blocker) blockedBy.push(Number(r.blocker))
                if (selfId && Number(r.blocked_id) && Number(r.blocked_id) !== Number(selfId) && Number(r.block_row_id) && r.blocked_id) {
                  // nothing
                }
              }
            }
            // Si la target est dans blocked ou blockedBy, refuser l'accès
            if (blocked.includes(Number(id)) || blockedBy.includes(Number(id))) {
              return '/404'
            }
          } catch (blkErr) {
            // Si la vérif échoue (backend down), on continue la préfetch normal et on laisse
            // le comportement existant gérer les erreurs. Log pour debug.
            console.warn('[router] block-check failed, proceeding to fetch user', blkErr)
          }

          // Préfetch du profil utilisateur
          const url = `${API_URL}/api/users/show/${id}`
          const res = await axios.get(url, { headers })
          if (res.data && !res.data.msg) {
            // Backend often returns an array for single-user fetch (rows).
            // Ensure the router provides an object to the component (prefetchedUser).
            to.meta.prefetchedUser = Array.isArray(res.data) && res.data.length ? res.data[0] : res.data
            return true
          }
          return '/404'
        } catch (e) {
          console.error('[router] prefetch /user failed', e)
          // If backend is sleeping/unavailable, redirect to server waking page instead of 404
          const redirect = encodeURIComponent(`/user/${id}`)
          return `/server-waking?redirect=${redirect}`
        }
      }
    },
    {
      path: '/server-waking',
      name: 'server-waking',
      component: () => import('@/views/ServerWakingView.vue')
    },
    {
      path: '/',
      name: 'users',
      component: () => import('@/components/afterLogin/UsersView.vue')
    },
    {
      path: '/404',
      name: '404',
      component: () => import('@/views/NotFound.vue')
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/404'
    }
  ]
})

// ✅ Gestion de la redirection depuis GitHub Pages 404
router.beforeEach((to, from, next) => {
  // Gère la redirection depuis GitHub Pages 404
  const savedRoute = sessionStorage.getItem('gh-redirect');
  if (savedRoute && savedRoute !== to.path) {
    sessionStorage.removeItem('gh-redirect');
    next(savedRoute);
    return;
  }

  const publicPages = ['/login', '/register', '/forgot', '/recover']
  const authRequired = !publicPages.includes(to.path)
  const loggedIn = !!localStorage.getItem('token')

  if (authRequired && !loggedIn && to.path !== '/recover') {
    next('/login')
  } else {
    // Prevent viewing own profile page: redirect to settings
    if (to.name === 'userprofile') {
      const paramId = to.params && to.params.id != null ? String(to.params.id) : null
      const selfId = (store.getters?.user?.id || store.state?.auth?.user?.id || null)
      if (paramId && selfId && String(selfId) === paramId) {
        next('/settings')
        return
      }
    }
    next()
  }
})

export default router