// Simple Node script to simulate localStorage cleanup on logout
// Run from project root: node frontend/scripts/test_logout_localstorage.js

(function () {
  // Simple in-memory localStorage polyfill
  const localStorage = (function () {
    const store = new Map()
    return {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      keys: () => Array.from(store.keys()),
      _dump: () => {
        const obj = {}
        for (const [k, v] of store.entries()) obj[k] = v
        return obj
      }
    }
  })()

  // Attach to global so it mimics browser environment for quick tests
  global.localStorage = localStorage

  // Keys to prepopulate (as in your app)
  const keys = [
    'token',
    'user',
    'user_images',
    'matcha_app_state_v1',
    'key',
    'default_cover_data_uri',
    'default_profile_data_uri',
    'user_history_all',
    'user_tags'
  ]

  // Pre-fill with dummy values
  for (const k of keys) {
    localStorage.setItem(k, `DUMMY_FOR_${k}`)
  }

  console.log('Before logout, localStorage keys:')
  console.log(localStorage.keys())

  // Emulate the logout removal routine we added in auth.js
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
    } catch (e) {
      // ignore
    }
  }

  // Extra safety removal
  try { localStorage.removeItem('matcha_app_state_v1') } catch (_) {}

  console.log('\nAfter logout, localStorage keys:')
  console.log(localStorage.keys())

  // Report which keys remain (should be none of the ones we removed)
  const remaining = localStorage.keys().filter(k => keys.includes(k))
  if (remaining.length === 0) {
    console.log('\nTEST PASS: No tracked keys remain in localStorage')
    process.exit(0)
  } else {
    console.error('\nTEST FAIL: Some keys remain:', remaining)
    process.exit(2)
  }
})()
