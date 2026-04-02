<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vuepress/client'

const route = useRoute()

const isHomePage = computed(() => route.path === '/' || route.path === '/index.html')

const BUSUANZI_SCRIPT_ID = 'busuanzi-script'
const BUSUANZI_SCRIPT_SRC = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'

function refreshBusuanzi() {
  if (typeof window === 'undefined') return

  const existing = document.getElementById(BUSUANZI_SCRIPT_ID)
  if (existing) existing.remove()

  const script = document.createElement('script')
  script.id = BUSUANZI_SCRIPT_ID
  script.defer = true
  script.src = `${BUSUANZI_SCRIPT_SRC}?t=${Date.now()}`
  document.head.appendChild(script)
}

async function syncBusuanzi() {
  await nextTick()
  window.setTimeout(refreshBusuanzi, 0)
}

onMounted(() => {
  void syncBusuanzi()
})

watch(() => route.path, () => {
  void syncBusuanzi()
})
</script>

<template>
  <div v-if="!isHomePage" class="site-visit-tracker" aria-hidden="true">
    <span id="busuanzi_container_site_pv">
      <span id="busuanzi_value_site_uv"></span>
      <span id="busuanzi_value_site_pv"></span>
    </span>
  </div>
</template>

<style scoped>
.site-visit-tracker {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
