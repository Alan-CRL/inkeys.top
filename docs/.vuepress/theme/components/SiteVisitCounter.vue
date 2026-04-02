<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vuepress/client'

const route = useRoute()

const isHomePage = computed(() => route.path === '/' || route.path === '/index.html')
</script>

<template>
  <div v-if="isHomePage" class="site-visit-counter">
    <span id="busuanzi_container_site_pv">
      本站访问人数 <span id="busuanzi_value_site_uv"></span>
      人，累计访问 <span id="busuanzi_value_site_pv"></span> 次
    </span>
  </div>
  <div v-else class="site-visit-counter-hidden" aria-hidden="true">
    <span id="busuanzi_container_site_pv">
      <span id="busuanzi_value_site_uv"></span>
      <span id="busuanzi_value_site_pv"></span>
    </span>
  </div>
</template>

<style scoped>
.site-visit-counter {
  margin-top: 8px;
  font-size: 0.86rem;
  text-align: center;
  color: var(--vp-c-text-3);
}

.site-visit-counter-hidden {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
