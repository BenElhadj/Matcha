<template>
  <div class="app-avatar" :class="sizeClass">
    <q-avatar class="app-avatar__q" :style="avatarStyle">
      <img
        :src="src"
        :alt="alt || 'avatar'"
        decoding="async"
        fetchpriority="high"
        loading="eager"
      />
      <slot />
      <span
        v-if="showPresence"
        :class="['presence-dot', sizeClass, isOnline ? 'online' : 'offline']"
      ></span>
    </q-avatar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import utility from '@/utility.js'

const props = defineProps({
  // Image can be a string (filename/url/data) or an object { name/link/data/... }
  image: { type: [String, Object], default: '' },
  // Explicit alt text
  alt: { type: String, default: '' },
  // Control presence dot visibility
  showPresence: { type: Boolean, default: false },
  // Explicit online flag (overrides userId/connectedUsers detection if provided)
  online: { type: Boolean, default: undefined },
  // When provided, presence will be derived from store.connectedUsers (if online not explicitly set)
  userId: { type: [String, Number], default: null },
  // small: 44px, medium: 70px, large: 250px
  size: {
    type: String,
    default: 'small',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  },
  // Optional exact pixel size override to match containers precisely (e.g., QChatMessage)
  pixelSize: { type: Number, default: null }
})

const store = useStore()
const sizeClass = computed(() => `size-${props.size}`)

const src = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  const fallback = utility.getCachedDefault?.('profile') || `${base}default/defaut_profile.txt`
  if (utility.getImageSrc) return utility.getImageSrc(props.image, fallback)
  if (utility.getFullPath) return utility.getFullPath(props.image)
  return fallback
})

// Inline width/height override when pixelSize is provided
const avatarStyle = computed(() => {
  if (!props.pixelSize) return {}
  const s = `${props.pixelSize}px`
  return { width: s, height: s }
})

const isOnline = computed(() => {
  if (typeof props.online === 'boolean') return props.online
  if (props.userId === null || props.userId === undefined) return false
  try {
    const ids = Array.isArray(store.state.connectedUsers) ? store.state.connectedUsers : []
    const set = new Set(ids.map((x) => String(x)))
    return set.has(String(props.userId))
  } catch (_) {
    return false
  }
})
</script>

<style scoped>
.app-avatar {
  display: inline-block;
}
.app-avatar__q {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 44px;
}
.app-avatar__q img {
  position: relative; /* ensure predictable stacking under the presence dot */
  z-index: 1;
}
.app-avatar.size-medium .app-avatar__q {
  width: 70px;
  height: 70px;
}
.app-avatar.size-large .app-avatar__q {
  width: 250px;
  height: 250px;
}

.presence-dot {
  position: absolute;
  /* Anchor on the avatar image corner; offset inward by a size-proportional inset */
  bottom: var(--inset, 6px);
  right: var(--inset, 6px);
  border-radius: 50%;
  border: 2px solid white;
  pointer-events: none;
  z-index: 2; /* ensure it stays above the avatar image and slot content */
}
.presence-dot.size-small {
  width: 9px;
  height: 9px;
}
.presence-dot.size-medium {
  width: 12px;
  height: 12px;
}
.presence-dot.size-large {
  width: 18px;
  height: 18px;
}

.online {
  background: #21ba45;
}
.offline {
  background: #9e9e9e;
}

/* Responsive breakpoints */
@media (max-width: 600px) {
  /* Downscale for small screens */
  .app-avatar .app-avatar__q {
    width: 44px;
    height: 44px;
  }
  .app-avatar.size-small .app-avatar__q {
    width: 36px;
    height: 36px;
  }
  .app-avatar.size-medium .app-avatar__q {
    width: 56px;
    height: 56px;
  }
  .app-avatar.size-large .app-avatar__q {
    width: 220px;
    height: 220px;
  }

  /* Proportional inset for each avatar size on small screens */
  .app-avatar.size-small {
    --inset: 3px;
  }
  .app-avatar.size-medium {
    --inset: 8px;
  }
  .app-avatar.size-large {
    --inset: 37px;
  }

  .presence-dot.size-small {
    width: 8px;
    height: 8px;
  }
  .presence-dot.size-medium {
    width: 10px;
    height: 10px;
  }
  .presence-dot.size-large {
    width: 16px;
    height: 16px;
  }
}

@media (min-width: 1200px) {
  /* Upscale slightly for wide screens */
  .app-avatar.size-small .app-avatar__q {
    width: 48px;
    height: 48px;
  }
  .app-avatar.size-medium .app-avatar__q {
    width: 84px;
    height: 84px;
  }
  .app-avatar.size-large .app-avatar__q {
    width: 280px;
    height: 280px;
  }

  /* Proportional inset for each avatar size on wide screens */
  .app-avatar.size-small {
    --inset: 5px;
  }
  .app-avatar.size-medium {
    --inset: 12px;
  }
  .app-avatar.size-large {
    --inset: 47px;
  }

  .presence-dot.size-small {
    width: 10px;
    height: 10px;
  }
  .presence-dot.size-medium {
    width: 14px;
    height: 14px;
  }
  .presence-dot.size-large {
    width: 20px;
    height: 20px;
  }
}

/* Default proportional inset for base sizes (used outside breakpoints) */
.app-avatar.size-small {
  --inset: 4px;
}
.app-avatar.size-medium {
  --inset: 10px;
}
.app-avatar.size-large {
  --inset: 42px;
}
</style>
