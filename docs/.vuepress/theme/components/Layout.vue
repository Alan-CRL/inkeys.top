<script setup>
import { Layout } from 'vuepress-theme-plume/client'
import PageContextMenu from 'vuepress-theme-plume/features/PageContextMenu.vue'
import AsideNav from './AsideNav.vue'
import SiteVisitTracker from './SiteVisitTracker.vue'
</script>

<template>
  <div>
    <Layout>
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
