// Icon and message helpers for block/report distinction

// URL d'API centralisée avec fallback pour la prod (évite undefined)
export const API_URL = import.meta.env.VITE_APP_API_URL || 'https://matcha-backend-t6dr.onrender.com';
export const BASE_URL = (typeof import.meta.env.BASE_URL === 'string' && import.meta.env.BASE_URL.length > 0)
  ? import.meta.env.BASE_URL
  : '/';
import blockIcon from '@/assets/Block/block.png'
import reportIcon from '@/assets/Block/report.png'
export function getBlockReportIcon(type) {
  // Returns [iconSet, iconName, colorClass]
  switch (type) {
    case 'block':
      return ['mdi', 'mdi-block-helper', 'text-warning'];
    case 'report':
      return ['mdi', 'mdi-alert-circle', 'text-red'];
    default:
      return ['mdi', 'mdi-help-circle', 'text-grey'];
  }
}

export function getBlockReportMessage(type, firstName, lastName) {
  if (firstName === null) firstName = 'Anonymous';
  if (lastName === null) lastName = 'User';
  switch (type) {
    case 'block':
      return `You blocked ${firstName} ${lastName}`;
    case 'report':
      return `You reported ${firstName} ${lastName}`;
    default:
      return `${firstName} ${lastName}`;
  }
}
// Utilitaire global pour l'affichage d'image (gère 'false', base64 et URLs)
// Memoization to avoid repeatedly validating large base64 payloads during re-renders
const __imageSrcMemoStr = new Map(); // key: `${default}|${value}` -> resolved src
const __imageSrcMemoObj = new WeakMap(); // key: object -> Map(default -> resolved)
function __getMemoForObj(obj, def) {
  let m = __imageSrcMemoObj.get(obj)
  if (!m) {
    m = new Map()
    __imageSrcMemoObj.set(obj, m)
  }
  return m.get(def)
}
function __setMemoForObj(obj, def, val) {
  let m = __imageSrcMemoObj.get(obj)
  if (!m) {
    m = new Map()
    __imageSrcMemoObj.set(obj, m)
  }
  m.set(def, val)
}

export function getImageSrc(image, defaultImage = 'assets/default/defaut_profile.txt') {
  try {
    // Quick memoization for strings (including data URIs and base64) to cut regex/split cost
    if (typeof image === 'string') {
      const key = `${defaultImage}|${image}`
      if (__imageSrcMemoStr.has(key)) {
        return __imageSrcMemoStr.get(key)
      }
      // Si la chaîne commence par /9j/ (base64 JPEG), forcer le retour JPEG et NE PAS utiliser le fallback
      if (image.trim().startsWith('/9j/')) {
        const jpegData = `data:image/jpeg;base64,${image.trim()}`
        __imageSrcMemoStr.set(key, jpegData)
        return jpegData
      }
      // Protection: if the string starts with '/' and looks like base64, it's a bug, return defaultImage
      if (/^\/[A-Za-z0-9+/=]+$/.test(image.trim())) {
        return defaultImage
      }
      const resolved = __resolveImageInternal(image, defaultImage)
      // Si le resolved est le fallback mais l'image d'origine commence par /9j/, on préfère le JPEG
      if (
        resolved === defaultImage &&
        typeof image === 'string' &&
        image.trim().startsWith('/9j/')
      ) {
        const jpegData = `data:image/jpeg;base64,${image.trim()}`
        __imageSrcMemoStr.set(key, jpegData)
        return jpegData
      }
      // Prevent unbounded growth
      if (__imageSrcMemoStr.size > 1000) __imageSrcMemoStr.clear()
      __imageSrcMemoStr.set(key, resolved)
      return resolved
    }
    // WeakMap memoization for object refs
    if (image && typeof image === 'object') {
      const cached = __getMemoForObj(image, defaultImage)
      if (cached) return cached
      const resolved = __resolveImageInternal(image, defaultImage)
      __setMemoForObj(image, defaultImage, resolved)
      return resolved
    }
    // Fallback to resolver for other types (null/undefined handled inside)
    const resolved = __resolveImageInternal(image, defaultImage)
    return resolved
  } catch (_) {
    return defaultImage
  }
}

