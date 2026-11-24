<script setup>
import { Layout } from 'vuepress-theme-plume/client'
import PageContextMenu from 'vuepress-theme-plume/features/PageContextMenu.vue'
import AsideNav from './AsideNav.vue'
import SiteVisitTracker from './SiteVisitTracker.vue'
import NavActions from './NewHome3/NavActions.vue'
</script>

<template>
  <div>
    <Layout>
      <!-- 全站顶栏右侧：下载按钮、深浅色切换和更多链接（外观见 styles/site.css）。 -->
      <template #nav-bar-content-after>
        <NavActions />
      </template>
      <template #aside-outline-after>
        <AsideNav />
      </template>
      <template #doc-title-after>
        <PageContextMenu />
      </template>
    </Layout>
    <SiteVisitTracker />
  </div>
</template>

<style>
</style>
