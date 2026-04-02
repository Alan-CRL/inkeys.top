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
</template>

<style scoped>
.site-visit-counter {
  margin: 28px 0 2px;
  font-size: 0.86rem;
  text-align: center;
  color: rgba(60, 60, 67, 0.72);
}

[data-theme="dark"] .site-visit-counter {
  color: rgba(235, 235, 245, 0.5);
}
</style>
