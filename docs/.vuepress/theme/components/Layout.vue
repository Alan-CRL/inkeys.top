<script setup>
import { usePageFrontmatter } from 'vuepress/client'
import { Layout } from 'vuepress-theme-plume/client'
import PageContextMenu from 'vuepress-theme-plume/features/PageContextMenu.vue'
import AsideNav from './AsideNav.vue'
import SiteVisitTracker from './SiteVisitTracker.vue'
import NavActions from './NewHome3/NavActions.vue'

const frontmatter = usePageFrontmatter()
</script>

<template>
  <div>
    <Layout>
      <!-- 仅首页（NewHome3）：顶栏右侧的下载按钮、深浅色切换和更多链接。 -->
      <template #nav-bar-content-after>
        <NavActions v-if="frontmatter.pageLayout === 'NewHome3'" />
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
