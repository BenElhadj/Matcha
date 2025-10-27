// Simple Vuex persistence plugin (no external deps)
// Persists selected keys to localStorage and restores them on app load

const STORAGE_KEY = 'matcha_app_state_v1'
const PERSIST_KEYS = [
  'user',
  'auth',
  'tags',
  'notif',
  'convos',
  'online',
  'blocked',
  'visitor',
  'visited',
  'following',
  'followers',
  'blockedBy',
  'blacklist',
  'typingSec',
  'seenConvo',
  'newMessage',
  'selectedConvo',
  'location',
  'allTags',
  'connectedUsers'
]

function safeParse(json) {
  try { return JSON.parse(json) } catch { return {} }
}

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]
  return out
}

export default function persistPlugin(store) {
  // 1) Hydrate from localStorage (shallow merge for whitelisted keys)
  if (typeof window !== 'undefined') {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY))
    if (saved && Object.keys(saved).length) {
      for (const k of PERSIST_KEYS) {
        if (saved[k] !== undefined) {
          store.state[k] = saved[k]
        }
      }
    }
  }

  // 2) Subscribe to all mutations and persist whitelisted state
  store.subscribe((mutation, state) => {
    try {
      const toSave = pick(state, PERSIST_KEYS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
      // Best effort; ignore quota or serialization errors
      // console.warn('[persist] could not save state', e)
    }
  })
}
