import type { Component } from 'vue'
import { defineClientConfig, resolveRoute } from 'vuepress/client'
import { LOCALE_PREFIX, LOCALES, normalizePathKey, SHORTCUTS } from './i18n/locales'
import Layout from './theme/components/Layout.vue'
import DownloadCard from './theme/components/DownloadCard.vue'
import GitHubCard from './theme/components/GitHubCard.vue'
import SiteVisitCounter from './theme/components/SiteVisitCounter.vue'
import SwiperSelf from './theme/components/Swiper.vue'
import VideoPlayerAmbilight from './theme/components/VideoPlayerAmbilight.vue' 
import NewHome3 from './theme/components/NewHome3/NewHome3.vue'
import UInkHero from './theme/components/UInk/UInkHero.vue'
import UInkTierDemo from './theme/components/UInk/UInkTierDemo.vue'
import UInkStructure from './theme/components/UInk/UInkStructure.vue'
import './theme/styles/custom.css'
import './theme/styles/site.css'

// UInk 规范图示：diagrams 目录下的每个组件按文件名注册，供 docs/standard 页面直接使用
const uinkDiagrams = import.meta.glob<{ default: Component }>('./theme/components/UInk/diagrams/*.vue', { eager: true })

export default defineClientConfig({
  enhance({ app, router }) {
    const originalScrollBehavior = router.options.scrollBehavior
    // 在路由真正提交滚动时覆盖保存位置，避免刷新后的恢复晚于组件 mounted。
    router.options.scrollBehavior = (to, from, savedPosition) => {
      // 带锚点的跳转（S1 卡片跳到 S2）交还给默认行为，否则页内链接也会被拉回顶部。
      if (/^\/(?:(?:zh-tw|en-us)\/)?(?:index\.html)?$/.test(to.path) && !to.hash) {
        return { top: 0, left: 0, behavior: 'instant' }
      }
      return originalScrollBehavior?.(to, from, savedPosition)
    }
    // 站内跳到快捷入口（/inkeys3、/win7、/tos/zh-cn、/tos/en-us）：按当前页面的语言解析，
    // 当前语言有译文就去译文，否则去简体页；不读浏览器语言，保持“站内不自动切换”。
    // 整页加载（首次导航）由 head 里的语言脚本处理，这里跳过。
    router.beforeEach((to, from) => {
      if (!from.matched.length) return
      const shortcut = SHORTCUTS[normalizePathKey(to.path)]
      if (!shortcut) return
      let path = shortcut.target
      const locale = LOCALES.find(item => item !== 'zh-CN' && from.path.startsWith(LOCALE_PREFIX[item]))
      if (shortcut.match && locale) {
        const translated = LOCALE_PREFIX[locale] + shortcut.target.slice(1)
        if (!resolveRoute(translated).notFound) path = translated
      }
      return { path, query: to.query, hash: to.hash, replace: true }
    })
    app.component('DownloadCard', DownloadCard)
    app.component('GitHubCard', GitHubCard)
    app.component('SiteVisitCounter', SiteVisitCounter)
    app.component('SwiperSelf', SwiperSelf) 
    app.component('VideoPlayerAmbilight', VideoPlayerAmbilight) 
    app.component('NewHome3', NewHome3)
    app.component('UInkHero', UInkHero)
    app.component('UInkTierDemo', UInkTierDemo)
    app.component('UInkStructure', UInkStructure)
    for (const [file, mod] of Object.entries(uinkDiagrams)) {
      app.component(file.slice(file.lastIndexOf('/') + 1, -'.vue'.length), mod.default)
    }
  },
  layouts: {
    Layout,
  },
})