// Internal resolver (original logic), kept separate to allow memoization above
function __resolveImageInternal(image, defaultImage = 'assets/default/defaut_profile.txt') {
  if (!image) return defaultImage;

  // Si c'est une chaîne directe
  if (typeof image === 'string') {
    const s = image.trim();
    if (!s || s === 'false') return defaultImage;
    // Protection: if the string starts with '/' and looks like base64, it's a bug, return defaultImage
    if (/^\/[A-Za-z0-9+/=]+$/.test(s)) {
      return defaultImage;
    }
    if (s.startsWith('data:image')) {
      // Validate data URI doesn't contain HTML or invalid base64 payload
      const parts = s.split(',')
      const payload = parts.length > 1 ? parts.slice(1).join(',') : ''
      // Allow standard and URL-safe base64 (include - and _), tolerate whitespace
      const base64Pattern = /^[A-Za-z0-9+/=_-\s]+$/
      if (!payload || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || !base64Pattern.test(payload)) {
        return defaultImage
      }
      return s
    }
    // Plain base64 provided comme string (no data: prefix)
    // Accept URL-safe base64 and whitespace, then normalize by stripping whitespace
    if (/^([A-Za-z0-9+/=]+)$/.test(s)) {
      if (s.startsWith("/9j/")) return `data:image/jpeg;base64,${s}`;
      if (s.startsWith("iVBOR")) return `data:image/png;base64,${s}`;
      // Si la chaîne est longue (typiquement >100) et ne commence pas par /9j/ ou iVBOR, on tente jpeg par défaut
      if (s.length > 100) return `data:image/jpeg;base64,${s}`;
      // Sinon, ne rien préfixer
      return defaultImage;
    }
    // If it looks like a path but doesn't start with http(s) or data:, treat as invalid if it looks like base64
    if (s.startsWith('/') && /^[A-Za-z0-9+/=]+$/.test(s.slice(1))) {
      return defaultImage;
    }
  if (isExternal(s)) return s;
  return getFullPath(s);
  }

  // Si c'est un objet, appliquer d'abord la convention DB:
  // - link === false  => l'image est dans data (base64)
  // - data === false  => l'image est dans link (URL)
  if (image && typeof image === 'object') {
    const isFalse = (v) => v === false || v === 'false' || v === 0
    const useData = isFalse(image.link) && typeof image.data === 'string' && image.data.trim()
    if (useData) {
      const val = image.data.trim()
      if (val.startsWith('data:image')) {
        const parts = val.split(',')
        const payload = parts.length > 1 ? parts.slice(1).join(',') : ''
        const base64Pattern = /^[A-Za-z0-9+/=_-\s]+$/
        if (!payload || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || !base64Pattern.test(payload)) {
          return defaultImage
        }
        return val
      }
      if (/^[A-Za-z0-9+/=_-\s]+$/.test(val)) {
        const compact = val.replace(/\s+/g, '')
        if (compact.startsWith('/9j/')) return `data:image/jpeg;base64,${compact}`
        if (compact.startsWith('iVBOR')) return `data:image/png;base64,${compact}`
        if (compact.length > 100) return `data:image/jpeg;base64,${compact}`
        // Ne rien préfixer sinon
        return defaultImage;
      }
      // fallback: treat as path or URL
      return isExternal(val) ? val : getFullPath(val)
    }

    const useLink = isFalse(image.data) && typeof image.link === 'string' && image.link.trim()
    if (useLink) {
      const val = image.link.trim()
      if (isExternal(val)) return val
      return getFullPath(val)
    }
  }

  // Champ image prioritaire si présent
  if (typeof image.image === 'string') {
    const val = image.image.trim();
    if (val && val !== 'false') {
      if (val.startsWith('data:image')) return val;
      if (isExternal(val)) return val;
      return getFullPath(val);
    }
  }

  // Lien explicite
  if (typeof image.link === 'string') {
    const val = image.link.trim();
    if (val && val !== 'false') {
      if (isExternal(val)) return val;
      return getFullPath(val);
    }
  }

  // Données base64 ou data URI
  if (typeof image.data === 'string') {
    const val = image.data.trim();
    if (val && val !== 'false') {
      if (val.startsWith('data:image')) {
        // validate payload
        const parts = val.split(',')
        const payload = parts.length > 1 ? parts.slice(1).join(',') : ''
        const base64Pattern = /^[A-Za-z0-9+/=_-\s]+$/
        if (!payload || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || !base64Pattern.test(payload)) {
          return defaultImage
        }
        return val
      }
      if (/^[A-Za-z0-9+/=_-\s]+$/.test(val)) {
        const compact = val.replace(/\s+/g, '')
        if (compact.startsWith('/9j/')) return `data:image/jpeg;base64,${compact}`
        if (compact.startsWith('iVBOR')) return `data:image/png;base64,${compact}`
        // Ne rien préfixer par défaut, laisser tomber si inconnu
        return defaultImage;
      }
    }
  }

  // Ancien champ name
  if (typeof image.name === 'string') {
    const val = image.name.trim();
    if (val && val !== 'false') return getFullPath(val);
  }

  return defaultImage;
}

