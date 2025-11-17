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
    const actions = [];
    // Visites faites PAR l'utilisateur (vues)
    if (Array.isArray(state.visited)) {
      actions.push(...state.visited.map(cur => ({ ...cur, type: 'you_visit' })));
    }
    // Likes faits PAR l'utilisateur
    if (Array.isArray(state.following)) {
      actions.push(...state.following.map(cur => ({ ...cur, type: 'you_like' })));
    }
    // Like back faits PAR l'utilisateur (présent dans following ET followers)
    if (Array.isArray(state.following) && Array.isArray(state.followers)) {
      const followerIds = new Set(state.followers.map(f => String(f.id)));
      actions.push(...state.following.filter(cur => followerIds.has(String(cur.id))).map(cur => ({ ...cur, type: 'you_like_back' })));
    }
    // Unlikes faits PAR l'utilisateur (via mapping unlike)
    if (state.user && state.user.relation && state.user.relation.unlike) {
      const unlikeMap = state.user.relation.unlike;
      if (Array.isArray(state.following)) {
        actions.push(...state.following.filter(cur => unlikeMap[String(cur.id)] === 'you_unlike').map(cur => ({ ...cur, type: 'you_unlike' })));
      }
    }
    // Blocks faits PAR l'utilisateur
    if (Array.isArray(state.blocked)) {
      actions.push(...state.blocked.map(cur => ({ ...cur, type: 'you_block' })));
    }
    // Unblocks faits PAR l'utilisateur (suppression d'un block)
    if (Array.isArray(state.user?.relation?.unblock)) {
      actions.push(...state.user.relation.unblock.map(cur => ({ ...cur, type: 'you_unblock' })));
    }
    // Reports faits PAR l'utilisateur (depuis blacklist/banned)
    if (Array.isArray(state.blacklist)) {
      actions.push(...state.blacklist.filter(cur => cur.type === 'report').map(cur => ({ ...cur, type: 'report' })));
    }
    // Unreports faits PAR l'utilisateur (suppression d'un report)
    if (Array.isArray(state.user?.relation?.unreport)) {
      actions.push(...state.user.relation.unreport.map(cur => ({ ...cur, type: 'you_unreport' })));
    }
    // On retire toutes les actions faites PAR les autres (visitor, follower, he_like, he_like_back, he_unlike, he_block, he_report, etc.)
    // (En pratique, on ne les ajoute jamais ici, donc rien à retirer)
    // Trie par date décroissante si possible (created_at, match_date, blocked_at, sinon 0)
    actions.sort((a, b) => {
      const da = new Date(a.created_at || a.match_date || a.blocked_at || 0);
      const db = new Date(b.created_at || b.match_date || b.blocked_at || 0);
      return db - da;
    });
    return actions;
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
