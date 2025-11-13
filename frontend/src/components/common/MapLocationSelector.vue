<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  apiKey: { type: String, required: true },
  zoom: { type: Number, default: 13 },
  mapId: { type: String, required: false, default: '' }
})

const emit = defineEmits(['location-updated'])
const mapContainer = ref(null)
let map = null
let marker = null
let lastLat = null
let lastLng = null
let internalUpdate = false

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
      resolve()
      return
    }
    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      // Si la clé ne correspond pas, on le remplace
      if (!existingScript.src.includes(apiKey)) {
        existingScript.remove()
      } else {
        existingScript.addEventListener('load', resolve)
        existingScript.addEventListener('error', (e) => {
          reject(e)
        })
        return
      }
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`
    script.async = true
    script.defer = true
    script.setAttribute('loading', 'async')
    script.onload = () => {
      // Attente active que window.google.maps soit bien défini
      const checkReady = () => {
        if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
          resolve()
        } else {
          setTimeout(checkReady, 50)
        }
      }
      checkReady()
    }
    script.onerror = (e) => {
      reject(e)
    }
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  await loadGoogleMapsScript(props.apiKey)
  if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function') {
    return
  }
  if (!props.mapId) {
    return
  }
  map = new window.google.maps.Map(mapContainer.value, {
    center: { lat: props.latitude, lng: props.longitude },
    zoom: props.zoom,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    mapId: props.mapId
  })
  // Importe la librairie marker et utilise AdvancedMarkerElement
  const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker')
  marker = new AdvancedMarkerElement({
    map,
    position: { lat: props.latitude, lng: props.longitude },
    title: 'Déplacer le marqueur',
    draggable: true
  })
  lastLat = props.latitude
  lastLng = props.longitude
  // Drag event (API AdvancedMarker)
  marker.addListener('dragend', (event) => {
    const lat = event.latLng.lat()
    const lng = event.latLng.lng()
    // N'émet que si la position a changé et que les valeurs sont valides
    if (
      typeof lat === 'number' && typeof lng === 'number' &&
      !Number.isNaN(lat) && !Number.isNaN(lng) &&
      (lat !== lastLat || lng !== lastLng)
    ) {
      lastLat = lat
      lastLng = lng
      internalUpdate = true
      emit('location-updated', { lat, lng })
      internalUpdate = false
    }
  })
  // Click sur la map pour déplacer le marker
  map.addListener('click', (event) => {
    const lat = event.latLng.lat()
    const lng = event.latLng.lng()
    if (
      typeof lat === 'number' && typeof lng === 'number' &&
      !Number.isNaN(lat) && !Number.isNaN(lng) &&
      (lat !== lastLat || lng !== lastLng)
    ) {
      marker.position = event.latLng
      lastLat = lat
      lastLng = lng
      internalUpdate = true
      emit('location-updated', { lat, lng })
      internalUpdate = false
    }
  })
})

onUnmounted(() => {
  // Nettoyage des listeners et objets Google Maps
  if (marker) {
    marker.map = null
    marker = null
  }
  if (map) {
    // Google Maps ne fournit pas de méthode explicite pour détruire la map, mais on peut nettoyer le container
    map = null
  }
  lastLat = null
  lastLng = null
})

watch(
  () => [props.latitude, props.longitude],
  ([lat, lng]) => {
    if (internalUpdate) {
      // Ne pas traiter les updates internes
      return
    }
    if (map && marker) {
      // Évite de déclencher si la position n'a pas changé
      if (lat !== lastLat || lng !== lastLng) {
        map.setCenter({ lat, lng })
        marker.setPosition({ lat, lng })
        lastLat = lat
        lastLng = lng
      }
    }
  }
)
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 400px;
  min-height: 300px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>