import axios from 'axios'
import moment from 'moment'

// --- Default .txt image helpers -------------------------------------------------
// Cache for default txt images converted to data URIs
const __defaultTxtCache = {
  profile: null,
  cover: null
}

function detectMimeFromBase64 (b64) {
  // Heuristics based on common base64 prefixes
  if (!b64 || typeof b64 !== 'string') return 'image/png'
  const s = b64.trim()
  if (s.startsWith('data:image/')) {
    // Already a data URI
    const m = s.slice(5, s.indexOf(';')) // image/png
    return m || 'image/png'
  }
  if (s.startsWith('/9j/')) return 'image/jpeg' // JPEG
  if (s.startsWith('iVBORw0KGgo')) return 'image/png' // PNG
  if (s.startsWith('R0lGOD')) return 'image/gif' // GIF
  if (s.startsWith('PHN2Zy')) return 'image/svg+xml' // SVG
  return 'image/png'
}

export function getCachedDefault (kind = 'profile') {
  const key = kind === 'cover' ? 'default_cover_data_uri' : 'default_profile_data_uri'
  if (__defaultTxtCache[kind]) return __defaultTxtCache[kind]
  let val = null
  try { val = localStorage.getItem(key) } catch (_) { val = null }
  if (val && typeof val === 'string') {
    const s = val.trim()
    // Si la valeur du cache est un base64 JPEG pur, retourne un data URI JPEG
    if (s.startsWith('/9j/')) {
      const jpegData = `data:image/jpeg;base64,${s}`
      __defaultTxtCache[kind] = jpegData
      return jpegData
    }
    if (s.startsWith('data:image')) {
      const parts = s.split(',')
      const payload = parts.length > 1 ? parts.slice(1).join(',') : ''
      const base64Pattern = /^[A-Za-z0-9+/=_-\s]+$/
      if (!payload || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || !base64Pattern.test(payload)) {
        // Bad cache, purge it
        try { localStorage.removeItem(key) } catch (_) {}
        return null
      }
      __defaultTxtCache[kind] = s
      return s
    } else if (s.includes('<!DOCTYPE') || s.includes('<html')) {
      try { localStorage.removeItem(key) } catch (_) {}
      return null
    }
    __defaultTxtCache[kind] = s
    return s
  }
  return null
}

export async function getDefaultTxtImage (relativeTxtPath, kind = 'profile') {
  const fallbackBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wwAAn8B9Qp0GfoAAAAASUVORK5CYII=';
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  try {
    // If already cached, return
    const existing = getCachedDefault(kind)
    if (existing) return existing

  const base = BASE_URL;
    const url = relativeTxtPath.startsWith('http')
      ? relativeTxtPath
      : `${base}${relativeTxtPath.replace(/^\//, '')}`

    const res = await axios.get(url, { responseType: 'text' })
    let content = (res && res.data) ? String(res.data).trim() : ''
    // Defensive: If content looks like HTML, is empty, or not base64, fallback
    if (!content || content.startsWith('<!DOCTYPE html') || content.startsWith('<html') || !base64Pattern.test(content)) {
      content = fallbackBase64;
    }

    let dataUri = content;
    // Si déjà un data URI, ne rien ajouter
    if (!/^data:image\//.test(content)) {
      dataUri = `data:image/png;base64,${content}`;
    }

    const key = kind === 'cover' ? 'default_cover_data_uri' : 'default_profile_data_uri'
    __defaultTxtCache[kind] = dataUri
    try { localStorage.setItem(key, dataUri) } catch (_) {}
    return dataUri
  } catch (err) {
    console.error('err getDefaultTxtImage in utility.js ===> ', err)
    // Always fallback to valid PNG, sans double préfixe
    return `data:image/png;base64,${fallbackBase64}`;
  }
}

