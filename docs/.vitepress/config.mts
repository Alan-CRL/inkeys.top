import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "智绘教Inkeys - 全能型屏幕批注工具 | 官网",
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
      { text: '主页', link: '/' },
      { text: '下载', link: '/download' },
      { text: '使用教程', link: '/tutorial/tutorial' },
      { text: '碎碎念', link: '/jabber' },
      { text: '相关链接', link: '/link' }
    ],
    sidebar: [
      { text: '主页', link: '/' },
      { text: '下载', link: '/download' },
      {
        text: '使用教程',
        items: [
          { text: '使用教程', link: '/tutorial/tutorial' },
          { text: '---', link: '' },
          { text: '程序无法识别 Office/WPS 的 COM 接口失效/无法识别解决方案', link: '/tutorial/ppt-com' },
          { text: 'Microsoft Office/PowerPoint 无法以普通用户权限运行的解决方案', link: '/tutorial/ppt-admin' },
          { text: 'Microsoft Office 如何启用和正常播放 Flash 控件', link: '/tutorial/ppt-flash' },
        ]
      },
      { text: '碎碎念', link: '/jabber' },
      { text: '相关链接', link: '/link' }
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
      { icon: 'github', link: 'https://github.com/Alan-CRL/Inkeys' },
      { 
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24"><path fill="#000000" d="M4.693 13.638c-.497.568-1.363.63-1.712.63c-.648 0-1.144-.164-1.474-.488c-.313-.307-.478-.76-.489-1.346c-.025-1.358.744-2.762 2.074-2.762c.635 0 1.124.455 1.311.644a.34.34 0 0 0 .282.099a.38.38 0 0 0 .241-.159c.068-.087.135-.237.138-.401s-.057-.344-.243-.49a2.64 2.64 0 0 0-1.668-.591c-.819 0-1.627.376-2.218 1.033c-.621.691-.953 1.63-.935 2.646c.015.815.282 1.5.773 1.982c.528.518 1.3.791 2.235.791c1.097 0 1.776-.325 2.154-.597a.58.58 0 0 0 .24-.456a.7.7 0 0 0-.208-.497c-.23-.248-.448-.101-.503-.037Zm4.97-2.15a8 8 0 0 0-.698-.248q-.237-.072-.45-.131c-.922-.26-1.027-.5-1.017-.68c.022-.363.515-.853 1.352-.792c.607.045 1.015.509 1.205.781c.149.214.371.135.434.095a.6.6 0 0 0 .309-.514a.63.63 0 0 0-.209-.488a2.654 2.654 0 0 0-3.347-.273c-.456.323-.744.772-.77 1.202c-.064 1.061 1.015 1.366 1.803 1.588c.214.061.429.127.667.202c1.14.357 1.173.717 1.092 1.267c-.082.556-.696.834-1.685.761c-1.029-.076-1.464-.61-1.612-.901c-.05-.098-.205-.248-.413-.156c-.514.229-.473.731-.26.993c.339.416 1.15 1.035 2.667 1.035c1.734 0 2.255-.875 2.378-1.64c.092-.572-.022-1.028-.348-1.396c-.236-.267-.592-.495-1.101-.706Zm6.777-2.165c-.598-.431-1.393-.61-2.36-.532c-.712.058-1.274.243-1.335.263l-.006.002a.44.44 0 0 0-.297.379l-.47 5.201a.34.34 0 0 0 .247.35l.072.02l.066.018l.086.021a8 8 0 0 0 1.64.183c.972 0 1.765-.23 2.36-.684c.764-.583 1.141-1.5 1.118-2.725c-.021-1.135-.398-1.974-1.121-2.495Zm-.662 4.461c-.836.639-2.09.562-2.677.481a.13.13 0 0 1-.109-.137l.397-4.248a.11.11 0 0 1 .086-.1c.999-.241 1.777-.168 2.312.218c.189.137.348.331.471.568c.176.339.277.765.286 1.234c.017.916-.24 1.583-.765 1.984Zm8.189-3.374a1.9 1.9 0 0 0-.432-.919c-.399-.465-1.029-.689-1.848-.689c-.734 0-1.372.228-1.947.799c.007-.086.019-.159.018-.223s-.017-.116-.066-.163c-.048-.045-.077-.067-.127-.077s-.122-.008-.256-.006a.587.587 0 0 0-.589.54s-.325 3.874-.428 5.165a.3.3 0 0 0 .073.228a.36.36 0 0 0 .26.131h.387a.224.224 0 0 0 .226-.205l.273-2.929l.014-.147a2 2 0 0 1 .082-.412q.021-.068.047-.14c.245-.694.803-1.72 1.971-1.694c.84.018 1.449.455 1.385 1.114c-.101 1.034-.266 3.1-.358 4.14c-.019.209.182.273.252.273h.304a.44.44 0 0 0 .444-.404s.185-2.127.294-3.352l.048-.532a2 2 0 0 0-.026-.5Z"/></svg>'
        },
        link: 'https://gitcode.com/alan16356/Inkeys' 
      }
    ],
    footer: {
      message: `本项目基于 <a href="https://github.com/Alan-CRL/Inkeys?tab=GPL-3.0-1-ov-file#readme" target="_blank">GNU General Public License v3.0</a> 获得许可。`,
      copyright: `Copyright © 2023-${new Date().getFullYear()} AlanCRL(陈润林) 工作室`,
    },

    langMenuLabel: "多语言",
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    outline: {
      label: "页面导航",
    },
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
  },

  sitemap: {
    hostname: 'https://inkeys.top'
  }
})
