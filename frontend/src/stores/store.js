import { createStore } from 'vuex'
import { auth } from './auth'
import { user } from './user'
import { chat } from './chat'
import { socket } from './socket'
import { getters } from './getter'
import { allTags } from './allTags'
import { connectedUsers } from './connectedUsers'
import { avatars } from './avatars'
import persist from './plugins/persist'

export const store = createStore({
  plugins: [persist],
  state: {
    allTags: allTags.state,
    connectedUsers: connectedUsers.state,
    user: user.state,
    auth: auth.state,
    chat: chat.state,
    socket: socket.state,
    tags: [],
    notif: [],
    convos: [],
    online: [],
    blocked: [],
    visitor: [],
    visited: [],
    following: [],
    followers: [],
    blockedBy: [],
    blacklist: [],
    typingSec: {
      status: false,
      convos: []
    },
    seenConvo: false,
    newMessage: null,
    isConnected: false,
    selectedConvo: null,
    location: { lat: 0, lng: 0 },
    avatars: avatars.state()
  },
  getters,
  actions: {
    ...auth.actions,
    ...user.actions,
    ...chat.actions,
    ...allTags.actions,
    ...socket.actions,
    ...connectedUsers.actions,
    ...avatars.actions,
  },
  mutations: {
    ...auth.mutations,
    ...user.mutations,
    ...chat.mutations,
    ...socket.mutations,
    ...allTags.mutations,
    ...connectedUsers.mutations,
    ...avatars.mutations,
  }
})