export async function warmDefaultTxtImages () {
  // Pass relative paths; getDefaultTxtImage will prepend BASE_URL correctly
  const profilePath = `assets/default/defaut_profile.txt`;
  const coverPath = `assets/default/defaut_couverture.txt`;
  // Fire and forget; cache results for sync access in getters/components
  try { await getDefaultTxtImage(profilePath, 'profile') } catch (_) {}
  try { await getDefaultTxtImage(coverPath, 'cover') } catch (_) {}
}

// Stricter external URL check (only schemes/protocols at start or protocol-relative)
export const isExternal = url => {
  if (!url || typeof url !== 'string') return false
  const s = url.trim()
  if (/^data:image\//i.test(s)) return true
  if (/^(https?:)?\/\//i.test(s)) return true
  if (/^(blob:|data:)/i.test(s)) return true
  if (/^www\./i.test(s)) return true
  return false
}
export const isBlocked = (state, id) => {
  const b = Array.isArray(state?.blocked) ? state.blocked : []
  const bb = Array.isArray(state?.blockedBy) ? state.blockedBy : []
  return b.includes(id) || bb.includes(id)
}

// Nom complet vers le fichier uploads côté backend
export function getFullPath(file) {
  const base = BASE_URL;
  const fallback = `${base}assets/default/defaut_profile.txt`
  if (!file || file === 'false') return fallback
  if (typeof file !== 'string') return fallback
  const s = file.trim()
  // If it's a data URI, validate payload to avoid HTML-in-data
  if (s.startsWith('data:image')) {
    const parts = s.split(',')
    const payload = parts.length > 1 ? parts.slice(1).join(',') : ''
    const base64Pattern = /^[A-Za-z0-9+/=_-\s]+$/
    if (!payload || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || !base64Pattern.test(payload)) {
      return fallback
    }
    return s
  }
  // If it's an external URL or protocol-relative, return as-is
  if (isExternal(s)) return s
  // For any value containing obvious HTML markers, fallback
  if (s.includes('<!DOCTYPE') || s.includes('<html')) return fallback
  // Otherwise, treat as backend upload filename
  return `${API_URL}/uploads/${s}`
}

const getDate = item => {
  if (!item) return new Date()
  switch (item.type) {
    case 'visitor':
      return item.visit_date
    case 'visited':
      return item.visit_date
    case 'follower':
      return item.match_date
    case 'following':
      return item.match_date
    default:
      return item
  }
} 
const getId = tab => {
  switch (tab) {
    case 'notif':
      return 'id_from'
    case 'convos':
      return 'user_id'
    default:
      return 'id'
  }
}
const getLocationFromIp = async f => {
  try {
    const url = 'https://ipinfo.io?token=3443e12245bdcf'
    const res = await axios.get(url)
    if (!res.error && res.data && res.data.loc) {
      const splitted = res.data.loc.split(',')
      f({ lat: Number(splitted[0]), lng: Number(splitted[1]) })
    } else {
      f({ lat: 0, lng: 0 }) // fallback
    }
  } catch (error) {
    console.error('err getLocationFromIp in frontend/utility.js ===> ', error)
    f({ lat: 0, lng: 0 }) // fallback
  }
}

const syncLocation = async location => {
  try {
    const token = localStorage.getItem('token')
  const url = `${API_URL}/api/users/location`
    const headers = { 'x-auth-token': token }
    await axios.post(url, location, { headers })
  } catch (error) {
    console.error('err syncLocation in frontend/utility.js ===> ', error)
    return false;
  }
}

const updateOneNotif = async (id_from, id_to) => {
  try {
    const token = localStorage.getItem('token');
  const url = `${API_URL}/api/notif/updateOneNotif`;
    const headers = { 'x-auth-token': token };
    const response = await axios.put(url, { id_from, id_to }, { headers });
      if (response.status === 200) {
        return true;
      } else {
      console.error('Failed to mark the notification as seen.');
      return false;
    }
  } catch (error) {
    console.error('Error in seenOneNotif:', error);
    return false;
  }
}

const getAllTags = async () => {
  try {
  const url = `${API_URL}/allTags`
    const response = await axios.get(url, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    return response.data
  } catch (error) {
    console.error('err getAllTags in frontend/utility.js ===> ', error)
    return [];
  }
}

const getConnectedUsers = async () => {
  const url = `${API_URL}/connectedUsers`
  const headers = { 'X-Requested-With': 'XMLHttpRequest' }
  try {
    const response = await axios.get(url, { headers });
    return response.data
  } catch (error) {
    console.error('err getConnectedUsers in frontend/utility.js ===> ', error)
    return [];
  }
}

// Lightweight availability probe for backend (Render cold start friendly)
// Returns true if server responds (any 2xx) to a public endpoint
async function pingServer(timeoutMs = 4000) {
  const source = axios.CancelToken.source()
  const timeout = setTimeout(() => source.cancel('ping timeout'), timeoutMs)
  try {
  const url = `${API_URL}/connectedUsers`
    const headers = { 'X-Requested-With': 'XMLHttpRequest' }
    const res = await axios.get(url, { headers, cancelToken: source.token })
    return !!res && (res.status >= 200 && res.status < 300)
  } catch (e) {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

import match from '@/assets/match/match-ok.png'
import confirm from '@/assets/match/match-to-confirm.png'
import receive from '@/assets/match/receive-match.png'
import dislike from '@/assets/match/dislike.png'
import defaultIcon from '@/assets/match/heart-default.png'
import chatAvailable from '@/assets/chat/chat.png'
import chatUnavailable from '@/assets/chat/chatUnavailable.png'

// Derive relation state strictly from DB-backed arrays (no notifications)
// Inputs: followers, following, convos (allowed)
// Returns one of: default | you_like | he_like | you_like_back
export function deriveRelationState({ selfId, targetId, followers = [], following = [], convos = [], flags = {} }) {
  try {
    if (!selfId || !targetId) return 'default'
    const other = String(targetId)
    // Persisted unlike takes precedence for UI (both sides show dislike)
    const unlikeMap = flags && flags.unlike ? flags.unlike : {}
    const unlikeDir = unlikeMap && unlikeMap[other]
    if (unlikeDir === 'you_unlike' || unlikeDir === 'he_unlike') return unlikeDir
    const hasYouLike = Array.isArray(following) && following.some((it) => String(it.id) === other)
    const hasHeLike = Array.isArray(followers) && followers.some((it) => String(it.id) === other)
    const convAllowed = Array.isArray(convos) && convos.some((c) => String(c.user_id) === other && (c.allowed === true || c.allowed === 1))

    // Mutual like or allowed conversation → like_back state (chat enabled)
    if (convAllowed || (hasYouLike && hasHeLike)) return 'you_like_back'
    if (hasYouLike) return 'you_like'
    if (hasHeLike) return 'he_like'
    return 'default'
  } catch (_) {
    return 'default'
  }
}

// Upload helpers alignés avec le backend (champ 'image' et token dans header)
export async function uploadProfileImage(file) {
  try {
    const token = localStorage.getItem('token')
  const url = `${API_URL}/api/users/image/profile`
    const formData = new FormData()
    formData.append('image', file)
    const headers = { 'x-auth-token': token }
    const res = await axios.post(url, formData, { headers })
    return res.data
  } catch (err) {
    console.error('err uploadProfileImage in utility.js ===> ', err)
    return { msg: 'Oops... error uploading profile image!' }
  }
}

export async function uploadGalleryImage(file) {
  try {
    const token = localStorage.getItem('token')
  const url = `${API_URL}/api/users/image`
    const formData = new FormData()
    formData.append('image', file)
    const headers = { 'x-auth-token': token }
    const res = await axios.post(url, formData, { headers })
    return res.data
  } catch (err) {
    console.error('err uploadGalleryImage in utility.js ===> ', err)
    return { msg: 'Oops... error uploading gallery image!' }
  }
}

export async function deleteUserImage(imageId, isProfile = false) {
  try {
    const token = localStorage.getItem('token')
  const url = `${API_URL}/api/users/image/del`
    const body = { id: imageId, profile: isProfile }
    const headers = { 'x-auth-token': token }
    const res = await axios.post(url, body, { headers })
    return res.data
  } catch (err) {
    console.error('err deleteUserImage in utility.js ===> ', err)
    return { msg: 'Oops... error deleting image!' }
  }
}

export default {
  getImageSrc,
  getDate,
  isBlocked,
  updateOneNotif,
  getAllTags,
  getConnectedUsers,
  pingServer,
  pingServer,
  syncLocation,
  getLocationFromIp,
  getDefaultTxtImage,
  warmDefaultTxtImages,
  getCachedDefault,
  deriveRelationState,
  // eslint-disable-next-line
  getFullPath,
  // consoleLog: ('utility.js getFullPath => ', getFullPath),
  formatTime (date) {
    const when = moment(getDate(date))
    const now = moment()
    let fmt = 'M/DD/YY, h:mm A'
    if (now.diff(when, 'weeks', true) < 1) {
      fmt = 'ddd h:mm A'
    } else if (now.diff(when, 'years', true) < 1) {
      fmt = 'MMMM D, YYYY, h:mm A'
    }
    return when.format(fmt)
  },
  // Appel générique (legacy) pour les autres routes, mais allhistory a sa propre fonction moderne
  sync: async type => {
    try {
      const token = localStorage.getItem('token')
      const url = `${API_URL}/api/${type}`
      const headers = { 'x-auth-token': token }
      const res = await axios.get(url, { headers })
      return res.data && res.data.msg ? [] : (res.data || []);
    } catch (error) {
      console.error('err sync in frontend/utility.js ===> ', error)
      return [];
    }
  },

  // Nouvelle fonction pour /api/browse/allhistory avec pagination et structure moderne
  syncAllHistory: async (params = {}) => {
    try {
      const token = localStorage.getItem('token')
      const base = `${API_URL}/api/browse/allhistory`
      const qp = new URLSearchParams()
      const { limit, page } = params || {}
      if (Number.isFinite(limit)) qp.set('limit', String(limit))
      if (Number.isFinite(page)) qp.set('page', String(page))
      const url = qp.toString() ? `${base}?${qp.toString()}` : base
      const headers = { 'x-auth-token': token }
      const result = await axios.get(url, { headers })
      const payload = result && result.data ? result.data : null
      if (!payload) return []
      // Structure backend: { history: [...] }
      if (Array.isArray(payload.history)) return payload.history
      // Legacy: { data: { items: [...] } }
      if (payload.data && Array.isArray(payload.data.items)) return payload.data.items
      // Fallbacks legacy
      if (Array.isArray(payload)) return payload
      if (payload.data && Array.isArray(payload.data)) return payload.data
      return []
    } catch (error) {
      console.error('err syncAllHistory in frontend/utility.js ===> ', error)
      return []
    }
  },
  syncNotif: async (params = {}) => {
    try {
      const token = localStorage.getItem('token')
      const base = `${API_URL}/api/notif/all`
      const qp = new URLSearchParams()
      // Accept optional params; keep legacy behaviour if none provided
      const { limit, page, type, includeBlocked } = params || {}
      if (Number.isFinite(limit)) qp.set('limit', String(limit))
      if (Number.isFinite(page)) qp.set('page', String(page))
      if (typeof type === 'string' && type) qp.set('type', type)
      if (includeBlocked !== undefined && includeBlocked !== null) qp.set('includeBlocked', String(includeBlocked))
      const url = qp.toString() ? `${base}?${qp.toString()}` : base
      const headers = { 'x-auth-token': token }
      const result = await axios.get(url, { headers })
      const payload = result && result.data ? result.data : null
      // Uncomment for debug:
      // console.log('syncNotif debug', { url, payload })
      // Always return an array, even if empty or malformed
      if (!payload) return []
      if (payload.msg) return []
      // New shape: { status, type, message, data: { items, page, limit } }
      if (payload.data && Array.isArray(payload.data.items)) return payload.data.items
      // Sometimes backend used to return array directly
      if (Array.isArray(payload)) return payload
      // Or nested array
      if (payload.data && Array.isArray(payload.data)) return payload.data
      // If data is an object with items (but not array), fallback to []
      if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return []
      // If payload is an object but not recognized, fallback to []
      if (typeof payload === 'object') return []
      return []
    } catch (error) {
      console.error('err syncNotif in frontend/utility.js ===> ', error)
      return []
    }
  },
  // Lightweight debug helper to inspect auth + counts
  calculateDistance: (from, to, mile) => {
    if (!from || !to) return 10
    const radianConversion = Math.PI / 180
    const earthRadius = 6371
    const fromLat = from.lat * radianConversion
    const fromLng = from.lng * radianConversion
    const toLat = to.lat * radianConversion
    const toLng = to.lng * radianConversion
    const dLat = toLat - fromLat
    const dLng = toLng - fromLng
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(fromLat) * Math.cos(toLat) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    let distance = earthRadius * c
    if (mile) {
      distance *= 0.621371
    }
    return distance
  },
  updateLocation: () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => syncLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }), () => getLocationFromIp(res => syncLocation({
        lat: Number(res.lat),
        lng: Number(res.lng)
      })))
    } else {
      getLocationFromIp(res => syncLocation({
        lat: Number(res.lat),
        lng: Number(res.lng)
      }))
    }
  },

  getHistoryAction (type, first_name, last_name) {

    if (first_name === null) {
      first_name = 'Anonymous';
    }

    if (last_name === null) {
      last_name = 'User';
    }
  
    switch (type) {
      case 'visit':
      case 'visited':
      case 'you_visit':
        return `You visited the profile of ${first_name} ${last_name}`
      case 'visitor':
      case 'he_visit':
        return `${first_name} ${last_name} visited your profile`
      case 'like':
      case 'following':
      case 'you_like':
        return `You liked ${first_name} ${last_name}`
      case 'follower':
      case 'he_like':
        return `${first_name} ${last_name} liked you`
      case 'like_back':
      case 'you_like_back':
        return `You accepted the like of ${first_name} ${last_name}`
      case 'he_like_back':
        return `${first_name} ${last_name} accepted your like`
      case 'unlike':
      case 'you_unlike':
        return `You unliked ${first_name} ${last_name}`
      case 'he_unlike':
        return `${first_name} ${last_name} unliked you`
      case 'block':
      case 'you_block':
        return `You blocked ${first_name} ${last_name}`
      case 'you_unblock':
        return `You unblocked ${first_name} ${last_name}`
      case 'he_block':
        return `${first_name} ${last_name} blocked you`
      case 'report':
      case 'you_report':
        return `You reported ${first_name} ${last_name}`
      case 'you_unreport':
        return `You unreported ${first_name} ${last_name}`
      case 'he_report':
        return `${first_name} ${last_name} reported you`
      case 'talk':
        return `You talked to ${first_name} ${last_name}`
      case 'avatar_img':
        return 'You changed your avatar'
      case 'cover_img':
        return 'You changed your cover'
      default:
        return `${first_name} ${last_name}`
    }
  },
  getNotifMsg (notif) {
    switch (notif.type) {
      case 'visit':
        return ' checked your profile'
      case 'like':
        return ' liked you'
      case 'like_back':
        return ' liked you back'
      case 'unlike':
        return ' unliked you'
    }
  },
  fromNow (date) {
    return moment.utc(date).fromNow()
  },

  getNotifIcon (type) {
    switch (type) {
      case 'visit':
      case 'you_visit':
      case 'he_visit':
        return ['mdi', 'mdi-eye', 'text-blue']
      case 'like':
      case 'you_like':
      case 'he_like':
        return ['mdi', 'mdi-heart-pulse', 'text-green']
      case 'like_back':
      case 'you_like_back':
      case 'he_like_back':
        return ['mdi', 'mdi-heart', 'text-red']
      case 'unlike':
      case 'you_unlike':
      case 'he_unlike':
        return ['mdi', 'mdi-heart-broken', 'text-black']
      case 'block':
      case 'you_block':
      case 'he_block':
        return ['img', blockIcon]
      case 'report':
        return ['img', reportIcon]
      case 'talk':
        return ['mdi', 'mdi-wechat', 'text-grey']
      case 'avatar_img':
        return ['mdi', 'mdi-account', 'text-blue']
      case 'cover_img':
        return ['mdi', 'mdi-image', 'text-green']
    }
  },
  getLikeValue (type) {
    switch(type) {
      case 'you_like_back':
        return true
      case 'he_like_back':
        return true
      case 'you_like':
        return true
      case 'he_like':
        return true
      case 'you_unlike':
        return false
      case 'he_unlike':
        return false
      case null:
      default:
        return 'default'
    }
  },

  // Like icon mapping (single source of truth)
  // default       -> heart-default.png
  // he_like       -> receive-match.png
  // you_like      -> match-to-confirm.png
  // *_like_back   -> match-ok.png
  // *_unlike      -> dislike.png
  getLikeIcon(liked) {
    switch (liked) {
      case 'he_like':
        return `${receive}`
      case 'you_like':
        return `${confirm}`
      case 'he_like_back':
        return `${match}`
      case 'you_like_back':
        return `${match}`
      case 'he_unlike':
        return `${dislike}`
      case 'you_unlike':
        return `${dislike}`
      case 'default':
      case null:
      default:
        return `${defaultIcon}`
    }
  },

  // Chat icon mapping aligned to spec
  // chat available on mutual like (he_like_back or you_like_back), otherwise unavailable
  getChatIcon(type) {
    switch (type) {
      case 'he_like_back':
        return `${chatAvailable}`
      case 'you_like_back':
        return `${chatAvailable}`
      case 'default':
        return `${chatUnavailable}`
      case 'he_like':
        return `${chatUnavailable}`
      case 'you_like':
        return `${chatUnavailable}`
      case 'he_unlike':
        return `${chatUnavailable}`
      case 'you_unlike':
        return `${chatUnavailable}`
      default:
        return `${chatUnavailable}`
    }
  },

  filterBlocked: (state, type) => {
    if (!Array.isArray(state[type])) return [];
    return state[type].filter(cur => !isBlocked(state, cur[getId(type)]))
  },
  showAlert (color, text) {
    // keep console clean in production
    return {
      state: true,
      color: color,
      text: text
    }
  },

  passMatch: (p1, p2) => !p1.length || p2 === p1 ? '' : 'Passwords must match'
  ,uploadProfileImage
  ,uploadGalleryImage
  ,deleteUserImage
}

