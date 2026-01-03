/**
 * @see https://theme-plume.vuejs.press/config/navigation/ 查看文档了解配置详情
 *
 * Navbar 配置文件，它在 `.vuepress/plume.config.ts` 中被导入。
 */

import { defineNavbarConfig } from 'vuepress-theme-plume'

export default defineNavbarConfig([
  { text: '下载', link: '/download' },
  { text: 'WIKI', link: 'https://wiki.inkeys.top/' },
  { text: '版本', link: '/inkeys3', badge: { text: '新', type: 'tip' }, },
  { text: '知识库', link: '/tutorial/tutorial' },
  { text: '社区', link: '/community' },
  { text: '链接', link: '/link' }
])
