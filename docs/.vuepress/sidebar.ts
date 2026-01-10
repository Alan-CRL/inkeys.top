export const downloadSidebar = [
    { text: '下载', link: '/download' },
    { 
        text: '使用条款',
        badge: { text: '新', type: 'danger' },
        items: [
            { text: '简体中文', link: '/tos/zh-cn' },
            { text: 'English', link: '/tos/en-us' },
        ],
    },
    { text: '新版本', link: '/inkeys3' },
]

export const versionSidebar = [
    { text: '版本', link: '/version/' },
    {   
        text: 'Inkeys3', 
        link: '/inkeys3',
        badge: { text: '新', type: 'tip' },
        items: [
            { text: 'PPT演示助手 3', link: '/version/introduction/pptcom3' },
            { text: '兼容性调整', link: '/win7' },
        ], 
    },
    { text: '碎碎念', link: '/jabber' },
]

export const tutorialSidebar = [
  {
    text: '知识库',
    link: '/tutorial/tutorial',
    items: [
        { text: '修复 Ppt COM 注册损坏', link: '/tutorial/ppt-com' },
        { text: '修复 Ppt COM 权限问题', link: '/tutorial/ppt-admin' },
        { text: 'Office 启用 Flash 控件', link: '/tutorial/ppt-flash' },
    ],
  },
]

export const wikiSidebar = [
  {
    text: '教程',
    link: '/wiki/wiki',
  },
  {
    text: '快速上手',
    link: '/wiki/start/start',
  },
  {
    text: '使用文档',
    items: [
        { text: '基础指南', link: '/wiki/guide/basic-guide' },
    ],
  },
]