// --- Small avatar thumbnail generator ----------------------------------------
// Create smaller thumbnails for large data URIs to speed up decoding/rendering
const __thumbCache = new Map(); // key: `${size}|${src}` -> data URL
export async function makeSmallAvatar (src, size = 48) {
  try {
    if (!src || typeof src !== 'string') return src
    if (!/^data:image\//i.test(src)) return src
    // If payload is already small, don't waste CPU to re-encode
    if (src.length < 80000) return src // ~60KB base64 payload threshold
    const key = `${size}|${src}`
    if (__thumbCache.has(key)) return __thumbCache.get(key)

    // Create image
    const img = new Image()
    img.decoding = 'async'
    const loaded = new Promise((resolve, reject) => {
      img.onload = () => resolve(true)
      img.onerror = reject
    })
    img.src = src
    await loaded
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    if (!w || !h) { __thumbCache.set(key, src); return src }
    const scale = size / Math.max(w, h)
    const newW = Math.max(1, Math.round(w * scale))
    const newH = Math.max(1, Math.round(h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = newW
    canvas.height = newH
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    ctx.drawImage(img, 0, 0, newW, newH)
    // Use JPEG for better compression; adjust quality as needed
    const out = canvas.toDataURL('image/jpeg', 0.82)
    if (__thumbCache.size > 300) __thumbCache.clear()
    __thumbCache.set(key, out)
    return out
  } catch (_) {
    return src
  }
}