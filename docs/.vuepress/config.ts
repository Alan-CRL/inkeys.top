import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'
import { redirectPlugin } from '@vuepress/plugin-redirect'

const isProd = process.env.NODE_ENV === 'production'

export default defineUserConfig({
  base: "/",
  lang: "zh-CN",
  title: "智绘教Inkeys",
  description:
    "将你的创意随心所欲地书写在屏幕的任意角落。智绘教Inkeys 拥有丝滑流畅的高性能画笔、丰富强大的功能，以及众多贴心小设计，全面提升你的效率与使用体验。",

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

    llmstxt: true,
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
    //autoFrontmatter: {
      //   permalink: true, // 是否生成永久链接
      //   createTime: true, // 是否生成创建时间
      //   title: true,      // 是否生成标题
    //},

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
    replaceAssets: { 
      find: /^\/.*\.(jpg|jpeg|png|gif|svg|webp|avif)$/,
      replacement: url => `https://1709404.v.123pan.cn/1709404/Inkeys/Website/public${url}`
    },
    
    /**
     * 加密功能
     * @see https://theme-plume.vuejs.press/guide/features/encryption/
     */
    // encrypt: {},

    plugins: {
      // 图片选择器
      photoSwipe: {
        scrollToClose: false, // 是否在滚动时关闭当前图片
      },
    },
  }),

  plugins: [
    redirectPlugin({
      config: {
        // key 是旧路径，value 是新路径
        '/inkeys3': '/version/inkeys3',
        '/inkeys3.html': '/version/inkeys3.html',
        '/win7': '/version/introduction/win7',
        '/win7.html': '/version/introduction/win7.html',
        '/version/pptcom3': '/version/introduction/pptcom3',
        '/version/pptcom3.html': '/version/introduction/pptcom3.html',
      },
    }),
  ],

});
