import { defineClientConfig } from 'vuepress/client'
import Layout from './theme/components/Layout.vue'
import DownloadCard from './theme/components/DownloadCard.vue'
import GitHubCard from './theme/components/GitHubCard.vue'
import SwiperSelf from './theme/components/Swiper.vue'
import VideoPlayerAmbilight from './theme/components/VideoPlayerAmbilight.vue' 
import './theme/styles/custom.css'

export default defineClientConfig({
  enhance({ app }) {
    app.component('DownloadCard', DownloadCard)
    app.component('GitHubCard', GitHubCard)
    app.component('SwiperSelf', SwiperSelf) 
    app.component('VideoPlayerAmbilight', VideoPlayerAmbilight) 
  },
  layouts: {
    Layout,
  },
})