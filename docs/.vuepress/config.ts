import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import type { HeadConfig, Page } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'
import { redirectPlugin } from '@vuepress/plugin-redirect'
import { readdirSync } from 'node:fs'
import { fs } from 'vuepress/utils'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAssetRuntimeScript } from './cdn/runtime'
import { i18nPlugin } from './i18n/plugin'
import { uinkSpecBundlePlugin } from './plugins/uinkSpecBundle'

const isProd = process.env.NODE_ENV === 'production'
const siteBase = '/'
const siteHostname = 'https://www.inkeys.top'
// 各语言的主页（/、/zh-tw/、/en-us/）：路径正好是语言前缀。
const isLocaleHome = (page: Page) => page.path === page.pathLocale
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
    "智绘教Inkeys 是一款免费开源的 Windows 屏幕批注软件，桌面批注、自由白板、PPT 演示批注，一个软件就够了。书写流畅、界面精致，鼠标、触摸、屏幕笔和数位板都能用。",

  // 三种语言：简体中文在根路径（现有网址不变），繁中、英文带前缀；繁中与英文的品牌名只写 Inkeys。
  locales: {
    '/': {
      lang: 'zh-CN',
      title: '智绘教Inkeys',
      description: '智绘教Inkeys 是一款免费开源的 Windows 屏幕批注软件，桌面批注、自由白板、PPT 演示批注，一个软件就够了。书写流畅、界面精致，鼠标、触摸、屏幕笔和数位板都能用。',
    },
    '/zh-tw/': {
      lang: 'zh-TW',
      title: 'Inkeys',
      description: 'Inkeys 是一款免費開源的 Windows 螢幕批註軟體，桌面批註、自由白板、PPT 簡報批註，一個軟體就夠了。書寫流暢、介面精緻，滑鼠、觸控、螢幕筆和數位板都能用。',
    },
    '/en-us/': {
      lang: 'en-US',
      title: 'Inkeys',
      description: 'Inkeys is a free, open-source screen annotation app for Windows. Draw on your desktop, use a whiteboard or annotate PowerPoint slideshows with smooth, responsive ink, using a mouse, touch, a screen pen or a pen tablet.',
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
    hostname: siteHostname,

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
      // SEO（Plume 只在生产构建启用）。镜像页在本插件之后才生成，不经过这里，自带 noindex 与指向简体原页的 canonical。
      seo: {
        // 主页是产品介绍，不按文章处理：og:type 为 website，JSON-LD 不再是缺图、缺作者的 Article。
        isArticle: page => Boolean(page.filePathRelative) && !page.frontmatter.home && !isLocaleHome(page),
        // 每个收录页声明自己的规范网址，404 页除外。
        canonical: page => page.frontmatter.layout === 'NotFound' ? null : `${siteHostname}${page.path}`,
        ogp: (ogp, page, app) => {
          // 主页没有页面标题，部分页面没有摘要，分享卡片退回到该语言的站点名与站点描述。
          const locale = app.siteData.locales[page.pathLocale] ?? {}
          ogp['og:title'] ||= locale.title || app.siteData.title
          ogp['og:description'] ||= locale.description || app.siteData.description
          return ogp
        },
        jsonLd: (jsonLd, page, app) => {
          if (!isLocaleHome(page)) {
            // 没有配图、没有署名的文章，插件会写出 image: [""] 与 author: []，结构化数据检查会报错，去掉空值。
            if (Array.isArray(jsonLd.image) && !jsonLd.image.some(Boolean))
              delete jsonLd.image
            if (Array.isArray(jsonLd.author) && !jsonLd.author.length)
              delete jsonLd.author
            return jsonLd
          }
          const locale = app.siteData.locales[page.pathLocale] ?? {}
          return {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': locale.title || app.siteData.title,
            'url': `${siteHostname}${page.path}`,
            'description': locale.description || app.siteData.description,
            'inLanguage': page.lang,
          }
        },
        customHead: (head, page) => {
          // 插件生成的 hreflang 只列出其他语言；按 Google 的要求补上自身，并以简体页作为 x-default。
          if (!head.some(([tag, attrs]) => tag === 'link' && attrs.rel === 'alternate' && attrs.hreflang))
            return
          const rootPath = `/${page.path.slice(page.pathLocale.length)}`
          head.push(['link', { rel: 'alternate', hreflang: page.lang.toLowerCase(), href: `${siteHostname}${page.path}` }])
          head.push(['link', { rel: 'alternate', hreflang: 'x-default', href: `${siteHostname}${rootPath}` }])
        },
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
    // Chrome / Edge 正在移除 XSLT，sitemap 插件固定写入的 xml-stylesheet 会让浏览器顶部弹出警告。
    // 样式表只给人看，搜索引擎不读；这里在 sitemap 生成后去掉引用和样式表文件，浏览器直接显示 XML。
    // 主题插件的 onGenerated 先于这里运行。
    {
      name: 'inkeys-sitemap-no-xsl',
      async onGenerated(app) {
        const file = app.dir.dest('sitemap.xml')
        if (!fs.existsSync(file))
          return
        const xml = await fs.readFile(file, 'utf-8')
        await fs.writeFile(file, xml.replace(/<\?xml-stylesheet[^>]*\?>\s*/u, ''))
        await fs.remove(app.dir.dest('sitemap.xsl'))
      },
    },
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
