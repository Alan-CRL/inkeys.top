import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import type { HeadConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'
import { redirectPlugin } from '@vuepress/plugin-redirect'
import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAssetRuntimeScript } from './cdn/runtime'
import { i18nPlugin } from './i18n/plugin'
import { uinkSpecBundlePlugin } from './plugins/uinkSpecBundle'

const isProd = process.env.NODE_ENV === 'production'
const siteBase = '/'
// public 文件清单交给运行时脚本：只有清单里的路径才会在通道之间切换，页面链接和外部资源不受影响。
const publicDir = fileURLToPath(new URL('./public/', import.meta.url))
const publicFiles = (readdirSync(publicDir, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => `/${relative(publicDir, join(entry.parentPath, entry.name)).split(sep).join('/')}`)
  .sort()

export default defineUserConfig({
  base: siteBase,
  lang: "zh-CN",
  title: "智绘教Inkeys",
  description:
    "将你的创意随心所欲地书写在屏幕的任意角落。智绘教Inkeys 拥有丝滑流畅的高性能画笔、丰富强大的功能，以及众多贴心小设计，全面提升你的效率与使用体验。",

  // 三种语言：简体中文在根路径（现有网址不变），繁中、英文带前缀；繁中与英文的品牌名只写 Inkeys。
  locales: {
    '/': {
      lang: 'zh-CN',
      title: '智绘教Inkeys',
      description: '将你的创意随心所欲地书写在屏幕的任意角落。智绘教Inkeys 拥有丝滑流畅的高性能画笔、丰富强大的功能，以及众多贴心小设计，全面提升你的效率与使用体验。',
    },
    '/zh-tw/': {
      lang: 'zh-TW',
      title: 'Inkeys',
      description: '將你的創意隨心所欲地書寫在螢幕的任意角落。Inkeys 擁有反應靈敏、書寫流暢的畫筆、豐富強大的功能，以及眾多貼心小設計，全面提升你的效率與使用體驗。',
    },
    '/en-us/': {
      lang: 'en-US',
      title: 'Inkeys',
      description: 'Write your ideas anywhere on your screen. Inkeys gives you smooth, responsive pens, powerful features and thoughtful details that help you work more efficiently.',
    },
  },

  head: [
    [
      'meta', 
      { name: 'baidu-site-verification', content: 'codeva-7hhLidgMFB' }
    ],
    [
      "link",
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/Inkeys.svg",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/Inkeys.svg",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/Inkeys.svg",
      },
    ],
    [ "link", { rel: "shortcut icon", href: "/Inkeys.svg" } ],
    // 生产站点：public 资源默认走本站，单个文件失败或通道卡顿时换到 123 云盘备用地址（见 cdn/runtime.ts）。
    ...(isProd ? [[ "script", {}, createAssetRuntimeScript(siteBase, publicFiles) ] as HeadConfig] : []),
  ],

  bundler: viteBundler(),
  shouldPrefetch: false, // 站点较大，页面数量较多时，不建议启用

  theme: plumeTheme({
    /* 添加您的部署域名, 有助于 SEO, 生成 sitemap */
    hostname: "https://www.inkeys.top",

    /* 文档仓库配置，用于 editLink */
    docsRepo: "https://github.com/Alan-CRL/inkeys.top",
    docsDir: "docs",
    docsBranch: "main",

    // 默认只为简体页面生成 .md 与 llms.txt；'all' 让繁中、英文译文也生成，“复制页面”才取得到内容。
    // 镜像页 frontmatter 带 llmstxt: false，不生成，菜单也随之隐藏。
    llmstxt: {
      locale: 'all',
      llmsTxtTemplateGetter: {
        // 插件默认把其他语言的 llms.txt 链接改成 .md 扩展名（/zh-tw/llms.md 并不存在），这里改回 .txt。
        alternateLinks: (_pages, { allLocales, currentLocale, app }) => {
          if (!allLocales || currentLocale !== '/') return ''
          const links = Object.entries(app.siteData.locales)
            .filter(([path]) => path !== '/')
            .map(([path, { lang }]) => `- [${lang}](${path}llms.txt)`)
          return links.length ? `\n\n## Alternate Language Versions\n\n${links.join('\n')}\n\n` : ''
        },
      },
    },
    /* 页内信息 */
    // editLink: true,
    // lastUpdated: true,
    contributors: false,
    changelog: false,

    /**
     * 编译缓存，加快编译速度
     * @see https://theme-plume.vuejs.press/config/basic/#cache
     */
    cache: "filesystem",

    /**
     * 为 markdown 文件自动添加 frontmatter 配置
     * @see https://theme-plume.vuejs.press/config/basic/#autofrontmatter
     */
    // Plume rc.219 起会给不属于任何集合的页面自动写入随机 permalink 和 createTime，改掉现有网址，这里全局关闭；
    // 集合内的页面仍按各自 collections[].autoFrontmatter 配置处理。
    autoFrontmatter: false,

    /* 本地搜索, 默认启用 */
    search: {
      provider: "local",
    },

    /**
     * Algolia DocSearch
     * 启用此搜索需要将 本地搜索 search 设置为 false
     * @see https://theme-plume.vuejs.press/config/plugins/search/#algolia-docsearch
     */
    // search: {
    //   provider: 'algolia',
    //   appId: '',
    //   apiKey: '',
    //   indexName: '',
    // },

    /**
     * Shiki 代码高亮
     * @see https://theme-plume.vuejs.press/config/plugins/code-highlight/
     */
    // codeHighlighter: {
    //   twoslash: true, // 启用 twoslash
    //   whitespace: true, // 启用 空格/Tab 高亮
    //   lineNumbers: true, // 启用行号
    // },

    /* 文章字数统计、阅读时间，设置为 false 则禁用 */
    // readingTime: true,

    /**
     * markdown
     * @see https://theme-plume.vuejs.press/config/markdown/
     */
    markdown: {
      //   abbr: true,         // 启用 abbr 语法  *[label]: content
      //   annotation: true,   // 启用 annotation 语法  [+label]: content
      //   pdf: true,          // 启用 PDF 嵌入 @[pdf](/xxx.pdf)
      //   caniuse: true,      // 启用 caniuse 语法  @[caniuse](feature_name)
      //   plot: true,         // 启用隐秘文本语法 !!xxxx!!
      field: true, 
           bilibili: true,     // 启用嵌入 bilibili视频 语法 @[bilibili](bid)
           youtube: true,      // 启用嵌入 youtube视频 语法 @[youtube](video_id)
           artPlayer: true,    // 启用嵌入 artPlayer 本地视频 语法 @[artPlayer](url)
      //   audioReader: true,  // 启用嵌入音频朗读功能 语法 @[audioReader](url)
      icon: { provider: "iconify", size: "1.5rem" },
      //   table: true,        // 启用表格增强容器语法 ::: table
      //   codepen: true,      // 启用嵌入 codepen 语法 @[codepen](user/slash)
      //   replit: true,       // 启用嵌入 replit 语法 @[replit](user/repl-name)
      //   codeSandbox: true,  // 启用嵌入 codeSandbox 语法 @[codeSandbox](id)
      //   jsfiddle: true,     // 启用嵌入 jsfiddle 语法 @[jsfiddle](user/id)
      //   npmTo: true,        // 启用 npm-to 容器  ::: npm-to
      //   demo: true,         // 启用 demo 容器  ::: demo
      //   repl: {             // 启用 代码演示容器
      //     go: true,         // ::: go-repl
      //     rust: true,       // ::: rust-repl
      //     kotlin: true,     // ::: kotlin-repl
      //     python: true,     // ::: python-repl
      //   },
           math: {             // 启用数学公式
             type: 'katex',
           },
      //   chartjs: true,      // 启用 chart.js
      //   echarts: true,      // 启用 ECharts
      mermaid: true,      // 启用 mermaid
      //   flowchart: true,    // 启用 flowchart
           image: {
             figure: true,     // 启用 figure
             lazyload: true,   // 启用图片懒加载
             mark: true,       // 启用图片标记
             size: true,       // 启用图片大小
           },
      //   include: true,      // 在 Markdown 文件中导入其他 markdown 文件内容
      //   imageSize: 'all', // 启用 自动填充 图片宽高属性，避免页面抖动
      mark: 'lazy',
      timeline: true,
    },

    /**
     * 水印
     * @see https://theme-plume.vuejs.press/guide/features/watermark/
     */
    // watermark: true,

    /**
     * 评论 comments
     * @see https://theme-plume.vuejs.press/guide/features/comments/
     */
    // comment: {
    //   provider: 'Giscus', // "Artalk" | "Giscus" | "Twikoo" | "Waline"
    //   comment: true,
    //   repo: 'Alan-CRL/inkeys.top',
    //   repoId: '',
    //   category: '',
    //   categoryId: '',
    //   mapping: 'pathname',
    //   reactionsEnabled: true,
    //   inputPosition: 'top',
    // },

    /**
     * 资源链接替换
     * @see https://theme-plume.vuejs.press/guide/features/replace-assets/
     */
    // 不在构建时替换资源地址：默认走本站，备用通道由运行时脚本切换。
    replaceAssets: false,
    
    /**
     * 加密功能
     * @see https://theme-plume.vuejs.press/guide/features/encryption/
     */
    // encrypt: {},

    plugins: {
      // 图片选择器
      photoSwipe: {
        // 保留 plume 默认的正文图片选择器，并加入 new-index3 功能介绍配图
        selector: [
          '.vp-doc :not(a) > img:not([no-view],.no-view,.ignore)',
          '.feature-page-media',
        ],
        scrollToClose: false, // 是否在滚动时关闭当前图片
      },
    },
  }),

  plugins: [
    // 整页加载时按语言跳转，并生成快捷入口的跳转页（见 i18n/plugin.ts）
    i18nPlugin(),
    redirectPlugin({
      config: {
        // key 是旧路径，value 是新路径
        // /inkeys3、/win7、/tos/zh-cn、/tos/en-us 需要按语言跳转，由 i18nPlugin 生成（见 i18n/plugin.ts）。
        '/version/pptcom3': '/version/introduction/pptcom3',
        '/version/pptcom3.html': '/version/introduction/pptcom3.html',
        '/pptx-video-processing': '/tutorial/pptx-video-processing',
        '/pptx-video-processing.html': '/tutorial/pptx-video-processing.html',
      },
    }),
    // 构建后生成 UInk 单文件规范与规范索引（见 plugins/uinkSpecBundle.ts）
    uinkSpecBundlePlugin(),
    // 版本文章没有写 createTime，Plume rc.219 按时间排序时会退回文件名升序（旧版本在前）。
    // 这里只在内存中按文件名 YYYYMMDD + 字母 补上时间，同日多个版本按字母先后错开一分钟，不写回源文件。
    {
      name: 'inkeys-changelog-time',
      extendsPage(page) {
        const match = page.filePathRelative?.match(/^(?:(?:zh-tw|en-us)\/)?version\/changelog\/(\d{4})(\d{2})(\d{2})([a-z])\.md$/)
        if (!match || page.frontmatter.createTime) return
        const minute = String(match[4].charCodeAt(0) - 97).padStart(2, '0')
        page.frontmatter.createTime = `${match[1]}/${match[2]}/${match[3]} 00:${minute}:00`
      },
    },
  ],

});
