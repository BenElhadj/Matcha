<template>
  <q-page class="column items-center justify-center q-pa-xl">
    <q-spinner size="64px" color="primary" />
    <h2 class="q-mt-lg">Backend waking up…</h2>
    <p class="q-mt-sm text-grey-7">This can take a few seconds on free hosting. We'll take you there automatically.</p>
    <q-btn class="q-mt-md" color="primary" :loading="checking" @click="forceCheck">
      Retry now
    </q-btn>
  </q-page>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import utility from '@/utility'

const route = useRoute()
const router = useRouter()
const checking = ref(false)
let timer = null

async function checkAndGo() {
  try {
    checking.value = true
    const ok = await utility.pingServer(4000)
    if (ok) {
      const target = route.query.redirect || '/'
      router.replace(String(target))
    }
  } catch (_) {
    // ignore, will retry
  } finally {
    checking.value = false
  }
}

function forceCheck() {
  checkAndGo()
}

onMounted(() => {
  // First immediate attempt then poll
  checkAndGo()
  timer = setInterval(checkAndGo, 4000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.q-page { min-height: 70vh; }
</style>
