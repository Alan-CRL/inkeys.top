import { defineClientConfig } from 'vuepress/client'
import Layout from './theme/components/Layout.vue'
import DownloadCard from './theme/components/DownloadCard.vue'
import GitHubCard from './theme/components/GitHubCard.vue'
// import Swiper from 'vuepress-theme-plume/features/Swiper.vue'
import './theme/styles/custom.css'

import VideoPlayerAmbilight from './theme/components/VideoPlayerAmbilight.vue' 

export default defineClientConfig({
  enhance({ app }) {
    // app.component('Swiper', Swiper) // you should install `swiper`
    app.component('DownloadCard', DownloadCard)
    app.component('GitHubCard', GitHubCard)

    app.component('VideoPlayerAmbilight', VideoPlayerAmbilight) 
  },
  layouts: {
    Layout,
  },
})