<script setup>
import { Layout } from 'vuepress-theme-plume/client'
import PageContextMenu from 'vuepress-theme-plume/features/PageContextMenu.vue'
import AsideNav from './AsideNav.vue'
import SiteVisitCounter from './SiteVisitCounter.vue'
</script>

<template>
  <Layout>
    <template #aside-outline-after>
      <AsideNav />
    </template>
    <template #doc-title-after>
      <PageContextMenu />
    </template>
    <template #footer-content>
      <SiteVisitCounter />
    </template>
  </Layout>
</template>

<style>
</style>
