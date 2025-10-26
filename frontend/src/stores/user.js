import utility from '@/utility'
import axios from 'axios'

export const user = {
  state: {
    user: {},
    history: [],
    syncHistory: false,
    location: {},
    visitor: [],
    visited: [],
    notif: [],
    tags: [],
    followers: [],
    following: [],
    blocked: [],
    blockedBy: [],
    blacklist: []
  },
  mutations: {
    updateUserEmail: (state, email) => {
      if (!state.user) {
        state.user = {}
      }
      state.user.email = email
    },
    updateTags: (state, tags) => (state.user.tags = tags.map(cur => cur.text.toLowerCase()).join(',')),

    updateUser: (state, user) => {
      state.user = user;
      try {
        localStorage.setItem('user', JSON.stringify(user));
        if (user.images) {
          localStorage.setItem('user_images', JSON.stringify(user.images));
        }
      } catch (e) {
        console.error('Erreur lors de la sauvegarde user dans localStorage:', e);
      }
    },
    updateProfileImage: (state, data) => {
      state.user.images.forEach(cur => (cur.profile = 0))
      state.user.images.push({ link: data.link || null, data: data.data || null, cover: 0, profile: 1, user_id: data.user_id, id: data.id })
      try {
        localStorage.setItem('user_images', JSON.stringify(state.user.images));
      } catch (e) {
        console.error('Erreur lors de la sauvegarde images dans localStorage:', e);
      }
    },
    updateCoverImage: (state, data) => {
      state.user.images = state.user.images.filter(cur => !cur.cover)
      state.user.images.push({ link: data.link || null, data: data.data || null, cover: 1, profile: 0, user_id: data.user_id, id: data.id })
      try {
        localStorage.setItem('user_images', JSON.stringify(state.user.images));
      } catch (e) {
        console.error('Erreur lors de la sauvegarde images dans localStorage:', e);
      }
    },
    locate: (state, location) => {
      state.location = location
    },
    syncHistory: (state, history) => {
      state.history = history
      state.visitor = history.visitor.filter(cur => !utility.isBlocked(state, cur.id))
      state.visited = history.visited.filter(cur => !utility.isBlocked(state, cur.id))
    },
    syncMatches: (state, matches) => {
      state.followers = matches.followers.filter(cur => !utility.isBlocked(state, cur.id))
      state.following = matches.following.filter(cur => !utility.isBlocked(state, cur.id))
    },
    syncBlocked: (state, blacklist) => {
      state.blocked = blacklist.blocked
      state.blockedBy = blacklist.blockedBy
      const arr = ['visitor', 'visited', 'notif', 'convos', 'followers', 'following']
      arr.forEach(cur => {
        state[cur] = state[cur] ? utility.filterBlocked(state, cur) : []
      })
    },
    getNotif: (state, notif) => {
      state.notif = notif
    },
    getTags: (state, tags) => {
      state.tags = tags
    },
    seenNotif: state => {
      state.notif = state.notif.map(cur => {
        if (cur.type !== 'chat') cur.is_read = 1
        return cur
      })
    },
    delImg: (state, id) => {
      state.user.images = state.user.images.filter(cur => cur.id !== id)
      if (state.user.images.length && !state.user.images.find(cur => cur.profile)) {
        let len = state.user.images.length
        while (--len >= 0) {
          if (!state.user.images[len].cover) {
            state.user.images[len].profile = 1
            break
          }
        }
      }
      try {
        localStorage.setItem('user_images', JSON.stringify(state.user.images));
      } catch (e) {
        console.error('Erreur lors de la sauvegarde images dans localStorage:', e);
      }
    },
    syncBlacklist: (state, list) => {
      if (Array.isArray(list)) {
        state.blacklist = list
      } else {
        console.error('err syncBlacklist in frontend/user.js ===> ', err)
      }
    }
  },
  actions: {
    fetchUserImages: async ({ commit, state }) => {
      // Optimisation : ne refetch pas si déjà présent
      if (state.user.images && state.user.images.length) return;
      try {
        const token = state.user.token || localStorage.getItem('token')
        const userId = state.user.id || JSON.parse(localStorage.getItem('user') || '{}').id
        const url = `${import.meta.env.VITE_APP_API_URL}/api/users/show/${userId}`
        const headers = { 'x-auth-token': token }
        const res = await axios.get(url, { headers })
        if (res.data && Array.isArray(res.data.images)) {
          commit('updateUser', { ...state.user, images: res.data.images })
        } else if (res.data && res.data.images) {
          commit('updateUser', { ...state.user, images: [res.data.images] })
        }
      } catch (err) {
        console.error('Erreur lors du rafraîchissement des images utilisateur:', err)
      }
    },
    updateUserEmail: ({ commit }, email) => {
      commit('updateUserEmail', email)
    },
    updateUser: ({ commit }, user) => {
      const { lat, lng } = user
      commit('locate', { lat, lng })
      commit('updateUser', user)
    },
    locate: ({ commit }) => {
      let loc = {}
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
          commit('locate', loc)
          utility.syncLocation(loc)
        }, () => utility.getLocationFromIp(loc => {
          commit('locate', loc)
          utility.syncLocation(loc)
        }))
      } else {
        utility.getLocationFromIp(loc => {
          commit('locate', loc)
          utility.syncLocation(loc)
        })
      }
    },
    syncMatches: async ({ commit }) => {
      try {
        let following = []
        let followers = []
        const merge = cur => ({
          id: cur[cur.matched_id ? 'matched_id' : 'matcher_id'],
          match_date: cur.match_date,
          username: cur.username,
          profile_image: cur.profile_image
        })
        const res = await utility.sync('getmatches')
        if (!res) {
          console.warn('Aucun match trouvé ou accès refusé. Vérifiez votre connexion ou contactez l’admin.')
        } else if (Array.isArray(res)) {
          following = res.filter(cur => cur.matched_id).map(merge)
          followers = res.filter(cur => cur.matcher_id).map(merge)
        } else if (res.body && Array.isArray(res.body)) {
          following = res.body.filter(cur => cur.matched_id).map(merge)
          followers = res.body.filter(cur => cur.matcher_id).map(merge)
        } else {
          console.warn('Format inattendu de la réponse getmatches:', res)
        }
        commit('syncMatches', { following, followers })
      } catch (err) {
        console.error('err syncMatches in frontend/user.js ===> ', err)
      }
    },
    syncBlocked: async ({ commit, dispatch , state}) => {
      try {
        let blocked = []
        let blockedBy = []
        const res = await utility.sync('users/getblocked')
        if (Array.isArray(res.data)) {
          console.log('res.data', res.data)
          blocked = res.data.filter(cur => cur.blocker === state.user.id).map(cur => cur.blocked)
          blockedBy = res.data.filter(cur => cur.blocked === state.user.id).map(cur => cur.blocker)
          console.log('blocked', blocked)
          console.log('blockedBy', blockedBy)
        }
        commit('syncBlocked', { blocked, blockedBy })
        if (blocked.length) dispatch('syncBlacklist', blocked)
      } catch (err) {
        console.error('err syncBlocked in frontend/user.js ===> ', err)
      }
    },
    syncHistory: async ({ commit }) => {
      // Optimisation : ne refetch pas si déjà présent
      if (state.history && state.history.length) return;
      try {
        // Vérifie le localStorage
        const cachedHistory = localStorage.getItem('user_history');
        if (cachedHistory) {
          const parsed = JSON.parse(cachedHistory);
          commit('syncHistory', parsed);
          return;
        }
        const merge = cur => ({
          id: cur[cur.visitor_id ? 'visitor_id' : 'visited_id'],
          visit_date: cur.visit_date,
          username: cur.username,
          profile_image: cur.profile_image
        });
        const res = await utility.sync('browse/history');
        let responseBody = res.data;
        if (!responseBody) {
          responseBody = [];
        } else if (!Array.isArray(responseBody)) {
          responseBody = [responseBody];
        }
        const history = responseBody.map(cur => ({ ...cur, id: cur.visitor_id || cur.visited_id }));
        const visitor = responseBody.filter(cur => cur.visitor_id).map(merge);
        const visited = responseBody.filter(cur => cur.visited_id).map(merge);
        const toSave = { history, visitor, visited };
        commit('syncHistory', toSave);
        localStorage.setItem('user_history', JSON.stringify(toSave));
      } catch (err) {
        console.error('err syncHistory in frontend/user.js ===> ', err);
      }
    },
  getTags: async ({ commit, state }) => {
      // Optimisation : ne refetch pas si déjà présent
      // Correction : signature correcte avec state
      if (state.tags && state.tags.length) return;
      try {
        // Vérifie le localStorage
        const cachedTags = localStorage.getItem('user_tags');
        let tagsArr = [];
        if (cachedTags && cachedTags !== 'undefined') {
          try {
            tagsArr = JSON.parse(cachedTags);
          } catch (parseErr) {
            console.error('err parsing user_tags in localStorage:', parseErr);
            tagsArr = [];
          }
          commit('getTags', tagsArr);
          return;
        }
        const tags = await utility.sync('browse/tags');
        commit('getTags', tags.body);
        localStorage.setItem('user_tags', JSON.stringify(tags.body));
      } catch (err) {
        console.error('err getTags in frontend/user.js ===> ', err);
      }
    },
    getNotif: async ({ commit }) => {
      try {
        const notif = await utility.syncNotif()
        commit('getNotif', notif)
      } catch (err) {
        console.error('err getNotif in frontend/user.js ===> ', err)
      }
    },
    seenNotif: async ({ commit, state }) => {
      try {
        const url = `${import.meta.env.VITE_APP_API_URL}/api/notif/update`
        const headers = { 'x-auth-token': state.user.token }
        const data = {
          id: state.user.id
        }
        const result = await axios.post(url, data, { headers })

        if (result.data) {
          commit('seenNotif')
        } else {
          console.error('Error marking notifications as seen:', result.data.message)
        }
      } catch (err) {
        console.error('Error in seenNotif action:', err)
      }
    },
    delImg: ({ commit }, id) => {
      commit('delImg', id)
    },
    syncBlacklist: async ({ commit }, blocked) => {
      if (!blocked || !blocked.length) return commit('syncBlacklist', [])
      const token = localStorage.getItem('token')
      const url = `${import.meta.env.VITE_APP_API_URL}/api/users/blacklisted`
      const headers = { 'x-auth-token': token }
      const data = { ids: JSON.stringify(blocked) }
      try {
        const res = await axios.post(url, data, { headers })
        if (res.data.ok && Array.isArray(res.data.list)) {
          commit('syncBlacklist', res.data.list)
        } else {
          console.error('err syncBlacklist in frontend/user.js ===> res.data.list is not an array')
        }
      } catch (err) {
        console.error('err syncBlacklist in frontend/user.js ===> ', err)
      }
    },
    syncHistory: async ({ commit }) => {
      try {
        let visitor = []
        let visited = []
        const merge = cur => ({
          id: cur[cur.visitor_id ? 'visitor_id' : 'visited_id'],
          visit_date: cur.visit_date,
          username: cur.username,
          profile_image: cur.profile_image
        })
        const res = await utility.sync('browse/history')
        if (Array.isArray(res.body)) {
          visitor = res.body.filter(cur => cur.visitor_id).map(merge)
          visited = res.body.filter(cur => cur.visited_id).map(merge)
        }
        commit('syncHistory', { visitor, visited })
      } catch (err) {
        console.log('Got error here --> ', err)
      }
    },
  }
}
