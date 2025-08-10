import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "智绘教Inkeys",
  description: "智绘教Inkeys 是一款 Windows 屏幕批注工具，拥有高效批注和丰富功能， 让屏幕演示变得简单，让教学授课变得高效，适用于触摸设备和PC端。",
  outDir: "dist", 
  srcDir: "src", 

  vite: { 
    publicDir: "../public",
  }, 
  head: [
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
    ["link", { rel: "shortcut icon", href: "/Inkeys.svg" }],
  ],

  themeConfig: {
    siteTitle: '智绘教Inkeys',

    logo: "/Inkeys.svg",
    nav: [
      { text: '⬇️ 开始下载', link: '/download' },
      { text: '📖 Wiki文档', link: 'https://wiki.inkeys.top/' },
      {
        text: '🌐 开发者博客',
        items: [
          { text: '博客导航', link: '/tutorial/tutorial' },
          { text: '程序无法识别 Office/WPS 的 COM 接口失效/无法识别解决方案', link: '/tutorial/ppt-com' },
          { text: 'Microsoft Office/PowerPoint 无法以普通用户权限运行的解决方案', link: '/tutorial/ppt-admin' },
          { text: 'Microsoft Office 如何启用和正常播放 Flash 控件', link: '/tutorial/ppt-flash' },
        ]
      },
      { text: '💳 社区名片', link: '/community' },
      { text: '🔗 相关链接', link: '/link' }
    ],
    sidebar: [
      { text: '⬇️ 开始下载', link: '/download' },
      { text: '📖 Wiki文档', link: 'https://wiki.inkeys.top/' },
      {
        text: '🌐 开发者博客',
        items: [
          { text: '博客导航', link: '/tutorial/tutorial' },
          { text: '程序无法识别 Office/WPS 的 COM 接口失效/无法识别解决方案', link: '/tutorial/ppt-com' },
          { text: 'Microsoft Office/PowerPoint 无法以普通用户权限运行的解决方案', link: '/tutorial/ppt-admin' },
          { text: 'Microsoft Office 如何启用和正常播放 Flash 控件', link: '/tutorial/ppt-flash' },
        ]
      },
      { text: '💬 碎碎念', link: '/jabber' },
      { text: '💳 社区名片', link: '/community' },
      { text: '🔗 相关链接', link: '/link' }
    ],
    
    search: {
      provider: "local",
      options: {
        miniSearch: {
          options: {
            /* ... */
          },
          searchOptions: {
            /* ... */
          },
        },
        translations: {
          button: {
            buttonText: "搜索文档",
            buttonAriaLabel: "搜索文档",
          },
          modal: {
            noResultsText: "没有找到结果",
            resetButtonTitle: "清除搜索条件",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },

    socialLinks: [
      { icon: 'qq', link: 'https://qm.qq.com/q/wZnY4enpmw' },
      { icon: 'bilibili', link: 'https://space.bilibili.com/1330313497/lists/2210199' },
      { icon: 'github', link: 'https://github.com/Alan-CRL/Inkeys' },
      { icon: 'csdn', link: 'https://gitcode.com/alan16356/Inkeys' }
    ],
    footer: {
      message: `本项目基于 <a href="https://github.com/Alan-CRL/Inkeys?tab=GPL-3.0-1-ov-file#readme" target="_blank">GNU General Public License v3.0</a> 获得许可`,
      copyright: `Copyright © 2023-${new Date().getFullYear()} AlanCRL(陈润林) 工作室`,
    },

    langMenuLabel: "多语言",
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    outline: {
      level: "deep",
      label: "页面导航",
    },
    editLink: {
      pattern: 'https://github.com/Alan-CRL/inkeys.top/tree/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    },
    lastUpdated: {
      text: '最后更新于'
    },
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "目录",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
    notFound: {
      title: '页面未找到',
      quote:
        '但如果你不改变方向，并且继续寻找，你可能最终会到达你所前往的地方。',
      linkLabel: '前往首页',
      linkText: '带我回首页'
    },
  },

  cleanUrls: true,

  sitemap: {
    hostname: 'https://www.inkeys.top'
  }
})
