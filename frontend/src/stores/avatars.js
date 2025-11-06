// Centralized avatar caching and optimization
// Provides reactive id->src map, fast seeding from provided image hints, and async fetch fallback

import utility from '@/utility.js'
import axios from 'axios'

export const avatars = {
  // Keep namespaced flag harmless; this module isn't registered via `modules` but
  // its actions/mutations are spread into the root store. We therefore always
  // read/write under root state's `avatars` bag below.
  namespaced: true,
  state: () => ({
    byId: {}, // { [userId]: src }
    pending: {}, // { [userId]: true }
    errors: {}, // { [userId]: true }
  }),
  getters: {
    avatar: (state) => (id) => state.byId[id] || null,
    avatarsMap: (state) => state.byId
  },
  mutations: {
    // NOTE: Mutations operate on root state's `avatars` sub-tree because this
    // module is not registered under `modules` in store.js; its mutations are
    // spread into root and receive the root `state` object.
    setAvatar(state, { id, src }) {
      if (!id) return
      const key = String(id)
      const bag = state.avatars || (state.avatars = { byId: {}, pending: {}, errors: {} })
      bag.byId = { ...bag.byId, [key]: src }
      if (bag.pending && bag.pending[key]) delete bag.pending[key]
    },
    setPending(state, id) {
      if (!id) return
      const key = String(id)
      const bag = state.avatars || (state.avatars = { byId: {}, pending: {}, errors: {} })
      bag.pending = { ...bag.pending, [key]: true }
    },
    setError(state, id) {
      if (!id) return
      const key = String(id)
      const bag = state.avatars || (state.avatars = { byId: {}, pending: {}, errors: {} })
      bag.errors = { ...bag.errors, [key]: true }
    },
  },
  actions: {
    // Actions also receive the ROOT state because they're spread at root.
    // Always use `state.avatars` as the storage bag.
    async ensureAvatar({ state, commit }, { id, imageHint } = {}) {
      if (!id) return null
      const key = String(id)
      const bag = state.avatars || (state.avatars = { byId: {}, pending: {}, errors: {} })
      // If already cached, return immediately
      if (bag.byId && bag.byId[key]) return bag.byId[key]

      // Seed from hint synchronously if possible
      try {
        if (imageHint && typeof imageHint !== 'undefined' && imageHint !== null) {
          const base = import.meta.env.BASE_URL || '/'
          const fallback = utility.getCachedDefault?.('profile') || `${base}default/defaut_profile.txt`
          const seeded = utility.getImageSrc
            ? utility.getImageSrc(imageHint, fallback)
            : (utility.getFullPath ? utility.getFullPath(imageHint) : fallback)
          if (seeded && seeded !== fallback) {
            // Downscale large data URIs only once
            let optimized = seeded
            if (utility.makeSmallAvatar && /^data:image\//.test(seeded)) {
              optimized = await utility.makeSmallAvatar(seeded, 48)
            }
            commit('setAvatar', { id: key, src: optimized })
            return optimized
          }
        }
      } catch (_) { /* ignore seeding errors */ }

      // Avoid duplicate fetches
      if (bag.pending && bag.pending[key]) return null
      commit('setPending', key)
      try {
        const token = localStorage.getItem('token')
        const headers = token ? { 'x-auth-token': token } : {}
        const url = `${import.meta.env.VITE_APP_API_URL}/api/users/show/${id}`
        const res = await axios.get(url, { headers })
        const images = Array.isArray(res.data?.images) ? res.data.images : []
        const profileImg = images.find((img) => img && (img.profile === 1 || img.profile === true)) || images[0]
        if (!profileImg) {
          const base = import.meta.env.BASE_URL || '/'
          const fallback = utility.getCachedDefault?.('profile') || `${base}default/defaut_profile.txt`
          commit('setAvatar', { id: key, src: fallback })
          return fallback
        }
        const base = import.meta.env.BASE_URL || '/'
        const fallback = utility.getCachedDefault?.('profile') || `${base}default/defaut_profile.txt`
        let resolved = utility.getImageSrc
          ? utility.getImageSrc(profileImg, fallback)
          : (utility.getFullPath ? utility.getFullPath(profileImg?.name || profileImg?.link || profileImg?.data || '') : fallback)
        if (utility.makeSmallAvatar && /^data:image\//.test(resolved)) {
          resolved = await utility.makeSmallAvatar(resolved, 48)
        }
        commit('setAvatar', { id: key, src: resolved })
        return resolved
      } catch (e) {
        commit('setError', key)
        return null
      }
    }
  }
}
