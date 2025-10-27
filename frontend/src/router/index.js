import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
          const url = `${import.meta.env.VITE_APP_API_URL}/api/users/show/${id}`
          const res = await axios.get(url, { headers })
          if (res.data && !res.data.msg) {
            to.meta.prefetchedUser = res.data
            return true
          }
          return '/404'
        } catch (e) {
          console.error('[router] prefetch /user failed', e)
          return '/404'
        }
      }
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
    next()
  }
})

export default router