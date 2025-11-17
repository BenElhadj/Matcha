import utility from '@/utility'

export const getters = {
  // Return the actual logged-in user object (prefers auth.user, falls back to module/root user)
  user: (state) => state?.auth?.user || state?.user?.user || state.user,
  tags: (state) => state.tags?.filter((cur) => cur.length),
  notif: (state) => state.notif,
  typing: (state) => state.typing,
  online: (state) => state.online,
  // Consider multiple sources for connection status to avoid timing issues
  status: (state) => {
    if (state?.auth?.status === true) return true
    if (state?.isConnected === true) return true
    const hasUser = !!(state?.auth?.user?.id || state?.user?.user?.id || state?.user?.id)
    if (hasUser) return true
    return false
  },
  blocked: (state) => state.blocked,
  location: (state) => state.location,
  typingSec: (state) => state.typingSec,
  seenConvo: (state) => state.seenConvo,
  blockedBy: (state) => state.blockedBy,
  blacklist: (state) => state.blacklist,
  followers: (state) => state.followers,
  newMessage: (state) => state.newMessage,
  selectedConvo: (state) => state.selectedConvo,
  following: (state) => state.following,
  allTags: (state) => state.allTags,
  connectedUsers: (state) => state.connectedUsers,
  history: (state) => {
    return [
      ...state.visitor.map(cur => ({
        ...cur,
        type: 'visitor'
      })),
      ...state.visited.map(cur => ({
        ...cur,
        type: 'visited'
      })),
      ...state.followers.map(cur => ({
        ...cur,
        type: 'follower'
      })),
      ...state.following.map(cur => ({
        ...cur,
        type: 'following'
      }))
    ]
  },
  matches: (state) =>
    state.following.filter((cur) => {
      for (const follower of state.followers) {
        if (follower.id === cur.id) return true
      }
      return false
    }),
  profileImage: (state) => {
    const base = import.meta.env.BASE_URL || '/';
    const imageProfilTxt = `${base}assets/default/defaut_profile.txt`;
    // Try cached data URI for default first (avoids rendering plain .txt)
    const cachedDefault = utility.getCachedDefault ? utility.getCachedDefault('profile') : null
    const fallback = cachedDefault || imageProfilTxt
    if (!state.user.images) return fallback
    const image = state.user.images.find((cur) => cur.profile)
    if (!image) return fallback
    // Use centralized logic to resolve image sources safely
    return utility.getImageSrc(image, fallback)
  },
  coverPhoto: (state) => {
    const base = import.meta.env.BASE_URL || '/';
    const coverTxt = `${base}assets/default/defaut_couverture.txt`;
    const cachedDefault = utility.getCachedDefault ? utility.getCachedDefault('cover') : null
    const fallback = cachedDefault || coverTxt
    if (!state.user.images) return fallback
    const image = state.user.images.find((cur) => cur.cover)
    if (!image) return fallback
    // Use centralized logic to resolve image sources safely
    return utility.getImageSrc(image, fallback)
  },
  convos: (state) =>
    Array.isArray(state.convos)
      ? [...state.convos].sort((a, b) => new Date(b.last_update) - new Date(a.last_update))
      : [],
  imageConvo: (state) => {
    const convo = state.convos.find(
      (cur) => cur.id_conversation === state.selectedConvo
    )
    return convo ? convo.profile_image : null
  },
  usernameConvo: (state) => {
    const convo = state.convos.find(
      (cur) => cur.id_conversation === state.selectedConvo
    )
    return convo ? convo.username : null
  },
  idUserConvo: (state) => {
    const convo = state.convos.find(
      (cur) => cur.id_conversation === state.selectedConvo
    )
    return convo ? convo.user_id : null
  }

}  
