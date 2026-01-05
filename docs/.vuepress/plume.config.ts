import { defineThemeConfig } from 'vuepress-theme-plume'

import navbar from './navbar'

import { downloadSidebar } from './sidebar'
import { versionSidebar } from './sidebar'
import { tutorialSidebar } from './sidebar'

export default defineThemeConfig({
  logo: '/Inkeys.svg',

  appearance: true,

  social: [
    { icon: 'github', link: 'https://github.com/Alan-CRL/Inkeys' },
    {
      icon: {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="m15.585 4.586l.486-.274q.032.17.06.303c.032.158.06.289.072.418c.103 1.118.665 1.941 1.462 2.127c1.165.27 2.264-.177 2.856-1.164c.711-1.184.403-2.634-.808-3.507C16.346.061 12.647-.609 8.663.56C.072 3.095-2.867 13.65 3.23 20.122c2.608 2.769 5.92 3.964 9.68 3.873c4.817-.113 8.285-2.513 10.5-6.674c1.57-2.952-.137-6.178-3.405-6.849a21 21 0 0 0-5.675-.362a4.8 4.8 0 0 0-1.805.548c-.625.325-.805.998-.735 1.666c.065.608.531.972 1.086 1.064c1.118.175 2.25.277 3.378.37c.327.027.657.03.986.033c.473.005.944.01 1.405.086c1.314.217 1.766 1.284 1.09 2.425a4.7 4.7 0 0 1-.577.766a6.55 6.55 0 0 1-3.318 1.964c-2.333.57-4.669.603-6.99-.13c-2.645-.835-4.221-2.777-4.277-5.392A9.1 9.1 0 0 1 5.76 8.907c.36-.654.558-1.327.503-2.067a26 26 0 0 1-.05-.972l-.025-.565q.401.084.792.212c1.011.406 2.007.592 3.102.294a5.6 5.6 0 0 1 1.902-.122a4.76 4.76 0 0 0 2.921-.714c.218-.128.439-.251.681-.387"/></svg>',
        name: 'gitcode'
        },
      link: 'https://gitcode.com/alan16356/Inkeys'
    },
    {
      icon: {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none"><path d="M12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035q-.016-.005-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093q.019.005.029-.008l.004-.014-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014-.034.614q.001.018.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z"/><path fill="currentColor" d="M15.08 4.21s-.71-.4-1.4-.2L2.32 7.23 5.34 1.84s.44-.88 2.15-.84l9.49.02-1.82 3.24-.08-.05Zm3.76-2.18l-1.93 3.44s.48.45.62.97l1.69 6.6-6.52 2.02 2.35-3.83-.73-2.89s-.38-1.14-1.5-1.01c-.02 0-.04 0-.05 0-1.16.18-11.89 3.23-11.89 3.23 0 0-.84.24-.88 1.1 0 0-.02.93.53 1.78l4.76 8.35 1.75-3.12s-.55-.51-.61-.77l-1.92-7.01 6.45-1.88s.35-.18.49.13l-2.81 3.6.96 3.22s.42.71 1.4.71l12.39-3.47s.82-.16.59-1.43c0 0 .04-.47-.35-1.25l-4.77-8.51Z"/><path fill="var(--icon-secondary, currentColor)" d="M8.7 19.69s.66.29 1.09.27l11.97-3.36-2.75 4.9s-.67 1.37-2.26 1.37l-9.9.14 1.85-3.31Z"/></g></svg>',
        name: 'stcn'
        },
      link: 'https://forum.smart-teach.cn/t/inkeys'
    },
    { icon: 'bilibili', link: 'https://space.bilibili.com/1330313497/lists/2210199' },
    { icon: 'qq', link: 'https://qm.qq.com/q/wZnY4enpmw' },
  ],
  navbarSocialInclude: ['github', 'gitcode', 'stcn', 'bilibili', 'qq'],
  // aside: true, // 页内侧边栏， 默认显示在右侧
  // outline: [2, 3], // 页内大纲， 默认显示 h2, h3

  /**
   * 文章版权信息
   * @see https://theme-plume.vuejs.press/guide/features/copyright/
   */
  // copyright: false,

  // prevPage: true,   // 是否启用上一页链接
  // nextPage: true,   // 是否启用下一页链接
  // createTime: true, // 是否显示文章创建时间

  footer: {
    message: `本项目基于 <a href="https://github.com/Alan-CRL/Inkeys/blob/main/LICENSE" target="_blank">GNU General Public License v3.0</a> 获得许可 | <a href="/tos/zh-cn" target="_blank">智绘教Inkeys 使用条款</a>`,
    copyright: `Copyright © 2023-${new Date().getFullYear()} AlanCRL(陈润林) 工作室`,
  },

  navbar,
  sidebar: {
    '/download': downloadSidebar,
    '/tos/': downloadSidebar,
    
    '/tutorial/': tutorialSidebar,

    '/win7': versionSidebar,
    '/inkeys3': versionSidebar,
    '/version': versionSidebar,
    '/jabber': versionSidebar,
  },

  /**
   * 公告板
   * @see https://theme-plume.vuejs.press/guide/features/bulletin/
   */
  bulletin: {
    // 1. 必须提供唯一的 ID，用于在浏览器中记录“已关闭”状态
    id: '1000k-announcement', 

    // 2. 设置生命周期为 'once'，确保关闭后刷新或重新打开浏览器都不再显示
    lifetime: 'once',

    // 3. 通过函数判断当前页面是否为首页
    // 假设你的 Page 对象中有 path 或 name 属性
    enablePage: (page) => {
      // 根据你的实际路由逻辑判断，通常首页是 '/' 或名为 'Index'
      return page.path === '/' || page.path === '/index.html';
    },

    // 4. 其他内容配置
    contentType: 'markdown',

    title: '成功达成 1000 Stars！🎉',
    content: `\
![](/1000k.png)  

感谢各位的一路陪伴与支持！  
为 智绘教Inkeys [点亮 Stars](https://github.com/Alan-CRL/Inkeys)
`,

    layout: 'top-right',
    border: false
  },

  /* 过渡动画 @see https://theme-plume.vuejs.press/config/basic/#transition */
  transition: {
       page: true,        // 启用 页面间跳转过渡动画
       postList: true,    // 启用 博客文章列表过渡动画
    appearance: 'circle-clip',  // 启用 深色模式切换过渡动画, 或配置过渡动画类型
  },

})
