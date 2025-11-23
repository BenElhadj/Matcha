import { api } from '../boot/axios'

export const auth = {
  state () {
    return {
      user: {},
      status: {},
      isConnected: false,
      typing: false,
      blocked: [],
      location: {},
      seenConvo: false,
      convos: [],
      notif: [],
      blockedBy: [],
      followers: [],
      following: [],
      newMessage: null,
      selectedConvo: null,
      visited: [],
      visitor: [],
      imageConvo: null
    }
  },
  mutations: {
    login (state, user) {
      state.status = true;
      state.user = user;
      if (!state.isConnected) {
        state.isConnected = true;
      }
    },
    logout(state) {
      state.status = false;
      state.user = {};
      state.isConnected = false;
      state.typing = false;
      state.blocked = [];
      state.location = {};
      state.seenConvo = false;
      state.convos = [];
      state.notif = [];
      state.blockedBy = [];
      state.followers = [];
      state.following = [];
      state.newMessage = null;
      state.selectedConvo = null;
      state.visited = [];
      state.visitor = [];
      state.imageConvo = null;
    }
  },
  actions: {
    async login({ commit, dispatch }, user) {
      try {
        if (user.id) {
          localStorage.setItem('token', user.token)
          const { lat, lng } = user
          commit('locate', { lat, lng })
          // 1) Switch UI to connected state immediately
          commit('login', user)

          // 2) Kick off critical hydration first (non-blocking but started ASAP)
          // Conversations and notifications populate menus/Messenger quickly
          ;(async () => {
            try {
              // Fire without awaiting to avoid blocking UI thread
              dispatch('syncConvoAll')
              dispatch('getNotifPage', { limit: 50, page: 1 })
            } catch (_) {}
          })()

          // 3) Kick off the rest of the hydration in the background
          Promise.all([
            dispatch('getTags'),
            dispatch('getAllTags'),
            dispatch('fetchUserImages'),
            dispatch('getConnectedUsers'),
            dispatch('syncHistory'),
            dispatch('syncMatches'),
            dispatch('syncBlocked', user.id)
          ]).catch((e) => {
            // Soft-fail; UI is already connected
            console.warn('Background hydration after login had errors:', e)
          })

          // 3) Return immediately so UI can render avatar/menus without waiting
          return true
        }
      } catch (error) {
        console.error('Login error:', error)
        return false
      }
    },
    
    logout({ commit }, id) {
      // Remove a deterministic set of localStorage keys on logout so nothing
      // related to the previous session remains and the UI cannot be revived
      // by a page refresh. Wrap each removal to avoid exceptions in restricted
      // environments (e.g., third-party cookies/storage disabled).
      const keysToRemove = [
        'token',
        'user',
        'user_images',
        'matcha_app_state_v1',
        'key',
        // utility cached defaults
        'default_cover_data_uri',
        'default_profile_data_uri',
        // history / tags / other persisted slices
        'user_history_all',
        'user_tags'
      ]
      for (const k of keysToRemove) {
        try {
          localStorage.removeItem(k)
        } catch (_) {}
      }

      // As an extra safety, attempt to clear any leftover app snapshot
      try {
        localStorage.removeItem('matcha_app_state_v1')
      } catch (_) {}

      commit('logout')
    }
  }
}