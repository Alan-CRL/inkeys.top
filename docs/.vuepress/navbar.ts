/**
 * @see https://theme-plume.vuejs.press/config/navigation/ 查看文档了解配置详情
 *
 * Navbar 配置文件，它在 `.vuepress/plume.config.ts` 中按语言导入。
 * 繁中、英文的条目都指向同一语言的页面；没有译文的页面是 i18n/mirror.ts 生成的镜像（简体原文 + 暂未翻译提示）。
 */

import { defineNavbarConfig } from 'vuepress-theme-plume'

export const zhCNNavbar = defineNavbarConfig([
  { text: '下载', link: '/download' },
  { text: 'UInk 规范', link: '/standard/' },
  { text: '知识库', link: '/tutorial/tutorial' },
  { text: '社区', link: '/community' },
  { text: '链接', link: '/link' }
])

export const zhTWNavbar = defineNavbarConfig([
  { text: '下載', link: '/zh-tw/download' },
  { text: 'UInk 規範', link: '/zh-tw/standard/' },
  { text: '知識庫', link: '/zh-tw/tutorial/tutorial' },
  { text: '社群', link: '/zh-tw/community' },
  { text: '連結', link: '/zh-tw/link' }
])

export const enUSNavbar = defineNavbarConfig([
  { text: 'Download', link: '/en-us/download' },
  { text: 'UInk Spec', link: '/en-us/standard/' },
  { text: 'Knowledge Base', link: '/en-us/tutorial/tutorial' },
  { text: 'Community', link: '/en-us/community' },
  { text: 'Links', link: '/en-us/link' }
])
