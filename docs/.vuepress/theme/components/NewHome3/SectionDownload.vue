<script setup lang="ts">
import { ref } from 'vue'
import { VPLink } from 'vuepress-theme-plume/client'
import { useAppear } from './appear'
import { useCopy } from './copy'

// S6：叙事结束后的下载入口，直接放在页面背景上。
const { copy } = useCopy()
const root = ref<HTMLElement>()
useAppear(root)
</script>

<template>
  <section ref="root" class="nh3-section nh3-s6" aria-labelledby="nh3-s6-title">
    <div class="nh3-wrap nh3-s6-inner" data-nh3-appear>
      <h2 id="nh3-s6-title" class="nh3-display" data-nh3-item>{{ copy.s6.title }}</h2>
      <p class="nh3-lead" data-nh3-item>{{ copy.s6.lead }}</p>
      <VPLink class="nh3-btn nh3-btn-primary" data-nh3-item href="/download" target="_blank" no-icon>{{ copy.s6.download }}</VPLink>
      <p class="nh3-caption" data-nh3-item>{{ copy.s6.requirement }}</p>
    </div>
  </section>
</template>

<style>
.nh3-s6-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.nh3-s6 .nh3-lead {
  margin-top: 24px;
}

.nh3-s6 .nh3-btn {
  margin-top: 32px;
}

.nh3-s6 .nh3-caption {
  margin-top: 16px;
}
</style>
